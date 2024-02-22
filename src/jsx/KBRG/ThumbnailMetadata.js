ThumbnailMetadata.PREVIOUS_TIME_VALUE = 'previousTimeValue';
ThumbnailMetadata.PREVIOUS_TIME_FORMAT = 'previousTimeFormat';
ThumbnailMetadata.TIME_FORMAT = 'timeFormat';
ThumbnailMetadata.TIME_VALUE = 'timeValue';
ThumbnailMetadata.TIME_CODE_STRUCT = {
    'start': 'startTimecode',
    'alt': 'altTimecode'
};
ThumbnailMetadata.DEFAULT_FRAMERATE = 25;
ThumbnailMetadata.ALLOWED_MEDIA_TYPES = [
    'mp4', 'av1', 'mov', 'ogg', 'ogv', 'mkv', 'webm',
    'wav', 'bwf', 'rf64', 'amb', 'acc', 'aif', 'aiff', 'aifc', 'mp2', 'mp3', '3gp', 'wma', 'flac', 'ape'
];
ThumbnailMetadata.METADATA_DATE = {
    'created': 0,
    'lastChanged': 1
};
/**
 * Creates a new thumbnail metadata object.
 * @param {Thumbnail} thumbnail Bridge folder element, see CEP reference for Thumbnail object
 * @return {object} returns empty object if thumbnail is not a file or the file has no metadata.
 */
function ThumbnailMetadata(thumbnail) {
    if (thumbnail.type !== CacheThumbnails.THUMBNAIL_TYPES.file || !thumbnail.hasMetadata) {
        return {};
    }
    this.thumb = thumbnail;
    this.filename = thumbnail.name;
    this.mimeType = thumbnail.mimeType;
}

/**
 * Generates a shortened version of the Thumbnail metadata. For this use case only this.timecodeMetadata.startTime is really relevant.
 * @returns {string}
 */
ThumbnailMetadata.prototype.toString = function () {
    var text = this.filename + " ";
    if (this.timecodeMetadata) {
        text += '[' + this.timecodeMetadata.startTime.toString() + '@' + this.timecodeMetadata.framerate.toString() + 'fps]'
    }
    return text;
}
/**
 * Generates a minimal csv row containing file name, start time and framerate.
 * @returns {string}
 */
ThumbnailMetadata.prototype.toTimecodeCSV = function () {
    if (this.timecodeMetadata == null) {
        return '';
    }
    return [this.filename, this.timecodeMetadata.startTime, this.timecodeMetadata.framerate].join(',');
}


/**
 * Extracts timecode metadata from a thumbnails xmp data and sets these values for the object instance.
 * @return {boolean} on true, contains no errors, on false has values that errored / are invalid.
 */
ThumbnailMetadata.prototype.extractMetadata = function () {
    this.xmp = new XMPMeta(this.thumb.synchronousMetadata.serialize());

    if (this.xmp.doesPropertyExist(XMPConst.NS_BWF, "codingHistory")) {
        this.audioMetadata = ThumbnailMetadata.extractAudioMetadata(this.xmp);
    }

    this.timecodeMetadata = ThumbnailMetadata.extractTimecodeMetadata(this.xmp);

    if (this.timecodeMetadata.startTime.toFrames() === 0 && this.audioMetadata) {
        this.timecodeMetadata.startTime = new Timecode(
            Timecode.createTimecodeFromSamples(
                this.audioMetadata.samples,
                this.audioMetadata.sampleFrequency,
                ThumbnailMetadata.DEFAULT_FRAMERATE
            ),
            ThumbnailMetadata.DEFAULT_FRAMERATE
        );
        this.timecodeMetadata.framerate = ThumbnailMetadata.DEFAULT_FRAMERATE;
    }

    if (this.timecodeMetadata.framerate === 0) {
        return false;
    }

    return true;
}

/**
 * Extracts relevant audio metadata from a thumbnail's metadata.
 * @param {XMPMetaInstance} xmp XMP object - see XMP specification 
 * @returns {object} containing ending, samples, sample frequency and bitrate
 */
