#include '../json2.js'
#include 'CacheThumbnails.js'
#include 'ThumbnailMetadata.js'
#include 'Timecode.js'

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

    processCEPInput: function(parameters) { 
        if (parameters === undefined) {
            this.logToCEP("Called without parameters.", Agrarvolution.logLevels.error, parameter.logTarget, parameter.logging);
            return false;
        }
        this.logToCEP("Starting host script.", Agrarvolution.logLevels.info,parameter.logTarget, parameter.logging);

        var thumbnailCache = new CacheThumbnails(parameters, this.logToCEP);
        if (thumbnailCache.mediaCache.length === 0) {
            this.logToCEP("No media was cached.", Agrarvolution.logLevels.error, parameter.logTarget, parameter.logging);
            return false;
        }
        var processedMedia = thumbnailCache.update(parameters, parameters.method);

        if (processedMedia === 0) {
            this.logToCEP("No media was processed.",
                Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
            return false;
        }

        this.logToCEP("Time formats for " + processedMedia + " media thumbnails have been updated.",
            Agrarvolution.logLevels.status, parameter.logTarget, parameter.logging);
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