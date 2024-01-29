Timecode.ZERO_TIMECODE = "00:00:00:00";
Timecode.DROP_FRAME_TIMECODES = {
    //"23976": 23.976,
    "2997": 29.97,
    "5994": 59.94,
    "11988": 119.88
};
Timecode.DROP_FRAME_TIMECODE_KEYS = [
    /*23976,*/
    29.97, 59.94, 119.88
];

/**
 * Creates a timecode object from a timecode string.
 * @param {string} text "hh:mm:ss:ff*"
 * @param {number} framerate 
 */
function Timecode(text, framerate) {
    this.framerate = Timecode.validateFramerate(framerate);
    this.isDropframe = Timecode.isDropFrame(framerate);
    // doesn't use total frame to avoid dropframe issues

    this.setTimeArray(Timecode.splitTimecodeTextToNumber(text, framerate));
    this.validateTime();
}

/**
 * Overrides standard toString() method of objects.
 * @returns {string} timecode as hh:mm:ss:ff* (or ; on dropframe)
 */
Timecode.prototype.toString = function () {
    var delimiter = this.isDropframe ? ';' : ':';
    var framerateDigits = Math.floor(this.framerate).toString().length;

    return Timecode.padZero(this.hours, 2) + delimiter +
        Timecode.padZero(this.minutes, 2) + delimiter +
        Timecode.padZero(this.seconds, 2) + delimiter +
        Timecode.padZero(this.frames,framerateDigits)
}

/**
 * Timecode is converted into samples.
 * @param {number} sampleFrequency
 * @return {number} samples
 */
Timecode.prototype.toSamples = function (sampleFrequency) {
    if (isNaN(Number(sampleFrequency))) {
        return 0;
    }
    return (this.toFrames() / this.framerate) * sampleFrequency;
}

/**
 * Creates total frame count from timecode object.
 * @returns {number} total frames
 */
Timecode.prototype.toFrames = function()  {
    return Math.floor(((((this.hours * 60) + this.minutes) * 60) + this.seconds) * this.framerate + this.frames);
}

/**
 * Updates a timecode object from audio samples.
 *@param {number} samples
 *@param {number} sampleFrequency
 *@param {number} framerate
 *@return {boolean} 
 */
Timecode.prototype.updateFromSamples = function (samples, sampleFrequency, framerate) {
    if (isNaN(Number(samples)) || isNaN(Number(sampleFrequency))) {
        return false;
    }

    this.framerate = Timecode.validateFramerate(framerate);
    this.isDropframe = Timecode.isDropFrame(framerate);

    var sumSeconds = Math.floor(samples / sampleFrequency);
    var sumMinutes = Math.floor(sumSeconds / 60);

    var times = [
        Math.floor(sumMinutes / 60),
        Math.floor(sumMinutes % 60),
        Math.floor(sumSeconds % 60),
        Math.round(samples % sampleFrequency / sampleFrequency * framerate)
    ];
    this.setTimeArray(times);
    this.validateTime();
    return true;
}

/**
 * Set time values for timecode object by a timegroup.
 * @param {object} timeGroup 
 */
Timecode.prototype.setTimeGroup = function (timeGroup) {
    this.hours = timeGroup.hours || 0;
    this.minutes = timeGroup.minutes || 0;
    this.seconds = timeGroup.seconds || 0;
    this.frames = timeGroup.frames || 0;
}
/**
 * Sets time values from a 4 wide array.
 * @param {array} timeArray 
 * @returns {boolean} true on success
 */
Timecode.prototype.setTimeArray = function (timeArray) {
    if (timeArray == null || !timeArray.length || timeArray.length !== 4) {
        return false;
    }
    this.hours = Number(timeArray[0]);
    this.minutes = Number(timeArray[1]);
    this.seconds = Number(timeArray[2]);
    this.frames = Number(timeArray[3]);

    if (isNaN(this.hours)) {
        this.hours = 0;
    }
    if (isNaN(this.minutes)) {
        this.minutes = 0;
    }
    if (isNaN(this.seconds)) {
        this.seconds = 0;
    }
    if (isNaN(this.frames)) {
        this.frames = 0;
    }
    return true;
}
/**
*Process the matched values into numbers and stores it into a new object containing the text and the capture group.
*@returns {boolean|object} false on failure | matched group on success
*/
Timecode.prototype.validateTime = function () {
    // accounts for time tickover
    if (this.frames > this.framerate) {
        this.seconds += Math.floor(this.frames / this.framerate);
        this.frames = Math.floor(this.frames % this.framerate);
    }
    if (this.seconds > 60) {
        this.minutes += Math.floor(this.seconds / 60);
        this.seconds = this.seconds % 60;
    }
    if (this.minutes > 60) {
        this.hours += Math.floor(this.minutes / 60);
        this.minutes = this.minutes % 60;
    }
    if (this.hours > 24) {
        this.hours = this.hours % 24;
    }
}
/**
 *Processes a time string into separate values and call validateTime to convert the separate values into numbers.
 *@param {string} timeText "hh:mm:ss:ff*"
 *@param {number} framerate
 *@returns {boolean|object} false on failure | matched group on success
 */
Timecode.splitTimecodeTextToNumber = function (timeText, framerate) {
    if (timeText === undefined) {
        return false;
    }

    //var hmsfPattern = /^([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,})$/g; //strict matching
    var hmsfPattern = /^([\d]+)[:;]([\d]+)[:;]([\d]+)[:;]([\d]+)$/g; // soft matching
    var match = hmsfPattern.exec(timeText);

    if (match != null) {
        match.shift();
    }
    
    if (match == null) {
        return false;
    }
    return match;
}

/**
 * Validate framerate replaces invalid inputs with 0.
 * @param {number} framerate 
 * @returns 
 */
Timecode.validateFramerate = function (framerate) {
    framerate = Number(framerate);
    if (isNaN(framerate)) {
        framerate = 0;
    }
    return framerate;
}

/**
* Checks whether a given framerate is a known dropframe framerate.
* @param {number} framerate
* @returns {boolean}
*/
Timecode.isDropFrame = function (framerate) {
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
 * Pad numbers with leading zeros.
 * @param {number} number
 * @param {number} size
 * @return {string} number with padded zeros
 */
Timecode.padZero = function (number, size) {
    var stringNumber = number.toString();
    while (stringNumber.length < size) {
        stringNumber = '0' + stringNumber;
    }
    return stringNumber;
}