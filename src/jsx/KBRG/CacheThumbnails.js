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
    this.logTarget = parameters.logTarget || 0;
    this.logging = parameters.logging || false;
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

    if (hasNoSelection || this.searchTarget === Agrarvolution.timecodeCorrection.SCAN_TARGET.folder) { // remove selection if there was none before
        app.document.deselectAll()
    }

    // if (this.splitTimesToNumbers()) {
    //     this.logging("Processing time strings was successfull.", Agrarvolution.logLevel.status);
    // } else {
    //     this.logging("Processing time strings was unsuccessfull.", Agrarvolution.logLevel.critical);
    //     return false;
    // }

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


CacheThumbnails.prototype.toString = function() {

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
    if (thumb.type !== CacheThumbnails.THUMBNAIL_TYPES.file || !thumb.hasMetadata) {
        return;
    }

    var metaThumb = new ThumbnailMetadata(thumb);
    var metaDataExtractionSuccessful = metaThumb.extractMetadata();

    if (!metaDataExtractionSuccessful) {
        this.logging(`Metadata extraction of ${metaThumb} was unsuccessful.`, Agrarvolution.logLevel.info, this.logTarget, this.logging);
    }
    if (metaDataExtractionSuccessful !== this.errorOnly) {
        this.mediaCache.push(metaThumb);
    }
}
