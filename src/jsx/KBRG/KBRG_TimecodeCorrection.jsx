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
var Agrarvolution = Agrarvolution || {};

Agrarvolution.logLevels = {
    critical: "CRIT",
    status: "STAT",
    info: "INFO",
    error: "ERR "
};
Agrarvolution.CEP_PANEL = {
    correction: 0,
    repair: 1,
};
Agrarvolution.timecodeCorrection = {
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
    processedMedia: 0,
    targetFramerate: 25,
    overrideFramerate: false,

    /**
     * Caches media objects and fixes the xmp timeFormat - when invalid.
     *@return {boolean} true on success
     */
    fixXmpTimeFormat: function(parameters) {
        parameters.logTarget = Agrarvolution.CEP_PANEL.repair;
        parameters = this.checkFixXmpParameters(parameters);

        if (parameters === undefined) {
            this.logToCEP("Parameters invalid - fix xmp time format.", Agrarvolution.logLevels.error, parameter.logTarget, parameter.logging);
            return false;
        }
        var thumbnailCache = new CacheThumbnails(parameters, this.logToCEP);
        if (thumbnailCache.mediaCache.length) {
            return false;
        }
        var processMedia = thumbnailCache.fixTimeFormat(parameters.targetFramerate);
        this.logToCEP("Time formats for " + this.processedMedia + " media thumbnails have been updated.",
            Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
        return true;
    },
    /**
     * Check parameters for fixing xmp timeFormat.
     * @param {object} parameters
     * @return {object} parameters on success, undefined on failure
     */
    checkFixXmpParameters: function(parameters) {
        parameters.framerate = Number(parameters.framerate);

        if (isNaN(Number(parameters.searchTarget)) && isNaN(parameters.framerate)) {
            this.logToCEP("Parameters are not numbers (framerate / search target). - XMP time format repair", Agrarvolution.logLevels.error);
            return undefined;
        }
        if (!(parameters.searchTarget && parameters.searchRecursive && parameters.framerate && parameters.logging && parameters.errorOnly)) {
            this.logToCEP("Parameters are not complete. - XMP time format repair", Agrarvolution.logLevels.error);
            return undefined;
        }
        this.logging = parameters.logging;

        return parameters;
    },
    /**
     * Calls to cache media objects and then reverts timecodes of selected elements.
     *@return {boolean} true on success
     */
    revertChanges: function(parameter) {
        if (this.checkRevertParameter(parameter) && this.cacheMediaObjects(false) && this.revertTimecodeChanges()) {
            this.logToCEP("Reverted the timecode for " + this.processedMedia + " media thumbnails.", Agrarvolution.logLevels.status);
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
            this.searchRecursive = parameter.searchRecursive;
            this.logging = parameter.logging;
        } else {
            this.logToCEP("Error in parameters before reverting timecode changes.", Agrarvolution.logLevels.error);
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
                        this.media[i].prevStartTime.text + ")", Agrarvolution.logLevels.info);
                } catch (e) {
                    this.logToCEP(this.media[i].filename + " - failed to update start time / timecode. (" + this.media[i].startTime.text + " -> " +
                        this.media[i].prevStartTime.text + ")", Agrarvolution.logLevels.error);
                    this.logToCEP(e, Agrarvolution.logLevels.error);
                }
                this.processedMedia++;
            } else {
                this.logToCEP(this.media[i].filename + " - Timecodes are invalid. (" + this.media[i].prevStartTime + " -> " +
                    this.media[i].prevStartTime + ")", Agrarvolution.logLevels.error);
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
            this.logToCEP("Gathered timecodes from " + this.processedMedia + " media thumbnails.", Agrarvolution.logLevels.status);

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
            this.logToCEP("Error in parameters - Update from metadata.", Agrarvolution.logLevels.error);
            return false;
        }

        this.targetFramerateisDropFrame = this.isDropFrame(this.targetFramerate);
        this.searchTarget = parameter.searchTarget;
        this.logging = parameter.logging || false;
        this.overrideFramerate = parameter.overrideFramerate || false;
        this.logToCEP("Metadata parameter have been set.", Agrarvolution.logLevels.info);

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
            this.setEmptyStartTimeProperty(this.media[i]);

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
                    newTimecode + ")", Agrarvolution.logLevels.info);
            } catch (e) {
                this.logToCEP(this.media[i].filename + " - failed to update start time / timecode. (" + this.media[i].startTime.text + " -> " +
                    newTimecode + ")", Agrarvolution.logLevels.error);
                this.logToCEP(e, Agrarvolution.logLevels.error);
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
        this.logToCEP("Starting host script.", Agrarvolution.logLevels.info);
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
            this.overrideFramerate = tcObject.overrideFramerate || false;
            this.logging = tcObject.logging
            this.logToCEP("Values have successfully arrived in host.", Agrarvolution.logLevels.status);

            return this.parseTimeGroups();
        }
        return false;
    },
    /**
    *@Todo delete

     *Calls timeValuesToInt(group) to convert time strings into numbers.
     *Can only be called after the internal timeCodeUpdate array has been set. (setValues(tcObject))
     *@returns {boolean} true on success | false on failure 
     */
    parseTimeGroups: function() {
        var i = 0;
        for (i = 0; i < this.timeCodeUpdates.length; i++) {
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].duration.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couldn't parse duration. (" + this.timeCodeUpdates[i].duration.text + ")", Agrarvolution.logLevels.status);
                return false;
            }
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].fileTC.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couldn't parse file timecode. (" + this.timeCodeUpdates[i].fileTC.text + ")", Agrarvolution.logLevels.status);
                return false;
            }
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].audioTC.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couldn't parse audio timecode. (" + this.timeCodeUpdates[i].audioTC.text + ")", Agrarvolution.logLevels.status);
                return false;
            }
        }
        this.logToCEP("Input times have been converted to numbers.", Agrarvolution.logLevels.status);
        return true;
    },
    /**
     *@Todo delete
     *Converts strings into numbers, custom made for a group object. 
     *@param {Object} group - object created while looking for parts in a time string (e.g. hh:mm:ss:ff) -> groups.hour = hh, groups.minutes = mm, groups.seconds = ss, groups.frames = ff*
     *@returns {boolean} true - on success | false if group did not exist
     */
    timeValuesToInt: function(group) {
        if (group === undefined || group == null) {
            return false;
        }

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
    },

    /**
     *Loads media file / clips into a semipermanent cache. This avoids scraping through the app DOM everytime a match has to be found later.
     *@param {object} parameters
     *@param {boolean} toggleInvalid either caches every thumbnail or only thumbnails with invalid timecodes
     *@returns {boolean} false - not processed times, thus useless for comparisons, true - everything worked
     */
    cacheMediaObjects: function(parameters, toggleInvalid) {
        var i = 0;
        var mediaCache = [];

        var hasNoSelection = app.document.selectionLength === 0;
        if (hasNoSelection || parameters.searchTarget === this.SCAN_TARGET.folder) { //process root - get all thumbnails if there is no selection
            this.logToCEP("Start searching for all media items.", Agrarvolution.logLevels.status, parameters.logTarget, parameters.logging);
            app.document.selectAll();
        } else {
            this.logToCEP("Start searching for selected media items.", Agrarvolution.logLevels.status, parameters.logTarget, parameters.logging);
        }

        for (i = 0; i < app.document.selectionLength; i++) {
            mediaCache.push(this.processThumbnail(app.document.selections[i], parameters));
        }

        if (hasNoSelection || parameters.searchTarget === this.SCAN_TARGET.folder) { // remove selection if there was none before
            app.document.deselectAll()
        }

        if (this.splitTimesToNumbers()) {
            this.logToCEP("Processing time strings was successfull.", Agrarvolution.logLevels.status, parameters.logTarget, parameters.logging);
        } else {
            this.logToCEP("Processing time strings was unsuccessfull.", Agrarvolution.logLevels.critical, parameters.logTarget, parameters.logging);
            return false;
        }

        //extended log
        if (parameters.logging) {
            var method = "";
            switch (parameters.searchTarget) {
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
            this.logToCEP(mediaCache.length + " media files have been discovered in " + method + ": " +
                JSON.stringify(mediaLog), Agrarvolution.logLevels.info, parameters.logTarget, parameters.logging);
        }
        return true;
    },
    /**
     *Processes a single project item. 
     *If it is a folder, it will call this method for all its children (depending on the settings.)
     *If it is a clip it will store some informations about the thumbnail into this namespace's media array for quicker search later in the process.
     *@param {Object} thumb Bridge folder element, see CEP reference
     *@param {object} parameters 
     */
    processThumbnail: function(thumb, parameters) {
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
            } else { // fix empty wavs
                item.framerate = 0;
            }

            item.isDropFrame = this.isDropFrame(item.framerate);

            if (item.startTime === undefined && item.timeReference !== undefined && item.sampleFrequency !== undefined) {
                item.startTime = this.samplesToTime(item.timeReference, item.sampleFrequency, 25, false);
            } else if (item.startTime === undefined) {
                item.startTime = this.zeroTimecode;
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
                this.logToCEP(this.media[i].name + " - Couldn't process start time. (" + this.media[i].startTime + ")", Agrarvolution.logLevels.status);
            }
            this.media[i].startTime = startTimeMatch;

            var prevTimeMatch = this.splitTimeToNumber(this.media[i].prevStartTime, this.media[i].framerate);
            this.media[i].prevStartTime = prevTimeMatch;
        }
        return true;
    },
    /**
     *@Todo remove
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
        this.logToCEP("Updating " + this.media.length + " discovered media items.", Agrarvolution.logLevels.status);
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
        this.logToCEP("Updated " + this.processedMedia + " media thumbnails.", Agrarvolution.logLevels.status);
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
        if (this.overrideFramerate || mediaItem.framerate === 0) {
            mediaItem.framerate = update.framerate;
            mediaItem.isDropFrame = update.isDropFrame;
        }

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
                startTime.text + ")", Agrarvolution.logLevels.info);
            this.processedMedia++;
        } catch (e) {
            this.logToCEP(mediaItem.filename + " - failed to update start time / timecode. (" + mediaItem.startTime.text + " -> " +
                startTime.text + ")", Agrarvolution.logLevels.error);
            this.logToCEP(e, Agrarvolution.logLevels.error);
            return false;
        }
        return true;
    },

    /**
     *CSXSEvent wrapping function to send log messages to the gui.
     *@param {string} text - text that should be sent to gui
     *@param {string} logLevel - choose which log level to display in gui
     *@param {number} parameters - selects which panel should receive the log messages
     *@param {boolean} logging - enable logging
     *@return {boolean}
     */
    logToCEP: function(text, logLevel, targetPanel, logging) {
        if (!xLib) {
            return false;
        }
        if (!logging) {
            return false;
        }

        var eventObj = new CSXSEvent();

        targetPanel = targetPanel || Agrarvolution.CEP_PANEL.correction; //temp default
        switch (targetPanel) {
            case Agrarvolution.CEP_PANEL.correction:
            default:
                eventObj.type = "com.adobe.csxs.events.agrarvolution.timecodeCorrectionLog";
                break;
            case Agrarvolution.CEP_PANEL.repair:
                eventObj.type = "com.adobe.csxs.events.agrarvolution.timecodeRepairLog";
                break;
        }
        eventObj.data = JSON.stringify({
            text: text,
            logLevel: logLevel
        });
        eventObj.dispatch();
        return true;
    },
};