XMPConst.NS_BWF = "http://ns.adobe.com/bwf/bext/1.0/";
ThumbnailMetadata.PREVIOUS_TIME_VALUE = 'previousTimeValue';
ThumbnailMetadata.DEFAULT_FRAMERATE = 25;


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
ThumbnailMetadata.prototype.toString = function() {
    var text = this.filename + " ";
    if (this.timecodeMetadata) {
        text += `[${this.timecodeMetadata.startTime}@${this.timecodeMetadata.framerate}fps]`
    }
    return text;
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
    if (xmp.doesPropertyExist(XMPConst.NS_DM, "startTimecode")) { //prioritice start over alt timecode entries
        timecodeStruct = "startTimecode";
    } else if (xmp.doesPropertyExist(XMPConst.NS_DM, "altTimecode")) {
        timecodeStruct = "altTimecode";
    }
    var framerate = xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, "timeFormat").value || '';
    framerate = framerate.match(/\d+/g);

    if (framerate == null) {
        framerate = 0;
    } else if (framerate.length) {
        framerate = Number(framerate[0]);
    }

    var startTime = new Timecode(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, "timeValue").value, framerate);
    var prevStartTime = new Timecode(xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.PREVIOUS_TIME_VALUE).value, framerate);
    var isDropFrame = Timecode.isDropFrame(framerate);

    return {
        startTime: startTime,
        prevStartTime: prevStartTime,
        framerate: framerate,
        isDropFrame: isDropFrame
    }
}

