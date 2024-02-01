CacheThumbnails.THUMBNAIL_TYPES = {
    file: 'file',
    folder: 'folder',
    alias: 'alias',
    pkg: 'package',
    app: 'application',
    other: 'other'
};
CacheThumbnails.PROCESS_METHODS = {
    fixXMP: 'fix',
    fixXMPErrorOnly: 'fixErrorOnly',
    revertTimeCode: 'revert',
    fromCreated: 'updateFromCreated',
    fromLastChange: 'updateFromLastChanged',
    fromTimecode: 'updateFromTimecode',
    fromTimecodes: 'updateFromTimecodes'
}
/**
 * Constructer for a thumbnail cache.
 * @param {object} parameters has to contain a search target, folder search and whether only erroneous thumbnails should be added 
 * @param {function} logCallback callback for logfunction where cache is created
 * @returns 
 */
function CacheThumbnails(parameters, logCallback) {
    this.mediaCache = [];

    if (!(logCallback instanceof Function)) {
        return {};
    }

    this.logCallback = logCallback;

    this.logTarget = parameters.logTarget || 0;
    this.logging = parameters.logging || false;

    if (this.cacheTimecodeOfThumbnails()) {
        this.logCallback("Processing time strings was successfull.", Agrarvolution.logLevel.status, this.logTarget, this.logging);
    } else {
        this.logCallback("Processing time strings was unsuccessfull.", Agrarvolution.logLevel.error, this.logTarget, this.logging);
    }
}

/**
 *Loads media file / clips into a semipermanent cache. This avoids scraping through the app DOM everytime a match has to be found later.
 *@returns {boolean} false - not processed times, thus useless for comparisons, true - everything worked
 */
CacheThumbnails.prototype.cacheTimecodeOfThumbnails = function (searchTarget, searchRecursive) {
    var i = 0;
    this.mediaCache = [];

    var hasNoSelection = app.document.selectionLength === 0;
    if (hasNoSelection || searchTarget === Agrarvolution.timecodeCorrection.SCAN_TARGET.folder) { //process root - get all thumbnails if there is no selection
        this.logCallback("Start searching for all media items.", Agrarvolution.logLevel.status);
        app.document.selectAll();
    } else {
        this.logCallback("Start searching for selected media items.", Agrarvolution.logLevel.status);
    }

    for (i = 0; i < app.document.selectionLength; i++) {
        this.extractTimecodeFromThumbnail(app.document.selections[i], searchRecursive);
    }

    if (hasNoSelection || searchTarget === Agrarvolution.timecodeCorrection.SCAN_TARGET.folder) { // remove selection if there was none before
        app.document.deselectAll()
    }

    if (this.logging) {
        this.logCallback(this.toString(), Agrarvolution.logLevel.info, this.logTarget, this.logging);
    }

    if (this.mediaCache.length === 0) {
        return false;
    }

    return true;
}

/**
 * Overrides standard toString with a simple status output.
 * @param {void|number} searchTarget overload for normal toString() functions
 * @returns {string}
 */
CacheThumbnails.prototype.toString = function (searchTarget) {
    var method = "";

    switch (searchTarget) {
        case Agrarvolution.timecodeCorrection.SCAN_TARGET.folder:
            method = " in folder";
            break;
        case Agrarvolution.timecodeCorrection.SCAN_TARGET.selection:
            method = " in selection";
            break;
    }

    return `${this.mediaCache.length} thumbnails have been cached ${method}: ${this.toStringCache()}.`
}
/**
 * Simple toString() function for the items in the media cache.
 * @returns {string}
 */
CacheThumbnails.prototype.toStringCache = function () {
    var output = '[';
    for (var i = 0; i < this.mediaCache.length; i++) {
        output += ` ${this.mediaCache[i]},`;
    }
    output.replace(/,$/, ' ]');

    return output;
}

/**
 *Processes a single project item. 
 *If it is a folder, it will call this method for all its children (depending on the settings.)
 *If it is a clip it will store some informations about the thumbnail into this namespace's media array for quicker search later in the process.
 *@param {Thumbnail} thumb Bridge folder element, see CEP reference
 */
CacheThumbnails.prototype.extractTimecodeFromThumbnail = function (thumb, searchRecursive) {
    if (thumb.type === CacheThumbnails.THUMBNAIL_TYPES.folder && searchRecursive) {
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
        this.logCallback(`Metadata extraction of ${metaThumb} was unsuccessful.`, Agrarvolution.logLevel.info, this.logTarget, this.logging);
    }

    this.mediaCache.push(metaThumb);

}


// -----------------
// Process methods
// -----------------

/**
 * @Todo delete
 * Fixes the xmp property timeFormat with a new value. (InvalidTimecode)
 * @param {number} targetFramerate 
 * @returns {number} sum of processed media
 */
