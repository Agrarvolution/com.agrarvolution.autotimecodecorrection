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
            this.logToCEP("No media was cached.", Agrarvolution.logLevels.error, parameter.logTarget, parameter.logging);
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
        parameters.logTarget = Agrarvolution.CEP_PANEL.correction;
        if (this.checkRevertParameter(parameter)) {
            return false;
        }
        var thumbnailCache = new CacheThumbnails(parameters, this.logToCEP);
        if (thumbnailCache.mediaCache.length) {
            this.logToCEP("No media was cached.", Agrarvolution.logLevels.error, parameter.logTarget, parameter.logging);
            return false;
        }
        var processMedia = thumbnailCache.revertTimecodeChanges();
        this.logToCEP("Time formats for " + this.processedMedia + " media thumbnails have been reverted.",
            Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
        return true;
    },
    /**
     * Check parameters for reverting timecode changes.
     * @return {boolean} true on success
     */
    checkRevertParameter: function(parameter) {
        if (!(parameter.searchTarget && parameter.searchRecursive && parameters.logging)) {
            this.logToCEP("Parameters are not complete. - Reverting timecode changes", Agrarvolution.logLevels.error);
            return undefined;
        }

        return parameter;
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