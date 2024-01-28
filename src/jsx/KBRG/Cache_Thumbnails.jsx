function CacheThumbnails(parameters) {

}

/**
 *Loads media file / clips into a semipermanent cache. This avoids scraping through the app DOM everytime a match has to be found later.
 *@param {object} parameters
 *@param {boolean} toggleInvalid either caches every thumbnail or only thumbnails with invalid timecodes
 *@returns {boolean} false - not processed times, thus useless for comparisons, true - everything worked
 */
CacheThumbnails.prototype.cacheMediaObjects = function(parameters, toggleInvalid) {
    var i = 0;
    var mediaCache = [];

    var hasNoSelection = app.document.selectionLength === 0;
    if (hasNoSelection || parameters.searchTarget === this.SCAN_TARGET.folder) { //process root - get all thumbnails if there is no selection
        this.logToCEP("Start searching for all media items.", this.logLevels.status, parameters.logTarget, parameters.logging);
        app.document.selectAll();
    } else {
        this.logToCEP("Start searching for selected media items.", this.logLevels.status, parameters.logTarget, parameters.logging);
    }

    for (i = 0; i < app.document.selectionLength; i++) {
        mediaCache.push(this.processThumbnail(app.document.selections[i], parameters));
    }

    if (hasNoSelection || parameters.searchTarget === this.SCAN_TARGET.folder) { // remove selection if there was none before
        app.document.deselectAll()
    }

    if (this.splitTimesToNumbers()) {
        this.logToCEP("Processing time strings was successfull.", this.logLevels.status, parameters.logTarget, parameters.logging);
    } else {
        this.logToCEP("Processing time strings was unsuccessfull.", this.logLevels.critical, parameters.logTarget, parameters.logging);
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
            JSON.stringify(mediaLog), this.logLevels.info, parameters.logTarget, parameters.logging);
    }
    return true;
}
/**
 *Processes a single project item. 
 *If it is a folder, it will call this method for all its children (depending on the settings.)
 *If it is a clip it will store some informations about the thumbnail into this namespace's media array for quicker search later in the process.
 *@param {Object} thumb Bridge folder element, see CEP reference
 *@param {object} parameters 
 */
CacheThumbnails.prototype.processThumbnail = function(thumb, parameters) {
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
}