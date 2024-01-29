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
 * @param {string|array|object} timecode "hh:mm:ss:ff*"| [hh,mm,ss,ff] | {hours: hh, minutes: mm, seconds: ss, frames: ff}
 * @param {number} framerate 
 */
function Timecode(timecode, framerate) {
    this.framerate = Timecode.validateFramerate(framerate);
    // doesn't use total frame to avoid dropframe issues


    if (timecode instanceof Timecode) {
        this.setTimeGroup(timecode);
        this.frames = Timecode.convertFramesBetweenFramerate(timecode.frames, timecode.framerate, framerate);
        this.framerate = framerate;
    } else if (timecode instanceof Array) {
        this.setTimeArray(timecode);
    } else if (timecode instanceof Object) {
        this.setTimeGroup(timecode);
    } else if (typeof timecode === 'number') {
        this.frames = timecode;
    } else if (typeof timecode === 'string') {
        this.setTimeArray(Timecode.splitTimecodeTextToNumber(timecode, framerate));
    }

    this.isDropframe = Timecode.isDropFrame(framerate);
    this.validateTime();
}


/**
 * Set time values for timecode object by a timegroup.
 * @param {object} timeGroup {hours: hh, minutes: mm, seconds: ss, frames: ff}
 * @returns {boolean} true on success
 */
Timecode.prototype.setTimeGroup = function (timeGroup) {
    if (timeGroup == null) {
        timeGroup = {};
    }
    this.hours = timeGroup.hours || 0;
    this.minutes = timeGroup.minutes || 0;
    this.seconds = timeGroup.seconds || 0;
    this.frames = timeGroup.frames || 0;
    return true;
}
/**
 * Sets time values from a 4 wide array.
 * @param {array} timeArray [hh,mm,ss,ff*]
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
    return true;
}
/**
*Process the matched values into numbers and stores it into a new object containing the text and the capture group.
*/
Timecode.prototype.validateTime = function () {
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

    // accounts for time tickover
    if (this.framerate <= 0) {
        this.frames = 0;
    } else {
        this.seconds += Math.floor(this.frames / this.framerate);
        this.frames = Math.floor(this.frames % this.framerate); //clamp
    }

    if (this.frames < 0) { //negative rollover
        this.frames = this.framerate + this.frames;
    }

    this.minutes += Math.floor(this.seconds / 60);
    this.seconds = this.seconds % 60; //clamp

    if (this.seconds < 0) { //negative rollover
        this.seconds = 60 + this.seconds;
    }

    this.hours += Math.floor(this.minutes / 60);
    this.minutes = this.minutes % 60; //clamp

    if (this.minutes < 0) { //negative rollover
        this.minutes = 60 + this.minutes;
    }

    this.hours = this.hours % 24; //clamp

    if (this.hours < 0) { //negative rollover
        this.hours = 24 + this.hours;
    }
}

/**
 * Converts framerate of a timecode object.
 * Returns a new timecode object so original object is not mutated. 
 * @param {number} newFramerate 
 * @returns {Timecode}
 */
Timecode.prototype.convertByFramerate = function (newFramerate) {
    return new Timecode(this, newFramerate);
}
/**
 * Overrides default addition function for Timecodes.
 * Calls add function to add up the values.
 * Returns a new timecode object so original object is not mutated. 
 * @param {string|number|object|Timecode} timecode
 * @returns {Timecode}
 */
Timecode.prototype['+'] = function (timecode) {
    return this.add(timecode);
}
/**
 * Adds timecode values. Creates a new Timecode object with the input.
 * This reuses the tests and vlaidation in the constructor.
 * @param {string|number|object|Timecode} timecode
 * @returns {Timecode}
 */