CacheThumbnails.prototype.fixTimeFormat = function (targetFramerate, errorOnly) {
    this.processedMedia = 0;
    for (var i = 0; i < this.mediaCache.length; i++) {
        var hasError = false;
        if (this.mediaCache[i].timecodeMetadata.framerate === 0) {
            this.mediaCache[i].timecodeMetadata.framerate = targetFramerate;
            hasError = true;

        }
        if (this.mediaCache[i].timecodeMetadata.timecodeStruct === '') {
            hasError = true;
        }

        if (!errorOnly || hasError) { //@Todo Find a better way to solved this instead of nested if - the whole structure might contain duplicated code.
            if (!errorOnly) {
                this.mediaCache[i].timecodeMetadata.framerate = targetFramerate;
            }

            if (this.mediaCache[i].updateTimecodeMetadata(this.mediaCache[i].timecodeMetadata.startTime.convertByFramerate(this.mediaCache[i].timecodeMetadata.framerate))) {
                this.logCallback(this.mediaCache[i].filename + " - start time / timecode has been updated. (" + this.mediaCache[i].timecodeMetadata.prevStartTime + " -> " +
                    this.mediaCache[i].timecodeMetadata.startTime + ")", Agrarvolution.logLevels.info, this.logTarget, this.logging);
                this.logCallback(this.mediaCache[i].filename + " - Time format fixed.", Agrarvolution.logLevels.info, this.logTarget, this.logging);
                this.processedMedia++;
            } else {
                this.logCallback(this.mediaCache[i].filename + " - failed to fix time format.", Agrarvolution.logLevels.error, this.logTarget, this.logging);
                /**
                 * @ToDo Exceptions got lost in process - maybe a thing to reimplement.
                 */
                // this.logCallback(JSON.stringify(e), Agrarvolution.logLevels.error);
            }
        }

    }
    return this.processesMedia;
}


/**
 *   @Todo delete
 * Reverts to the previously stored timecode.
 * Only uses one history element.
 * @return {number} sum of processed media
 */
CacheThumbnails.prototype.revertTimecodeChanges = function () {
    this.processedMedia = 0;
    for (var i = 0; i < this.mediaCache.length; i++) {
        if (this.mediaCache[i].timecodeMetadata.prevStartTime.toValue() === 0 && this.mediaCache[i].timecodeMetadata.prevFramerate === 0) {
            continue;
        }

        if (this.mediaCache[i].updateTimecodeMetadata(this.mediaCache[i].timecodeMetadata.prevStartTime)) {
            this.logCallback(this.mediaCache[i].filename + " - start time / timecode has been updated. (" + this.mediaCache[i].timecodeMetadata.prevStartTime + " -> " +
                this.mediaCache[i].timecodeMetadata.startTime + ")", Agrarvolution.logLevels.info, this.logTarget, this.logging);
            this.logCallback("Timevalues have been reverted.", Agrarvolution.logLevels.info, this.logTarget, this.logging);
            this.processedMedia++;
        } else {
            this.logCallback(this.mediaCache[i].filename + " - failed to fix time format.", Agrarvolution.logLevels.error, this.logTarget, this.logging);
            /**
             * @ToDo Exceptions got lost in process - maybe a thing to reimplement.
             */
            // this.logCallback(JSON.stringify(e), Agrarvolution.logLevels.error);
        }
        this.processedMedia++;
    }
    return this.processesMedia;
}