ThumbnailMetadata.extractAudioMetadata = function (xmp) {
    var sampleFrequency = 0;
    if (xmp.doesPropertyExist(XMPConst.NS_DM, 'audioSampleRate')) {
        sampleFrequency = xmp.getProperty(XMPConst.NS_DM, 'audioSampleRate').value || '';
    } else if (xmp.doesPropertyExist(XMPConst.NS_BWF, 'codingHistory')) {
        var audioEncoding = xmp.getProperty(XMPConst.NS_BWF, 'codingHistory').value || '';
        audioEncoding = audioEncoding.match(/F=\d+/g).toString();

        if (audioEncoding.length === 0) {
            sampleFrequency = 0;
        } else {
            sampleFrequency = Number(audioEncoding.replace('F=', ''));
        }
    }

    var bitRate = audioEncoding.match(/W=\d+/g);
    if (bitRate == null || !bitRate.length) {
        bitRate = 0;
    } else {
        bitRate = Number(bitRate[0].replace('W=', ''));
    }

    var samples = xmp.getProperty(XMPConst.NS_BWF, "timeReference") || 0;

    return {
        audioEncoding: audioEncoding,
        sampleFrequency: sampleFrequency,
        bitRate: bitRate,
        samples: samples
    };
}

/**
 * Extracts timecode metadata from xmp metadata.
 * @param {XMPMetaInstance} xmp 
 * @returns {object} containing start time, previous start time, framerate and whether the framerate is dropframe
 */
ThumbnailMetadata.extractTimecodeMetadata = function (xmp) {
    var timecodeStruct = '';
    if (xmp.doesPropertyExist(XMPConst.NS_DM, this.TIME_CODE_STRUCT.start)) { //prioritice start over alt timecode entries
        timecodeStruct = this.TIME_CODE_STRUCT.start;
    } else if (xmp.doesPropertyExist(XMPConst.NS_DM, this.TIME_CODE_STRUCT.alt)) {
        timecodeStruct = this.TIME_CODE_STRUCT.alt;
    }

    var framerate = 0;
    if (timecodeStruct !== '' && xmp.doesStructFieldExist(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.TIME_FORMAT)) {
        framerate = this.checkMetadataFramerate(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.TIME_FORMAT).value || '');
    }

    var startTime = new Timecode();
    if (timecodeStruct !== '' && xmp.doesStructFieldExist(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.TIME_VALUE)) {
        startTime = new Timecode(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.TIME_VALUE).value, framerate);
    }


    var prevFramerate = 0;
    if (timecodeStruct !== '' && xmp.doesStructFieldExist(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.PREVIOUS_TIME_FORMAT)) {
        prevFramerate = this.checkMetadataFramerate(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.PREVIOUS_TIME_FORMAT).value || '');
    }

    var prevStartTime = new Timecode();
    if (timecodeStruct !== '' && xmp.doesStructFieldExist(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.PREVIOUS_TIME_VALUE)) {
        prevStartTime = new Timecode(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.PREVIOUS_TIME_VALUE).value, prevFramerate);
    }
    var isDropFrame = Timecode.isDropFrame(framerate);

    return {
        startTime: startTime,
        prevStartTime: prevStartTime,
        framerate: framerate,
        prevFramerate: prevFramerate,
        isDropFrame: isDropFrame,
        timecodeStruct: timecodeStruct
    }
}

/**
 * Checks ThumbnailMetadata object is it contains any invalid framerate or timecode structure.
 * It will than update the object with the targetFramerate.
 * @param {number} targetFramerate check if input object contains targetFramerate 
 * @param {boolean} errorOnly 
 * @returns {boolean|string} true on success
 */
ThumbnailMetadata.prototype.fixFaultyTimecodeMetadata = function (targetFramerate, errorOnly) {
    targetFramerate = Number(targetFramerate || '');

    if (isNaN(targetFramerate)) {
        return false;
    }

    var hasError = false;
    if (this.timecodeMetadata.framerate <= 0) {
        hasError = true;

    }
    if (this.timecodeMetadata.timecodeStruct === '') {
        hasError = true;
    }

    if (errorOnly && !hasError) {
        return 'skipped';
    }

    this.timecodeMetadata.framerate = targetFramerate;

    return this.updateTimecodeMetadata(this.timecodeMetadata.startTime.convertByFramerate(this.timecodeMetadata.framerate));
}

