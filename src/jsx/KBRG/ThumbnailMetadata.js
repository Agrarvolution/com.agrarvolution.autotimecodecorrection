XMPConst.NS_BWF = "http://ns.adobe.com/bwf/bext/1.0/";
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
 * Generates a shortened version of the Thumbnail metadata. For this use case only this.timecodeMetadata.startTime is really relevant.
 * @returns {string}
 */
ThumbnailMetadata.prototype.toString = function () {
    var text = this.filename + " ";
    if (this.timecodeMetadata) {
        text += `[${this.timecodeMetadata.startTime}@${this.timecodeMetadata.framerate}fps]`
    }
    return text;
}

/**
 * Checks ThumbnailMetadata object is it contains any invalid framerate or timecode structure.
 * It will than update the object with the targetFramerate.
 * @param {number} targetFramerate check if input object contains targetFramerate 
 * @param {boolean} errorOnly 
 * @returns {boolean} true on success
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

    if (hasError || !errorOnly) { // @Todo Check if this works as intended
        return false;
    }

    this.timecodeMetadata.framerate = targetFramerate;

    return this.updateTimecodeMetadata(this.timecodeMetadata.startTime.convertByFramerate(this.timecodeMetadata.framerate));
}

/**
 * Reverts to the previously stored timecode.
 * @returns {boolean} true on success
 */
ThumbnailMetadata.prototype.revertTimecodeChange = function () {
    if (this.timecodeMetadata.prevStartTime.toValue() === 0 && this.timecodeMetadata.prevFramerate === 0) {
        return false;
    }
    return this.updateTimecodeMetadata(this.timecodeMetadata.prevStartTime);
}

/**
 * Update start time of thumbnail by creation date or time of last modification. 
 * @param {number} targetFramerate 
 * @param {boolean} overrideFramerate
 * @param {number} metadataSelector 
 * @returns {boolean} true on success
 */
ThumbnailMetadata.prototype.updateFromMetadataDate = function (targetFramerate, overrideFramerate, metadataSelector) {
    var dateUpdate = {};
    targetFramerate = Number(targetFramerate || '');

    if (isNaN(targetFramerate)) {
        return false;
    }
    if (this.timecodeMetadata.framerate <= 0 || overrideFramerate) { //add for files with missing time values
        this.timecodeMetadata.framerate = targetFramerate;
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

    return this.updateTimecodeMetadata(new Timecode(dateUpdate, this.timecodeMetadata.framerate));
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
        ThumbnailMetadata.PREVIOUS_TIME_FORMAT, this.timecodeMetadata.prevStartTime.toString());

    if (this.audioMetadata) {
        this.xmp.setProperty(XMPConst.NS_BWF, "timeReference",
            this.timecodeMetadata.startTime.toSamples(this.audioMetadata.sampleFrequency).toString(), XMPConst.STRING);
    }
    if (this.updateThumbnailMetadata()) {
        return true;
    }
    return false;
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
 * Extracts relevant audio metadata from a thumbnail's metadata.
 * @param {XMPMetaInstance} xmp XMP object - see XMP specification 
 * @returns {object} containing ending, samples, sample frequency and bitrate
 */
ThumbnailMetadata.extractAudioMetadata = function (xmp) {
    var audioEncoding = xmp.getProperty(XMPConst.NS_BWF, "codingHistory").value || '';

    var sampleFrequency = audioEncoding.match(/F=\d+/g);
    if (sampleFrequency == null || sampleFrequency.length) {
        sampleFrequency = 0;
    } else {
        sampleFrequency = Number(sampleFrequency[0].replace('F=', ''));
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
    var framerate = this.checkMetadataFramerate(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.TIME_FORMAT).value || '');
    var startTime = new Timecode(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.TIME_VALUE).value, framerate);

    var prevFramerate = this.checkMetadataFramerate(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.PREVIOUS_TIME_FORMAT).value || '');
    var prevStartTime = new Timecode(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.PREVIOUS_TIME_VALUE).value, prevFramerate);
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
 * Validates framerates read from metadata.
 * Returns 0 if the framerate was not a number.
 * @param {string} framerate 
 * @returns {number} parsed framerate
 */
ThumbnailMetadata.checkMetadataFramerate = function (framerate) {
    var parsedFramerate = framerate.match(/\d+/g);

    if (parsedFramerate && parsedFramerate.length) {
        return Number(parsedFramerate[0]);
    }
    return 0;
}