CacheThumbnails.prototype.updateCache = function (input, method) {
    var processedMedia = 0;
    if (typeof method === 'number') {
        return processedMedia;
    }
    if (input == null) {
        return processedMedia;
    }

    for (var i = 0; i < this.mediaCache.length; i++) {
        var processed = false;
        var logMessage = '';
        switch (method) {
            case CacheThumbnails.PROCESS_METHODS.fixXMP:
                processed = this.mediaCache[i].fixFaultyTimecodeMetadata(input.targetFramerate, false);
                logMessage = processed ? 'Changed the framerate of thumbnail.' : 'Error while changing the framerate of thumbnail.';
                break;
            case CacheThumbnails.PROCESS_METHODS.fixXMPErrorOnly:
                processed = this.mediaCache[i].fixFaultyTimecodeMetadata(input.targetFramerate, true);
                logMessage = processed ? 'Corrected time format of \'faulty}\' thumbnail.' : 'Error while correcting thumbnail.';
                break;
            case CacheThumbnails.PROCESS_METHODS.revertTimeCode:
                processed = this.mediaCache[i].revertTimecodeChanges();
                logMessage = processed ? 'Reverted start time from thumbnail.' : 'Error while reverting thumbnail.';
                break;
            case CacheThumbnails.PROCESS_METHODS.fromCreated:
                processed = this.mediaCache[i].updateFromMetadataDate(input.targetFramerate, input.overrideFramerate, ThumbnailMetadata.METADATA_DATE.created);
                logMessage = processed ? 'Changed start time to creation date.' : 'Error while updating thumbnail by creation date.';
                break;
            case CacheThumbnails.PROCESS_METHODS.fromLastChange:
                processed = this.mediaCache[i].updateFromMetadataDate(input.targetFramerate, input.overrideFramerate, ThumbnailMetadata.METADATA_DATE.lastChanged);
                logMessage = processed ? 'Changed start time to date of last change.' : 'Error while updating thumbnail by date of last change.';
                break;
            case CacheThumbnails.PROCESS_METHODS.fromTimecodes:
                var validatedInput = CacheThumbnails.validateTimecodeArray(input.timecodeUpdates, this.logCallback, this.logTarget, this.logging);
                processed = this.mediaCache[i].updateFromTimecodes(validatedInput, input.ignoreMediaStart, input.overrideFramerate);
                logMessage = processed ? 'Changed start time by timecode inputs.' : 'Error while updating thumbnail by thumbnail inputs.';
                break;
            case CacheThumbnails.PROCESS_METHODS.fromTimecode:
                processed = this.mediaCache[i].updateFromTimecode(input.timecode, input.overrideFramerate);
                logMessage = processed ? 'Changed start time by timecode input.' : 'Error while updating thumbnail by thumbnail input.';
                break;
            default:
                break;
        }

        if (processed) {
            this.logCallback(this.mediaCache[i].filename + " - start time / timecode has been updated. (" + this.mediaCache[i].timecodeMetadata.prevStartTime + " -> " +
                this.mediaCache[i].timecodeMetadata.startTime + ")", Agrarvolution.logLevels.info, this.logTarget, this.logging);
            this.logCallback(logMessage, Agrarvolution.logLevels.info, this.logTarget, this.logging);
            this.processedMedia++;
        } else {
            this.logCallback(this.mediaCache[i].toString() + " - Error during update.", Agrarvolution.logLevels.error, this.logTarget, this.logging);
            this.logCallback(logMessage, Agrarvolution.logLevels.info, this.logTarget, this.logging);
            /**
             * @ToDo Exceptions got lost in process - maybe a thing to reimplement.
             */
            // this.logCallback(JSON.stringify(e), Agrarvolution.logLevels.error);
        }
        processedMedia++;
    }
    return processedMedia;
}

/**
 * Takes timecode inputs and validates every array item whether it contains valid timecode data. 
 * @param {array} timecodeUpdates 
 * @param {function} logCallback 
 * @param {boolean} logTarget 
 * @param {boolean} logging 
 * @returns {array} array containing parsed timecode updates 
 */
CacheThumbnails.validateTimecodeArray = function (timecodeUpdates, logCallback, logTarget, logging) {
    if (!(timecodeUpdates instanceof Array)) {
        return [];
    }

    var parsedUpdates = [];

    for (var i = 0; i < timecodeUpdates.length; i++) {
        var updateElement = this.validateTimecodeInput(timecodeUpdates[i], logCallback, logTarget, logging);

        if (updateElement) {
            parsedUpdates.push(updateElement);
        }
    }
    logCallback("Input times have been converted to numbers.", Agrarvolution.logLevels.status, logTarget, logging);
    return parsedUpdates;
}
/**
 * Checks whether timecode input contains any timecode data and returns false if there is an error.
 * @param {object} timecodeInput 
 * @param {function} logCallback 
 * @param {boolean} logTarget 
 * @param {boolean} logging 
 * @returns {object}
 */
CacheThumbnails.validateTimecodeInput = function (timecodeInput, logCallback, logTarget, logging) {
    var output = {};

    if (!timecodeInput.name) {
        logCallback("The name of the input is missing.", Agrarvolution.logLevels.status, logTarget, logging);
        return false;
    }
    output.name = timecodeInput.name;

    output.framerate = Timecode.validateFramerate(timecodeInput.framerate);
    if (output.framerate <= 0) {
        logCallback(timecodeInput.name + " - Framerate " + timecodeInput.framerate + " is invalid.", Agrarvolution.logLevels.info, logTarget, logging);
        return false;
    }

    if (!timecodeInput.duration) {
        logCallback(timecodeInput.name + " - Data has no duration.", Agrarvolution.logLevels.info, logTarget, logging);
        //return false; //This can't be easily used for processing in Bridge.
    }
    output.duration = new Timecode(timecodeInput.duration, output.framerate);

    if (!timecodeInput.fileTC) {
        logCallback(timecodeInput.name + " - Couldn't parse file timecode. (" + timecodeInput.fileTC + ")", Agrarvolution.logLevels.info, logTarget, logging);
        return false;
    }
    output.fileTC = new Timecode(timecodeInput.fileTC, output.framerate);

    if (!timecodeInput.audioTC) {
        logCallback(timecodeInput.name + " - Couldn't parse audio timecode. (" + timecodeInput.audioTC + ")", Agrarvolution.logLevels.info, logTarget, logging);
        return false;
    }
    output.audioTC = new Timecode(timecodeInput.audioTC, output.framerate);

    return output;
}