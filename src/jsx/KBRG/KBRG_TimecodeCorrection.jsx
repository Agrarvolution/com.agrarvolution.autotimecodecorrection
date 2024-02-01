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
     *Takes timecode inputs and validates every array item whether it contains valid timecode data.
     *@returns {array} array containing parsed tiemcode updates 
     */
    parseTimecodeArray: function(timecodeUpdates, parameters) {
        var i = 0;
        var parsedUpdates = [];

        for (i = 0; i < timeCodeUpdates.length; i++) {
            var updateElement = this.validateTimecodeInput(timecodeUpdates[i]);

            if (updateElement) {
                parsedUpdates.push(updateElement);
            }
        }
        this.logToCEP("Input times have been converted to numbers.", Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
        return parsedUpdates;
    },
    /**
     * Checks whether timecode input contains any timecode data and returns false if there is an error.
     * @param {object} timecodeInput 
     * @param {object} parameter log parameters 
     * @returns {boolean}
     */
    validateTimecodeInput(timecodeInput, parameters) {
        var output = {};

        if (!timecodeInput.name) {
            this.logToCEP("The name of the input is missing.", Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
            return false;
        }
        output.name = timecodeInput.name;

        output.framerate = Timecode.validateFramerate(timecodeInput.framerate);
        if (output.framerate <= 0) {
            this.logToCEP(timecodeInput.name + " - Framerate " + timecodeInput.framerate + " is invalid.", Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
            return false;
        }

        if (!timecodeInput.duration) {
            this.logToCEP(timecodeInput.name + " - Data has no duration.", Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
            //return false; //This can't be easily used for processing in Bridge.
        }
        output.duration = new Timecode(timecodeInput.duration, output.framerate);

        if (!timecodeInput.fileTC) {
            this.logToCEP(timecodeInput.name + " - Couldn't parse file timecode. (" + timecodeInput.fileTC + ")", Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
            return false;
        }
        output.fileTC = new Timecode(timecodeInput.fileTC, output.framerate);

        if (!timecodeInput.audioTC) {
            this.logToCEP(timecodeInput.name + " - Couldn't parse audio timecode. (" + timecodeInput.audioTC + ")", Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
            return false;
        }
        output.audioTC = new Timecode(timecodeInput.audioTC, output.framerate);

        return output;
    }

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