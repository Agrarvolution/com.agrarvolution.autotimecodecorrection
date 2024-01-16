#include '../json2.js'

//add XMP context
if (ExternalObject.AdobeXMPScript === undefined) {
    ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
}
//add event context
try {
    var xLib = new ExternalObject("lib:PlugPlugExternalObject");
} catch (e) {
    alert(e);
}
//fix missing const value
XMPConst.NS_BWF = "http://ns.adobe.com/bwf/bext/1.0/";

//define namespace
$.agrarvolution = $.agrarvolution || {};

$.agrarvolution.timecodeCorrection = {
    AllowedMediaTypes: [
        'mp4', 'av1', 'mov', 'ogg', 'ogv', 'mkv', 'webm',
        'wav', 'bwf', 'rf64', 'amb', 'acc', 'aif', 'aiff', 'aifc', 'mp2', 'mp3', '3gp', 'wma', 'flac', 'ape'
    ],
    /** Possible values according to xmpDM spec.
     * Non Drop timecodes variants are ignored.
     * See https://developer.adobe.com/xmp/docs/XMPNamespaces/XMPDataTypes/Timecode/
     */
    DropFrameTimecodes: {
        //"23976": 23.976,
        "2997": 29.97,
        "5994": 59.94,
        "11988": 119.88
    },
    DropFrameTimecodesKeys: [
        /*23976,*/
        2997, 5994, 11988
    ],

    timeFormats: {
        "drop": "DropTimecode",
        "nonDrop": "Timecode"
    },
    ThumbnailTypes: {
        file: 'file',
        folder: 'folder',
        alias: 'alias',
        pkg: 'package',
        app: 'application',
        other: 'other'
    },
    logLevels: {
        critical: "CRIT",
        status: "STAT",
        info: "INFO",
        error: "ERR "
    },
    TIMECODE_SOURCE: {
        file: 0,
        created: 1,
        lastChanged: 2
    },
    SCAN_TARGET: {
        folder: 0,
        selection: 1
    },
    media: [],
    timeCodeUpdates: [],
    searchRecursive: true,
    searchTarget: 1, //0: root, 1: selection
    ignoreMediaStart: true,
    logging: true,
    previousTimeValue: 'previousTimeValue',
    processedMedia: 0,
    targetFramerate: 25,
    targetFramerateisDropFrame: false,
    overrideFramerate: false,

    metaDataOfSelected: function() {
        if (app.document.selectionLength !== 0) {
            var thumb = app.document.selections[0];
            if (thumb !== undefined && thumb != null && thumb.hasMetadata) {
                // Get the metadata object - wait for  valid values
                var md = thumb.metadata;
                // Get the XMP packet as a string and create the XMPMeta object
                var xmp = new XMPMeta(md.serialize());


                var test = thumb.creationDate,
                    test2 = thumb.lastModifiedDate;
                var hours = test.getHours();
            }
            return true;
        }
        return false;
    },
    /**
     * Caches media objects and fixes the xmp timeFormat - when invalid.
     *@return {boolean} true on success
     */
    fixXmpTimeFormat: function(parameters) {
        if (this.checkFixXmpParameter(parameters) && this.cacheMediaObjects(parameters.errorOnly) && this.fixTimeFormat(parameters.framerate)) {
            this.logToCEP("Time formats for " + this.processedMedia + " media thumbnails have been updated.", this.logLevels.status);
            return true;
        } else {
            return false;
        }
    },
    /**
     * Fixes the xmp property timeFormat with a new value. (InvalidTimecode)
     * @param {number} framerate
     * @return {boolean} true on success
     */
    fixTimeFormat: function(framerate) {
        this.processedMedia = 0;
        for (var i = 0; i < this.media.length; i++) {
            var text = "Timecode";
            if (this.DropFrameTimecodes[framerate]) {
                text = "Drop" + text;
            }
            text = framerate + text;

            this.media[i].xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, "timeFormat", text);

            try {
                var newMetadata = new Metadata(this.media[i].xmp.serialize(XMPConst.SERIALIZE_OMIT_PACKET_WRAPPER | XMPConst.SERIALIZE_USE_COMPACT_FORMAT));
                this.media[i].thumb.synchronousMetadata = newMetadata;
                this.logToCEP(this.media[i].filename + " - Time format fixed.", this.logLevels.info);
                this.processedMedia++;
            } catch (e) {
                this.logToCEP(this.media[i].filename + " - failed to fix time format.", this.logLevels.error);
                this.logToCEP(JSON.stringify(e), this.logLevels.error);
            }
        }
        return true;
    },
    /**
     * Check parameters for fixing xmp timeFormat.
     * @return {boolean} true on success
     */
    checkFixXmpParameter: function(parameter) {
        if (!isNaN(Number(parameter.searchTarget)) && !isNaN(Number(parameter.framerate))) {
            this.searchTarget = parameter.searchTarget;
            this.searchRecursive = parameter.recurse;
            this.logging = parameter.logging;
        } else {
            this.logToCEP("Error in parameters before fixing xmp timeFormat.", this.logLevels.error);
            return false;
        }
        return true;
    },
    /**
     * Calls to cache media objects and then reverts timecodes of selected elements.
     *@return {boolean} true on success
     */
    revertChanges: function(parameter) {
        if (this.checkRevertParameter(parameter) && this.cacheMediaObjects(false) && this.revertTimecodeChanges()) {
            this.logToCEP("Reverted the timecode for " + this.processedMedia + " media thumbnails.", this.logLevels.status);
            return true;
        } else {
            return false;
        }
    },
    /**
     * Check parameters for reverting timecode changes.
     * @return {boolean} true on success
     */
    checkRevertParameter: function(parameter) {
        if (Number(parameter.searchTarget) !== NaN) {
            this.searchTarget = parameter.searchTarget;
            this.searchRecursive = parameter.recurse;
            this.logging = parameter.logging;
        } else {
            this.logToCEP("Error in parameters before reverting timecode changes.", this.logLevels.error);
            return false;
        }
        return true;
    },

    /**
     * Reverts to the previously stored timecode.
     * Only uses one history element.
     * @return {boolean} true on success
     */
    revertTimecodeChanges: function() {
        this.processedMedia = 0;
        for (var i = 0; i < this.media.length; i++) {
            if (this.media[i].prevStartTime && this.media[i].startTime) {
                this.media[i].xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, this.previousTimeValue,
                    this.media[i].startTime.text);
                this.media[i].xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, "timeValue", this.media[i].prevStartTime.text);

                try {
                    this.media[i].thumb.synchronousMetadata =
                        new Metadata(this.media[i].xmp.serialize(XMPConst.SERIALIZE_OMIT_PACKET_WRAPPER | XMPConst.SERIALIZE_USE_COMPACT_FORMAT));
                    this.logToCEP(this.media[i].filename + " - start time / timecode has been updated. (" + this.media[i].startTime.text + " -> " +
                        this.media[i].prevStartTime.text + ")", this.logLevels.info);
                } catch (e) {
                    this.logToCEP(this.media[i].filename + " - failed to update start time / timecode. (" + this.media[i].startTime.text + " -> " +
                        this.media[i].prevStartTime.text + ")", this.logLevels.error);
                    this.logToCEP(e, this.logLevels.error);
                }
                this.processedMedia++;
            } else {
                this.logToCEP(this.media[i].filename + " - Timecodes are invalid. (" + this.media[i].prevStartTime + " -> " +
                    this.media[i].prevStartTime + ")", this.logLevels.error);
            }
        }
        return true;
    },

    /**
     * Caches media objects and writes calls timecodeFromCache() to create a new .csv of selected metadata.
     * @return {Object} 
     */
    gatherTimecodes: function(parameter) {
        if (this.checkRevertParameter(parameter) && this.cacheMediaObjects(false)) {
            var csvData = this.timecodeFromCache();
            this.logToCEP("Gathered timecodes from " + this.processedMedia + " media thumbnails.", this.logLevels.status);

            $.writeln(csvData);
            return JSON.stringify({
                csv: csvData,
                path: app.document.presentationPath
            });
        } else {
            return {};
        }
    },

    /**
     * Copies selected metadata from cached mediaItems.
     * @return {array}
     */
    timecodeFromCache: function() {
        this.processedMedia = 0;
        var data = [
            'File Name',
            'File TC',
            'Framerate'
        ].join(',') + '\n';
        for (var i = 0; i < this.media.length; i++) {
            data += [
                this.media[i].filename,
                this.media[i].startTime.text,
                this.media[i].framerate || 0
            ].join(',') + '\n';
            this.processedMedia++;
        }
        return data;
    },

    /**
     * Main function to update timecodes from metadata (creation time, last modified date)
     * @return {boolean} true on success
     */
    timecodesFromMetadata: function(parameter) {
        if (this.checkMetadataParameter(parameter) && this.cacheMediaObjects(false) && this.updateTimecodesFromMetadata(parameter.source)) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * Check parameters for updating timecodes from metadata and set script flags.
     * @return {boolean} true on success
     */
    checkMetadataParameter: function(parameter) {
        this.targetFramerate = Number(parameter.framerate);

        if (isNaN(Number(parameter.searchTarget)) ||
            isNaN(Number(parameter.source)) ||
            isNaN(this.targetFramerate)) {
            this.logToCEP("Error in parameters - Update from metadata.", this.logLevels.error);
            return false;
        }

        this.targetFramerateisDropFrame = this.isDropFrame(this.targetFramerate);
        this.searchTarget = parameter.searchTarget;
        this.logging = parameter.logging || false;
        this.overrideFramerate = parameter.overrideFramerate || false;
        this.logToCEP("Metadata parameter have been set.", this.logLevels.info);

        return true;
    },
    /**
     * Update timecode from thumbnail creation date or time of last modification.
     * @return {boolean} true on success
     */
    updateTimecodesFromMetadata: function(source) {
        for (var i = 0; i < this.media.length; i++) {

            if (this.overrideFramerate || this.media[i].framerate === 0) {
                this.media[i].framerate = this.targetFramerate;
                this.media[i].isDropFrame = this.targetFramerateisDropFrame;

            }
            this.setEmptyStartTimeProperty(this.media[i], this.media[i].framerate);

            var time = Date.now();

            switch (source) {
                case this.TIMECODE_SOURCE.created:
                    time = this.media[i].thumb.bestCreationDate;
                    break;
                case this.TIMECODE_SOURCE.lastChanged:
                    time = this.media[i].thumb.lastModifiedDate;
                    break;
                default:
                    return false;
            }
            this.media[i].xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, this.previousTimeValue, this.media[i].startTime.text);
            var newTimecode = this.createTimecodeFromDate(time, this.media[i].framerate, this.media[i].isDropFrame);
            this.media[i].xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM,
                "timeValue", newTimecode);

            if (this.media[i].tcStruct === 'startTimecode') {
                this.media[i].xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, "timeFormat",
                    this.media[i].xmp.getStructField(XMPConst.NS_DM, "startTimecode", XMPConst.NS_DM, "startTimecode").value);
            }

            try {
                this.media[i].thumb.synchronousMetadata =
                    new Metadata(this.media[i].xmp.serialize(XMPConst.SERIALIZE_OMIT_PACKET_WRAPPER | XMPConst.SERIALIZE_USE_COMPACT_FORMAT));
                this.logToCEP(this.media[i].filename + " - start time / timecode has been updated. (" + this.media[i].startTime.text + " -> " +
                    newTimecode + ")", this.logLevels.info);
            } catch (e) {
                this.logToCEP(this.media[i].filename + " - failed to update start time / timecode. (" + this.media[i].startTime.text + " -> " +
                    newTimecode + ")", this.logLevels.error);
                this.logToCEP(e, this.logLevels.error);
            }
        }
        return true;
    },
    /**
     *Function that start the timecode correction process. Usually called by the gui.
     *@param {Object} tcObject input object sent by the gui, contains settings and media references to be updated.
     *@returns {boolean} true on success | false on failure  
     */
    processInput: function(tcObject) {
        this.logToCEP("Starting host script.", this.logLevels.info);
        this.processedMedia = 0;
        if (this.setValues(tcObject) && this.cacheMediaObjects(false) && this.updateTimeCodes()) {
            return true;
        }
        return false;
    },
    /**
     *Processes values sent by the gui and ends process if it cannot do that.
     *@param {Object} tcObject input object sent by the gui, contains settings and media references to be updated. 
     *@returns {boolean} true on success | false on failure 
     */
    setValues: function(tcObject) {
        this.timeCodeUpdates = [];
        if (tcObject !== undefined && tcObject.timeCodes !== undefined && tcObject.timeCodes.length !== undefined &&
            tcObject.searchRecursive !== undefined && tcObject.searchTarget !== undefined &&
            tcObject.ignoreMediaStart !== undefined) {
            this.timeCodeUpdates = tcObject.timeCodes;
            this.searchRecursive = tcObject.searchRecursive;
            this.searchTarget = tcObject.searchTarget;
            this.ignoreMediaStart = tcObject.ignoreMediaStart;
            this.logging = tcObject.logging
            this.logToCEP("Values have successfully arrived in host.", this.logLevels.status);

            return this.parseTimeGroups();
        }
        return false;
    },
    /**
     *Calls timeValuesToInt(group) to convert time strings into numbers.
     *Can only be called after the internal timeCodeUpdate array has been set. (setValues(tcObject))
     *@returns {boolean} true on success | false on failure 
     */
    parseTimeGroups: function() {
        var i = 0;
        for (i = 0; i < this.timeCodeUpdates.length; i++) {
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].duration.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couldn't parse duration. (" + this.timeCodeUpdates[i].duration.text + ")", this.logLevels.status);
                return false;
            }
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].fileTC.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couldn't parse file timecode. (" + this.timeCodeUpdates[i].fileTC.text + ")", this.logLevels.status);
                return false;
            }
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].audioTC.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couldn't parse audio timecode. (" + this.timeCodeUpdates[i].audioTC.text + ")", this.logLevels.status);
                return false;
            }
        }
        this.logToCEP("Input times have been converted to numbers.", this.logLevels.status);
        return true;
    },
    /**
     *Converts strings into numbers, custom made for a group object. 
     *@param {Object} group - object created while looking for parts in a time string (e.g. hh:mm:ss:ff) -> groups.hour = hh, groups.minutes = mm, groups.seconds = ss, groups.frames = ff*
     *@returns {boolean} true - on success | false if group did not exist
     */
    timeValuesToInt: function(group) {
        if (group) {
            if (group.hours) {
                group.hours = Number(group.hours);
            }
            if (group.minutes) {
                group.minutes = Number(group.minutes);
            }
            if (group.seconds) {
                group.seconds = Number(group.seconds);
            }
            if (group.frames) {
                group.frames = Number(group.frames);
            }
            return true;
        }
        return false;
    },

    /**
     *Loads media file / clips into a semipermanent cache. This avoids scraping through the app DOM everytime a match has to be found later.
     *@param {boolean} toggleInvalid either caches every thumbnail or only thumbnails with invalid timecodes
     *@returns {boolean} false - not processed times, thus useless for comparisons, true - everything worked
     */
    cacheMediaObjects: function(toggleInvalid) {
        var i = 0;
        this.media = [];


        var hasNoSelection = app.document.selectionLength === 0;
        if (hasNoSelection || this.searchTarget === this.SCAN_TARGET.folder) { //process root - get all thumbnails if there is no selection
            this.logToCEP("Start searching for all media items.", this.logLevels.status);
            app.document.selectAll();
        } else {
            this.logToCEP("Start searching for selected media items.", this.logLevels.status);
        }

        for (i = 0; i < app.document.selectionLength; i++) {
            this.processThumbnail(app.document.selections[i], toggleInvalid);
        }

        if (hasNoSelection || this.searchTarget === this.SCAN_TARGET.folder) { // remove selection if there was none before
            app.document.deselectAll()
        }

        if (this.splitTimesToNumbers()) {
            this.logToCEP("Processing time strings was successfull.", this.logLevels.status);
        } else {
            this.logToCEP("Processing time strings was unsuccessfull.", this.logLevels.critical);
            return false;
        }

        //extended log
        if (this.logging) {
            var method = "";
            switch (this.searchTarget) {
                case 0:
                    method = "project";
                    break;
                case 1:
                    method = "selection";
                    break;
            }

            var mediaLog = JSON.parse(JSON.stringify(this.media));
            for (var i = 0; i < mediaLog.length; i++) {
                mediaLog[i].thumb = "[object ProjectItem]";
            }
            this.logToCEP(this.media.length + " media files have been discovered in " + method + ": " +
                JSON.stringify(mediaLog), this.logLevels.info);
        }
        return true;
    },
    /**
     *Processes a single project item. 
     *If it is a folder, it will call this method for all its children (depending on the settings.)
     *If it is a clip it will store some informations about the thumbnail into this namespace's media array for quicker search later in the process.
     *@param {Object} thumb Bridge folder element, see CEP reference
     *@param {boolean} addInvalidOnly only cache thumbnail with invalid time formats
     */
    processThumbnail: function(thumb, addInvalidOnly) {
        if (thumb.type === this.ThumbnailTypes.file && thumb.hasMetadata) {
            var timecodeMetadataStruct = thumb.mimeType.match('audio') ? 'startTimecode' : 'altTimecode';
            var item = {};
            item.thumb = thumb;
            item.filename = thumb.name;
            item.xmp = new XMPMeta(thumb.synchronousMetadata.serialize());

            item.tcStruct = '';
            if (item.xmp.doesPropertyExist(XMPConst.NS_DM, "altTimecode")) {
                item.tcStruct = "altTimecode";
            } else if (item.xmp.doesPropertyExist(XMPConst.NS_DM, "startTimecode")) {
                item.tcStruct = "startTimecode";
            }

            //audio metadata
            if (item.xmp.doesPropertyExist(XMPConst.NS_BWF, "codingHistory")) {
                var audioEncoding = item.xmp.getProperty(XMPConst.NS_BWF, "codingHistory").value || '';
                var sampleFrequency = audioEncoding.match(/F=\d+/g);

                if (sampleFrequency !== undefined && sampleFrequency.length > 0) {
                    item.sampleFrequency = Number(sampleFrequency[0].replace('F=', ''));
                }

                var bitRate = audioEncoding.match(/W=\d+/g);
                if (bitRate !== undefined && bitRate.length > 0) {
                    item.bitRate = Number(bitRate[0].replace('W=', ''));
                }
            }

            if (item.xmp.doesPropertyExist(XMPConst.NS_BWF, "timeReference")) {
                item.timeReference = item.xmp.getProperty(XMPConst.NS_BWF, "timeReference");
            }

            var addItem = true;

            //timecode metadata
            if (item.tcStruct !== '') {
                item.startTime = item.xmp.getStructField(XMPConst.NS_DM, item.tcStruct, XMPConst.NS_DM, "timeValue").value || '';
                item.prevStartTime = item.xmp.getStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, this.previousTimeValue).value || '';

                var xmpFramerate = item.xmp.getStructField(XMPConst.NS_DM, item.tcStruct, XMPConst.NS_DM, "timeFormat").value || '';
                item.framerate = xmpFramerate.match(/\d+/g);

                if (item.framerate === undefined && xmpFramerate.length > 0) {
                    addItem = false;
                }
                if (item.framerate !== null) {
                    item.framerate = Number(item.framerate[0]);
                } else {
                    item.framerate = 0;
                }
            }

            item.isDropFrame = this.isDropFrame(item.framerate);

            if (item.startTime === undefined && item.timeReference !== undefined && item.sampleFrequency !== undefined) {
                item.startTime = this.samplesToTime(item.timeReference, item.sampleFrequency, 25, false);
            } else if (item.startTime === undefined) {
                item.startTime = "00:00:00:00";
            }

            if (addItem !== addInvalidOnly) {
                this.media.push(item);
            }

        } else if (thumb.type === this.ThumbnailTypes.folder && this.searchRecursive) {
            for (var i = 0; i < thumb.children.length; i++) {
                this.processThumbnail(thumb.children[i]);
            }
        }
    },

    /**
     *Calls splitTimeToNumber for duration and startTime for every object in the media array.
     *@returns {boolean} false on any error | true on success
     */
    splitTimesToNumbers: function() {
        for (var i = 0; i < this.media.length; i++) {
            var startTimeMatch = this.splitTimeToNumber(this.media[i].startTime, this.media[i].framerate);
            if (!startTimeMatch) {
                this.logToCEP(this.media[i].name + " - Couldn't process start time. (" + this.media[i].startTime + ")", this.logLevels.status);
            }
            this.media[i].startTime = startTimeMatch;

            var prevTimeMatch = this.splitTimeToNumber(this.media[i].prevStartTime, this.media[i].framerate);
            this.media[i].prevStartTime = prevTimeMatch;
        }
        return true;
    },
    /**
     *Processes a time string into separate values and call validateTime to convert the separate values into numbers.
     *@param {string} timeText "hh:mm:ss:ff*"
     *@param {number} framerate
     *@returns {boolean|object} false on failure | matched group on success
     */
    splitTimeToNumber: function(timeText, framerate) {
        if (timeText === undefined) {
            return false;
        }

        var hmsfPattern = /^([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,})$/g;
        var match = hmsfPattern.exec(timeText);
        match = this.validateTime(match, framerate);
        if (!match) {
            return false;
        }
        return match;
    },
    /**
     *Process the matched values into numbers and stores it into a new object containing the text and the capture group.
     *@param {string} timeText "hh:mm:ss:ff*"
     *@param {number} framerate
     *@returns {boolean|object} false on failure | matched group on success
     */
    validateTime: function(time, framerate) {
        if (time === undefined || time == null) {
            return false;
        }
        var groups = {};
        groups.hours = Number(time[1]);
        groups.minutes = Number(time[2]);
        groups.seconds = Number(time[3]);
        groups.frames = Number(time[4]);


        if (groups.hour > 24 && groups.minutes > 60 && groups.seconds > 60 &&
            !isNaN(groups.frames) && groups.frames > framerate) {
            return false
        }

        return {
            text: time[0],
            groups: groups,
        };
    },


    /**
     * Compares all objects in media and timeCodeUpdates and calls changeStartTime if a match has been found.
     * Can't compare duration of files unlike the Premiere version.
     * @returns {boolean} true on success
     */
    updateTimeCodes: function() {
        this.logToCEP("Updating " + this.media.length + " discovered media items.", this.logLevels.status);
        var i = 0,
            j = 0;
        if (!(this.timeCodeUpdates !== undefined && this.media !== undefined) || this.media.length === 0) {
            return false;
        }

        for (i = 0; i < this.timeCodeUpdates.length; i++) {
            for (j = 0; j < this.media.length; j++) {
                if (this.timeCodeUpdates[i].filename.toUpperCase() === this.media[j].filename.toUpperCase() &&
                    (this.ignoreMediaStart ? true : this.compareTimes(this.timeCodeUpdates[i].fileTC.groups, this.media[j].startTime.groups))
                ) {
                    this.changeStartTime(this.timeCodeUpdates[i], this.media[j]);
                }
            }
        }
        this.logToCEP("Updated " + this.processedMedia + " media thumbnails.", this.logLevels.status);
        return true;
    },
    /**
     *Compares two time groups.
     *@param {{hour: number, minutes: number, seconds: number, frames: number}} timeObj1 
     *@param {{hour: number, minutes: number, seconds: number, frames: number}} timeObj2
     *@returns {boolean} true if values match 
     */
    compareTimes: function(timeObj1, timeObj2) {
        if (timeObj1.hours === timeObj2.hours && timeObj1.minutes === timeObj2.minutes &&
            timeObj1.seconds === timeObj2.seconds && (!isNaN(timeObj1.frames) || !isNaN(timeObj2.frames) ? true : timeObj1.frames === timeObj2.frames)) {
            return true
        }
        return false;
    },
    /**    
        * Updates / changes the starttime of a given ProjectItem.
        * @param {audioTC: {text: string, groups: object}} update
        * @param {projectItem: object, filename: string, startTime: object} mediaItem
        * @returns {boolean} true on success
        // @Todo -> set flag if conversion should be by total frames or last frames only (premiere one works last frame only)
    */
    changeStartTime: function(update, mediaItem) {
        this.setEmptyStartTimeProperty(mediaItem);

        var startTime = {};
        startTime.groups = this.convertFramesToNewFramerate(update.audioTC.groups, update.framerate, mediaItem.framerate);

        startTime.text = this.createTimecodeFromObj(startTime.groups, mediaItem.isDropFrame, mediaItem.framerate);

        mediaItem.xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, this.previousTimeValue, mediaItem.startTime.text);
        mediaItem.xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, "timeValue", startTime.text);

        if (mediaItem.tcStruct === 'startTimecode') {
            mediaItem.xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, "timeFormat",
                mediaItem.xmp.getStructField(XMPConst.NS_DM, "startTimecode", XMPConst.NS_DM, "startTimecode").value);
        }

        if (mediaItem.sampleFrequency !== undefined) {
            mediaItem.xmp.setProperty(XMPConst.NS_BWF, "timeReference",
                this.timeToSamples(update.audioTC.groups, update.framerate, mediaItem.sampleFrequency).toString(), XMPConst.STRING);
        }

        try {
            if (mediaItem.thumb.locked) {
                throw "Thumbnail is locked!";
            }
            mediaItem.thumb.synchronousMetadata =
                new Metadata(mediaItem.xmp.serialize(XMPConst.SERIALIZE_OMIT_PACKET_WRAPPER | XMPConst.SERIALIZE_USE_COMPACT_FORMAT));
            this.logToCEP(mediaItem.filename + " - start time / timecode has been updated. (" + mediaItem.startTime.text + " -> " +
                startTime.text + ")", this.logLevels.info);
            this.processedMedia++;
        } catch (e) {
            this.logToCEP(mediaItem.filename + " - failed to update start time / timecode. (" + mediaItem.startTime.text + " -> " +
                startTime.text + ")", this.logLevels.error);
            this.logToCEP(e, this.logLevels.error);
            return false;
        }
        return true;
    },
    /**
     * Helper function to add default framerate information to an empty file.
     */
    setEmptyStartTimeProperty: function(mediaItem, framerate) {
        if (mediaItem.tcStruct === '') {
            return false;
        }
        framerate = framerate || 25; //default safety
        // mediaItem.xmp.setProperty(XMPConst.NS_DM, "startTimeScale", "12800"); //#Todo determine whether this is needed or not
        // mediaItem.xmp.setProperty(XMPConst.NS_DM, "startTimeSampleSize", "512");
        if (this.DropFrameTimecodesKeys[framerate]) {
            var timeFormat = this.timeFormats.drop;
        } else {
            var timeFormat = this.timeFormats.nonDrop;
        }
        mediaItem.xmp.setStructField(XMPConst.NS_DM, "altTimecode", XMPConst.NS_DM, "timeFormat", framerate + timeFormat);
        mediaItem.tcStruct = "altTimecode";
        mediaItem.framerate = framerate;
    },
    /**
     * @param {hours: number, minutes: number, seconds: number, frames: number} time
     * @param {number} prevFramerate
     * @param {number} newFramerate
     * @returns {hours: number, minutes: number, seconds: number, frames: number} always with positive values
     */
    convertFramesToNewFramerate: function(time, prevFramerate, newFramerate) {
        if (!isNaN(Number(prevFramerate)) && !isNaN(Number(newFramerate))) {
            time.frames = Math.round(time.frames / prevFramerate * newFramerate);

            if (time.frames === Math.round(newFramerate)) {
                time.seconds++;
                time.frames = 0;
            }

            if (time.seconds === 60) {
                time.minutes++;
                time.seconds = 0;
            }

            if (time.minutes === 60) {
                time.hours = time.hours < 23 ? time.hours++ : time.hours;
                time.minutes = 0;
            }
        }
        return time;
    },
    /**
     * Creates a timestring from a given time object. 
     * 00:00:00:00
     * @param {hours: number, minutes: number, seconds: number, frames: number} time
     * @param {number} framerate
     * @param {boolean} isDropFrame determines delimiter
     */
    createTimecodeFromObj: function(time, isDropFrame, framerate) {
        var timecode = [
            this.padZero(time.hours, 2),
            this.padZero(time.minutes, 2),
            this.padZero(time.seconds, 2),
            this.padZero(time.frames, Math.floor(framerate).toString().length),
        ];
        var delimiter = isDropFrame ? ';' : ':';

        timecode = this.dropFrameTimecodeCorrection(timecode, framerate, isDropFrame);

        return timecode.join(delimiter);
    },
    /**
     * Create timecode from a date object.
     * @param {Date} date
     * @param {boolean} isDropFrame
     * @returns {string} 00:00:00:00 or 00;00;00;00
     */
    createTimecodeFromDate: function(date, framerate, isDropFrame) {
        var timecode = [
            this.padZero(date.getHours(), 2),
            this.padZero(date.getMinutes(), 2),
            this.padZero(date.getSeconds(), 2),
            this.padZero(Math.floor(date.getMilliseconds() / 1000 * framerate), 2),
        ];
        var delimiter = isDropFrame ? ';' : ':';

        timecode = this.dropFrameTimecodeCorrection(timecode, framerate, isDropFrame);

        return timecode.join(delimiter);
    },
    /**
     * After naively assuming that every drop frame time code is legal, this function nudges the timecodes by a frame to be legal again.
     * Otherwise the timecodes might by offset by a frame or so, since the editing programs compensate for that. (Usually you get a slightly too low framecount.)
     * 23.976 FPS does not seem to be handled as drop frame in Premiere Pro and thus is ignored in this code.
     * @param {array} timecode 
     * @param {number} framerate 
     * @param {boolean} isDropFrame 
     * @return {array} corrected timecode
     */
    dropFrameTimecodeCorrection: function(timecode, framerate, isDropFrame) {
        if (!isDropFrame && !(framerate === 2997 || framerate === 5994)) {
            return timecode;
        }

        if (timecode[1] % 10 && timecode[3] === 0) {
            timecode[3] = Math.round(framerate) - 1;
            timecode[1] = timecode[1] - 1;
        } else if (timecode[1] % 10 && timecode[3] === 1) {
            timecode[3] = timecode[3] + 1;
        }
        return timecode;
    },
    /**
     * Pad numbers with leading zeros.
     * @param {number} number
     * @param {number} size
     * @return {string} number with padded zeros
     */
    padZero: function(number, size) {
        number = number.toString();
        while (number.length < size) {
            number = '0' + number;
        }
        return number;
    },
    /**
     * Timecode is converted into samples.
     * @param {Object} time
     * @param {number} sampleFrequency
     * @return {number} samples
     */
    timeToSamples: function(time, framerate, sampleFrequency) {
        return ((((time.hours * 60) + time.minutes) * 60) + time.seconds + time.frames / framerate) * sampleFrequency;
    },
    /**
     *Convert samples into a timecode string.
     *@param {number} samples
     *@param {number} sampleFrequency
     *@param {number} framerate
     *@param {boolean} isDropFrame
     *@return {string} 00:00:00:00 or 00;00;00;00
     */
    samplesToTime: function(samples, sampleFrequency, framerate, isDropFrame) {
        var sumSeconds = Math.floor(samples / sampleFrequency);
        var sumMinutes = Math.floor(sumSeconds / 60);

        var timecode = [
            this.padZero(Math.floor(sumMinutes / 60), 2),
            this.padZero(Math.floor(sumMinutes % 60), 2),
            this.padZero(Math.floor(sumSeconds % 60), 2),
            this.padZero(Math.round(samples % sampleFrequency / sampleFrequency * framerate), 2)
        ];

        var delimiter = isDropFrame ? ';' : ':';
        return timecode.join(delimiter);
    },

    /**
     * Checks whether a given framerate is a known dropframe framerate.
     * @param {number} framerate
     * @returns {boolean}
     */
    isDropFrame: function(framerate) {
        if (isNaN(Number(framerate))) {
            return false;
        }

        for (var i = 0; i < this.DropFrameTimecodesKeys.length; i++) {
            if (this.DropFrameTimecodesKeys[i] === framerate) {
                return true;
            }
        }
        return false;
    },

    /**
     * Create a float value from 1/X strings as commonly seen in XMP Metadata.
     * @param {string} scale in 1/X
     * @returns {number} 1 if scale was invalid, float if matches were found
     */
    calcScale: function(scale) {
        scale = scale.match(/\d+/g);
        if (scale.length === 1) {
            return scale[0];
        } else if (scale.length >= 2) {
            return scale[0] / scale[1];
        }
        return 1;
    },

    /**
     *CSXSEvent wrapping function to send log messages to the gui.
     *@param {string} text - text that should be sent to gui
     *@param {string} logLevel - choose which log level to display in gui
     */
    logToCEP: function(text, logLevel) {
        if (xLib && this.logging) {
            var eventObj = new CSXSEvent();
            eventObj.type = "com.adobe.csxs.events.agrarvolution.cepLogging";
            eventObj.data = JSON.stringify({
                text: text,
                logLevel: logLevel
            });
            eventObj.dispatch();
        }
    },
};