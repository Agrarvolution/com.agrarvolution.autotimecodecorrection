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

$.Agrarvolution = Agrarvolution;

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

/**
 *CSXSEvent wrapping function to send log messages to the gui.
 *@param {string} text - text that should be sent to gui
 *@param {string} logLevel - choose which log level to display in gui
 *@param {number} parameters - selects which panel should receive the log messages
 *@param {boolean} logging - enable logging
 *@return {boolean}
 */
Agrarvolution.logToCEP = function(text, logLevel, targetPanel, logging) {
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
}

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

    /**
     * Caches thumbnails and exports any available timecodedata to an csv string.
     * @param {object} parameters 
     * @returns {string} boolean on error (false), string on success
     */
    exportTimecodeData: function(parameters) {
        if (parameters === undefined) {
            Agrarvolution.logToCEP("Called without parameters.", Agrarvolution.logLevels.error, parameters.logTarget, parameters.logging);
            return '';
        }
        Agrarvolution.logToCEP("Starting host script.", Agrarvolution.logLevels.info, parameters.logTarget, parameters.logging);

        var thumbnailCache = new CacheThumbnails(parameters);
        if (thumbnailCache.mediaCache.length === 0) {
            Agrarvolution.logToCEP("No media was cached.", Agrarvolution.logLevels.error, parameters.logTarget, parameters.logging);
            return '';
        }

        return JSON.stringify({
            csv: thumbnailCache.toTimecodeCSV(),
            path: app.document.presentationPath
        });
    },
    /**
     * Handles input from CEP UI.
     * It caches thumbnails, and calls the generic update method with the specified method.
     * @param {object} parameters 
     * @returns {boolean} true on success
     */
    processCEPInput: function(parameters) {
        if (parameters === undefined) {
            Agrarvolution.logToCEP("Called without parameters.", Agrarvolution.logLevels.error, parameters.logTarget, parameters.logging);
            return false;
        }
        Agrarvolution.logToCEP("Starting host script.", Agrarvolution.logLevels.info, parameters.logTarget, parameters.logging);

        var thumbnailCache = new CacheThumbnails(parameters);
        if (thumbnailCache.mediaCache.length === 0) {
            Agrarvolution.logToCEP("No media was cached.", Agrarvolution.logLevels.error, parameters.logTarget, parameters.logging);
            return false;
        }

        var processedMedia = thumbnailCache.updateCache(parameters, parameters.method);

        if (processedMedia === 0) {
            Agrarvolution.logToCEP("No media was processed.",
                Agrarvolution.logLevels.status, parameters.logTarget, parameters.logging);
            return false;
        }

        /*check processing
         * This currently ignores changes to the thumbnails if they are not made with the array update / csv pipeline. 
         * @Todo Add ability to check every time related type of thumbnail metadata change.
         */
        var checkCache = new CacheThumbnails(parameters);
        if (parameters.timecodes) {
            var validatedInput = CacheThumbnails.validateTimecodeArray(parameters.timecodes, Agrarvolution.logToCEP, parameters.logTarget, false);
            var checkResults = checkCache.compareTimecodes(validatedInput);
            return JSON.stringify(checkResults);
        }

        Agrarvolution.logToCEP("Time formats for " + processedMedia + " media thumbnails have been updated.",
            Agrarvolution.logLevels.status, parameters.logTarget, parameters.logging);
        return true;
    }
};