Timecode.prototype.add = function (timecode) {
    var add = new Timecode(timecode, this.framerate);
    return new Timecode([
        this.hours + add.hours,
        this.minutes + add.minutes,
        this.seconds + add.seconds,
        this.frames + add.frames
    ], this.framerate);
}
/**
 * Overrides default substraction function for Timecodes.
 * Calls add function to add up the values.
 * Returns a new timecode object so original object is not mutated. 
 * @param {string|number|object|Timecode} timecode
 * @returns {Timecode}
 */
Timecode.prototype['-'] = function (timecode) {
    return this.substract(timecode);
}
/**
 * Substracts timecode values. Creates a new Timecode object with the input.
 * This reuses the tests and vlaidation in the constructor.
 * @param {string|number|object|Timecode} timecode
 * @returns {Timecode}
 */
Timecode.prototype.substract = function (timecode) {
    var add = new Timecode(timecode, this.framerate);
    return new Timecode([
        this.hours - add.hours,
        this.minutes - add.minutes,
        this.seconds - add.seconds,
        this.frames - add.frames
    ], this.framerate);
}

/**
 * Exports an array from a timecode object.
 * Returns a new timecode object so original object is not mutated.
 * @returns {array} [hh,mm,ss,ff*]
 */
Timecode.prototype.toArray = function () {
    return [
        this.hours,
        this.minutes,
        this.seconds,
        this.frames
    ];
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
        Timecode.padZero(this.frames, framerateDigits)
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
Timecode.prototype.toFrames = function () {
    return Math.floor(((((this.hours * 60) + this.minutes) * 60) + this.seconds) * this.framerate + this.frames);
}
/**
 * Overrides the general to value function and return total frames
 * @returns {number}
 */
Timecode.prototype.toValue = function () {
    return this.toFrames();
}





/**
 *Processes a time string into separate values and call validateTime to convert the separate values into numbers.
 *@param {string} timeText "hh:mm:ss:ff*"
 *@param {number} framerate
 *@returns {array} array containing time time values 0..hours to 3..frames, empty array on failure
 */
Timecode.splitTimecodeTextToNumber = function (timeText, framerate) {
    if (timeText === undefined) {
        return [];
    }

    //var hmsfPattern = /^([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,})$/g; //strict matching
    var hmsfPattern = /^([\d]+)[:;]([\d]+)[:;]([\d]+)[:;]([\d]+)$/g; // soft matching
    var match = hmsfPattern.exec(timeText);

    if (match != null) {
        match.shift();
    }

    if (match == null) {
        return [];
    }
    return match;
}
/**
 * Updates a timecode object from audio samples.
 *@param {number} samples
 *@param {number} sampleFrequency
 *@param {number} framerate
 *@return {array} array containing time time values 0..hours to 3..frames, empty array on failure
 */
Timecode.createTimecodeFromSamples = function (samples, sampleFrequency, framerate) {
    if (isNaN(Number(samples)) || isNaN(Number(sampleFrequency)) || isNaN(Number(framerate))) {
        return [];
    }
    var sumSeconds = Math.floor(samples / sampleFrequency);
    var sumMinutes = Math.floor(sumSeconds / 60);

    return [
        Math.floor(sumMinutes / 60),
        Math.floor(sumMinutes % 60),
        Math.floor(sumSeconds % 60),
        Math.round(samples % sampleFrequency / sampleFrequency * framerate)
    ];
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
 * Convert frames from one framerate to another.
 * 0 Framerates are ignored. If the previous framerate is 0 and the new one isn't, only the framerate is updated.
 * @param {number} frames 
 * @param {number} previousFramerate 
 * @param {number} newFramerate 
 * @returns {object} return correctes frames and framerate
 */
Timecode.convertFramesBetweenFramerate = function (frames, previousFramerate, newFramerate) {
    newFramerate = Timecode.validateFramerate(newFramerate);
    previousFramerate = Timecode.validateFramerate(previousFramerate);
    frames = Number(frames);

    if (isNaN(frames) || previousFramerate <= 0) {
        return 0;
    }
    return Math.floor(frames / previousFramerate * newFramerate);
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