/**
 * Reverts to the previously stored timecode.
 * @returns {boolean} true on success
 */
ThumbnailMetadata.prototype.revertTimecodeChange = function () {
    if (this.timecodeMetadata.prevStartTime.toValue() === 0 || this.timecodeMetadata.prevFramerate === 0) {
        return false;
    }
    return this.updateTimecodeMetadata(this.timecodeMetadata.prevStartTime);
}

/**
 * Update start time of thumbnail by creation date or time of last modification. 
 * @param {number|string} targetFramerate 
 * @param {boolean} overrideFramerate
 * @param {number} metadataSelector 
 * @returns {boolean} true on success
 */
ThumbnailMetadata.prototype.updateFromMetadataDate = function (targetFramerate, overrideFramerate, metadataSelector) {
    var dateUpdate = {};
    targetFramerate = ThumbnailMetadata.checkMetadataFramerate(targetFramerate);

    if (targetFramerate === 0) {
        return false;
    }
    if (this.timecodeMetadata.framerate > 0 && !overrideFramerate) { //add for files with missing time values
        targetFramerate = this.timecodeMetadata.framerate;
    }

    switch (metadataSelector) {
        case ThumbnailMetadata.METADATA_DATE.created:
            dateUpdate = this.thumb.bestCreationDate;
            break;
        case ThumbnailMetadata.METADATA_DATE.lastChanged:
            dateUpdate = this.thumb.lastModifiedDate;
            break;
        default:
            return false;
    }
    return this.updateTimecodeMetadata(new Timecode(dateUpdate, targetFramerate));
}

/**
 * Updates / changes the starttime of a thumbnail.
 * @param {Timecode} timecode 
 * @param {boolean} overrideFramerate 
 * @returns true on success
 */
ThumbnailMetadata.prototype.updateFromTimecode = function (timecode, overrideFramerate) {
    if (!(timecode instanceof Timecode)) {
        return false;
    }

    if (!overrideFramerate) {
        timecode = timecode.convertByFramerate(this.timecodeMetadata.framerate);
    }
    return this.updateTimecodeMetadata(timecode);
}

/**
 * Loops through every update entitiy until a matching filename and or mediastart is found and then updates the object.
 * @param {array} updates 
 * @param {boolean} enableMediaStartComparison 
 * @param {boolean} overrideFramerate 
 * @returns true on success
 */
ThumbnailMetadata.prototype.updateFromTimecodes = function (updates, enableMediaStartComparison, overrideFramerate) {
    enableMediaStartComparison = enableMediaStartComparison || false; //default false

    if (!(updates instanceof Array)) {
        return false;
    }

    var update = this.compareInTimecodeUpdates(updates, enableMediaStartComparison);

    if (update) {
        return this.updateFromTimecode(update.audioTC, overrideFramerate);
    }

    return false;
}

/**
 * Update a ThumbnailMetadata startTime timecode with a new Timecode object.
 * @param {Timecode} newStartTime
 * @return {boolean} exits the function with false then the input is not a Timecode object
 */
ThumbnailMetadata.prototype.updateTimecodeMetadata = function (newStartTime) {
    if (!(newStartTime instanceof Timecode) || !(this.xmp instanceof XMPMeta)) {
        return false;
    }

    this.timecodeMetadata.prevStartTime = this.timecodeMetadata.startTime;
    this.timecodeMetadata.prevFramerate = this.timecodeMetadata.framerate;
    this.timecodeMetadata.startTime = newStartTime;
    this.timecodeMetadata.framerate = newStartTime.framerate;

    if (this.timecodeMetadata.timecodeStruct === '') {
        this.timecodeMetadata.timecodeStruct = ThumbnailMetadata.TIME_CODE_STRUCT.alt;
    }

    this.xmp.setStructField(XMPConst.NS_DM, this.timecodeMetadata.timecodeStruct, XMPConst.NS_DM,
        ThumbnailMetadata.TIME_FORMAT, Timecode.createTimeFormat(this.timecodeMetadata.framerate));
    this.xmp.setStructField(XMPConst.NS_DM, this.timecodeMetadata.timecodeStruct, XMPConst.NS_DM,
        ThumbnailMetadata.TIME_VALUE, this.timecodeMetadata.startTime.toString());

    this.xmp.setStructField(XMPConst.NS_DM, this.timecodeMetadata.timecodeStruct, XMPConst.NS_DM,
        ThumbnailMetadata.PREVIOUS_TIME_FORMAT, Timecode.createTimeFormat(this.timecodeMetadata.prevFramerate));
    this.xmp.setStructField(XMPConst.NS_DM, this.timecodeMetadata.timecodeStruct, XMPConst.NS_DM,
        ThumbnailMetadata.PREVIOUS_TIME_VALUE, this.timecodeMetadata.prevStartTime.toString());

    if (this.audioMetadata) {
        this.audioMetadata.samples = this.timecodeMetadata.startTime.toSamples(this.audioMetadata.sampleFrequency);

        this.xmp.setProperty(XMPConst.NS_BWF, "timeReference",
            this.audioMetadata.samples.toString(), XMPConst.STRING);
    }
    if (this.updateThumbnailMetadata()) {
        return true;
    }
    return false;
}

