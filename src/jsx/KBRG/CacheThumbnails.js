CacheThumbnails.THUMBNAIL_TYPES = {
    file: 'file',
    folder: 'folder',
    alias: 'alias',
    pkg: 'package',
    app: 'application',
    other: 'other'
};

/**
 * Constructer for a thumbnail cache.
 * @param {object} parameters has to contain a search target, folder search and whether only erroneous thumbnails should be added 
 * @param {function} logCallback callback for logfunction where cache is created
 * @returns 
 */
function CacheThumbnails(parameters, logCallback) {
    if (parameters == null || typeof logCallback !== 'function') {
        return {};
    }
    this.logging = logCallback;

    this.searchTarget = parameters.searchTarget || Agrarvolution.timecodeCorrection.folder;
    this.searchRecursive = parameters.searchRecursive || false;
    this.errorOnly = parameters.errorOnly || false;
    this.mediaCache = [];
}

/**
 *Loads media file / clips into a semipermanent cache. This avoids scraping through the app DOM everytime a match has to be found later.
 *@returns {boolean} false - not processed times, thus useless for comparisons, true - everything worked
 */
CacheThumbnails.prototype.cacheTimecodeOfThumbnails = function () {
    var i = 0;
    this.mediaCache = [];

    var hasNoSelection = app.document.selectionLength === 0;
    if (hasNoSelection || this.searchTarget === Agrarvolution.timecodeCorrection.SCAN_TARGET.folder) { //process root - get all thumbnails if there is no selection
        this.logging("Start searching for all media items.", Agrarvolution.logLevel.status);
        app.document.selectAll();
    } else {
        this.logging("Start searching for selected media items.", Agrarvolution.logLevel.status);
    }

    for (i = 0; i < app.document.selectionLength; i++) {
        this.extractTimecodeFromThumbnail(app.document.selections[i]);
    }

    if (hasNoSelection || this.searchTarget === this.SCAN_TARGET.folder) { // remove selection if there was none before
        app.document.deselectAll()
    }

    if (this.splitTimesToNumbers()) {
        this.logging("Processing time strings was successfull.", Agrarvolution.logLevel.status);
    } else {
        this.logging("Processing time strings was unsuccessfull.", Agrarvolution.logLevel.critical);
        return false;
    }

    // //extended log
    // if (parameters.logging) {
    //     var method = "";
    //     switch (parameters.searchTarget) {
    //         case 0:
    //             method = "project";
    //             break;
    //         case 1:
    //             method = "selection";
    //             break;
    //     }

    //     var mediaLog = JSON.parse(JSON.stringify(this.media));
    //     for (var i = 0; i < mediaLog.length; i++) {
    //         mediaLog[i].thumb = "[object ProjectItem]";
    //     }
    //     this.logToCEP(mediaCache.length + " media files have been discovered in " + method + ": " +
    //         JSON.stringify(mediaLog), Agrarvolution.logLevel.info, parameters.logTarget, parameters.logging);
    // }
    return true;
}
/**
 *Processes a single project item. 
 *If it is a folder, it will call this method for all its children (depending on the settings.)
 *If it is a clip it will store some informations about the thumbnail into this namespace's media array for quicker search later in the process.
 *@param {Thumbnail} thumb Bridge folder element, see CEP reference
 */
CacheThumbnails.prototype.extractTimecodeFromThumbnail = function (thumb) {
    if (thumb.type === CacheThumbnails.THUMBNAIL_TYPES.folder && this.searchRecursive) {
        for (var i = 0; i < thumb.children.length; i++) {
            this.extractTimecodeFromThumbnail(thumb.children[i]);
        }
        return;
    }
    if (thumb.type === CacheThumbnails.THUMBNAIL_TYPES.file && thumb.hasMetadata) {
        var metaThumb = new ThumbnailMetadata(thumb);

        if (metaThumb.extractMetadata() !== this.errorOnly) {
            this.mediaCache.push(metaThumb);
        }
    }
}


/**
 *Calls splitTimeToNumber for duration and startTime for every object in the media array.
 *@returns {boolean} false on any error | true on success
 */
CacheThumbnails.prototype.splitTimesToNumbers = function () {
    for (var i = 0; i < this.media.length; i++) {
        var startTimeMatch = CacheThumbnails.splitTimeToNumber(this.media[i].startTime, this.media[i].framerate);
        if (!startTimeMatch) {
            this.logToCEP(this.media[i].name + " - Couldn't process start time. (" + this.media[i].startTime + ")", Agrarvolution.logLevels.status);
        }
        this.media[i].startTime = startTimeMatch;

        var prevTimeMatch = CacheThumbnails.splitTimeToNumber(this.media[i].prevStartTime, this.media[i].framerate);
        this.media[i].prevStartTime = prevTimeMatch;
    }
    return true;
}
