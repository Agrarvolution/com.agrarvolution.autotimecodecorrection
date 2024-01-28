XMPConst.NS_BWF = "http://ns.adobe.com/bwf/bext/1.0/";
ThumbnailMetadata.previousTimeValue = 'previousTimeValue';
ThumbnailMetadata.DROP_FRAME_TIMECODES = {
    //"23976": 23.976,
    "2997": 29.97,
    "5994": 59.94,
    "11988": 119.88
};
ThumbnailMetadata.DROP_FRAME_TIMECODE_KEYS = [
    /*23976,*/
    2997, 5994, 11988
];
ThumbnailMetadata.ZERO_TIMECODE = "00:00:00:00";


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

    if (this.timecodeMetadata.startTime === undefined && this.audioMetadata) {
        this.timecodeMetadata.startTime = ThumbnailMetadata.samplesToTime(
            this.audioMetadata.samples,
            this.audioMetadata.sampleFrequency,
            25,
            false
        );
    }
    if (this.timecodeMetadata.startTime === undefined) {
        this.timecodeMetadata.startTime = ThumbnailMetadata.ZERO_TIMECODE;
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

    var startTime = xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, "timeValue").value || '';
    var prevStartTime = xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, this.previousTimeValue).value || '';

    var framerate = xmp.getStructField(XMPConst.NS_DM, timecodeStruct, XMPConst.NS_DM, "timeFormat").value || '';
    framerate = framerate.match(/\d+/g);

    if (framerate == null) {
        framerate = 0;
    } else if (framerate.length) {
        framerate = Number(framerate[0]);
    }
    var isDropFrame = this.isDropFrame(framerate);



    return {
        startTime: startTime,
        prevStartTime: prevStartTime,
        framerate: framerate,
        isDropFrame: isDropFrame
    }
}


//--------- Utils

/**
* Checks whether a given framerate is a known dropframe framerate.
* @param {number} framerate
* @returns {boolean}
*/
ThumbnailMetadata.isDropFrame = function (framerate) {
    if (isNaN(Number(framerate))) {
        return false;
    }

    for (var i = 0; i < this.DROP_FRAME_TIMECODE_KEYS.length; i++) {
        if (this.DROP_FRAME_TIMECODE_KEYS[i] === framerate) {
            return true;
        }
    }
    return false;
}
/**
 *Convert samples into a timecode string.
 *@param {number} samples
 *@param {number} sampleFrequency
 *@param {number} framerate
 *@param {boolean} isDropFrame
 *@return {string} 00:00:00:00 or 00;00;00;00
 */
ThumbnailMetadata.samplesToTime = function (samples, sampleFrequency, framerate, isDropFrame) {
    var sumSeconds = Math.floor(samples / sampleFrequency);
    var sumMinutes = Math.floor(sumSeconds / 60);

    var timecode = [
        Agrarvolution.padZero(Math.floor(sumMinutes / 60), 2),
        Agrarvolution.padZero(Math.floor(sumMinutes % 60), 2),
        Agrarvolution.padZero(Math.floor(sumSeconds % 60), 2),
        Agrarvolution.padZero(Math.round(samples % sampleFrequency / sampleFrequency * framerate), 2)
    ];

    var delimiter = isDropFrame ? ';' : ':';
    return timecode.join(delimiter);
}
/**
 *Processes a time string into separate values and call validateTime to convert the separate values into numbers.
 *@param {string} timeText "hh:mm:ss:ff*"
 *@param {number} framerate
 *@returns {boolean|object} false on failure | matched group on success
 */
ThumbnailMetadata.splitTimeToNumber = function (timeText, framerate) {
    if (timeText === undefined) {
        return false;
    }

    var hmsfPattern = /^([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,})$/g;
    var match = hmsfPattern.exec(timeText);
    match = validateTime(match, framerate);
    if (!match) {
        return false;
    }
    return match;

    /**
     *Process the matched values into numbers and stores it into a new object containing the text and the capture group.
     *@param {array} time "hh:mm:ss:ff*"
     *@param {number} framerate
     *@returns {boolean|object} false on failure | matched group on success
    */
    function validateTime(time, framerate) {
        if (time === undefined || time == null) {
            return false;
        }
        var groups = {};
        groups.hours = Number(time[1]);
        groups.minutes = Number(time[2]);
        groups.seconds = Number(time[3]);
        groups.frames = Number(time[4]);


        if (groups.hour > 24 && groups.minutes > 60 && groups.seconds > 60 &&
            !isNaN(groups.frames) && groups.frames > framerate) {
            return false
        }

        return {
            text: time[0],
            groups: groups,
        };
    }
}