/**
 * Loops through every update entitiy until a matching filename and or mediastart is found and returns matching timecode structure (not object)
 * @param {array} timecodes 
 * @param {boolean} enableMediaStartComparison 
 * @returns {object|undefined} on successfull match returns the matching object in the timecodes array
 */
ThumbnailMetadata.prototype.compareInTimecodeUpdates = function (timecodes, enableMediaStartComparison) {
    for (var i = 0; i < timecodes.length; i++) {
        if (timecodes[i].fileTC
            && timecodes[i].fileTC instanceof Timecode
            && timecodes[i].name
            && timecodes[i].name.toUpperCase() === this.filename.toUpperCase()
            && (enableMediaStartComparison ?
                timecodes[i].fileTC === this.timecodeMetadata.startTime :
                true) &&
            timecodes[i].audioTC instanceof Timecode) {
            return timecodes[i];
        }
    }
    return undefined;
}

/**
 * If an XMPMeta object is attached to a ThumbnailMetadata object it attempts to write the new metadata to the thumbnail.
 * Basically a wrapper.
 * @returns {boolean} true on success
 */
ThumbnailMetadata.prototype.updateThumbnailMetadata = function () {
    if (!(this.xmp instanceof XMPMeta)) {
        return false;
    }

    try {
        if (this.thumb.locked) {
            throw "Thumbnail is locked!";
        }
        this.thumb.synchronousMetadata = new Metadata(this.xmp.serialize(XMPConst.SERIALIZE_OMIT_PACKET_WRAPPER | XMPConst.SERIALIZE_USE_COMPACT_FORMAT));
    } catch (e) {
        alert(e);
        return false;
    }
    return true;
}

/**
 * Checks the thumbnail metadata for matching timecodes. Returns an object if a matching filename is contained within the timecodes array.
 * @param {array} timecodes 
 * @returns {object} containing essential data for reprocessing
 */
ThumbnailMetadata.prototype.checkMatchingStartTimecodes = function (timecodes) {
    var matchedTimecode = this.compareInTimecodeUpdates(timecodes, false); //enableMediaStartComparison has to be disabled, otherwise no errors will be detected

    if (matchedTimecode === undefined) {
        return undefined;
    }

    return {
        filename: this.filename,
        isMatching: matchedTimecode.fileTC === this.timecodeMetadata.startTime,
        fileTC: this.timecodeMetadata.startTime,
        audioTC: matchedTimecode.fileTC
    }
}

/**
 * Validates framerates read from metadata.
 * Returns 0 if the framerate was not a number.
 * @param {number|string} framerate 
 * @returns {number} parsed framerate
 */
ThumbnailMetadata.checkMetadataFramerate = function (framerate) {
    var parsedFramerate = framerate.toString().match(/\d+/g);

    if (parsedFramerate == null || parsedFramerate.length < 1) {
        return 0;
    }
    var newFramerate = Number(parsedFramerate[0]);

    if (newFramerate === 23976) {
        return 23.976;
    }
    if (newFramerate >= 1000) {
        return newFramerate / 100;
    }
    return newFramerate;
}