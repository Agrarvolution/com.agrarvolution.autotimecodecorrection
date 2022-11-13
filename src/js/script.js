'use strict';
//Define form names
let sourceId = 'source';
const formIds = {
    target: 'target',
    recursion: 'recursion',
    logging: 'logging',
    mediaStart: 'mediaStart',
    source: 'source',
    fixFramerate: 'framerate',
    fixTarget: 'fix-target',
    fixRecursion: 'fix-recursion'
}
let host = '';

var logging = logging || {};
logging.verboseLogging = false;
const logLevels = {
    critical: "CRIT",
    status: "STAT",
    info: "INFO",
    error: "ERR "
}
let log = null;
let error = null;
let explainer = null;
let fileEl = null;

const settingsKey = "autoTimecodeCorrection.settings";
const defaultSettings = {
    logging: false,
    searchRecursive: true,
    searchTarget: 0,
    source: 1,
    ignoreMediaStart: true,
    xmpFix: {
        framerate: 25,
        searchTarget: 0,
        searchRecursive: 0
    }
}
let settings = defaultSettings;


const csvVersion = {
    ttc116: 'tentacletimecodetool_1.16'
};

let lockForm = false,
    lockFormFix = false;



$(function () {
    onLoaded();

    logging.logArea = $('#loggingArea')[0];
    logging.log = $('#log');
    log = $('#log');
    error = $('#errorDisplay');
    explainer = $('#explainer');
    fileEl = $('#file');

    host = setHostinDOM();
    onAppThemeColorChanged();

    let csInterface = new CSInterface();
    csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
    csInterface.addEventListener("com.adobe.csxs.events.agrarvolution.cepLogging", function (e) {
        logging.addLog(e.data.text, e.data.logLevel);
    });

    //restore settings
    settings = loadSettings();
    changeSettings(settings);

    $('#resetLog').on('click', function (e) {
        logging.clearLog();
    });
    $('#hideLog').on('click', function (e) {
        log.addClass('hidden');
    });

    $('#reset').on("click", function (e) {
        e.preventDefault();
        changeSettings(defaultSettings);
        $('#source')[0].value = "";
        storeSettings(defaultSettings);
        log.addClass('hidden');
        logging.clearLog();
        logging.addLog("Default settings are restored.", logLevels.info);
        explainer.removeClass('hidden');
        error.addClass('hidden');
        this.blur();
    });

    $('input:not(#source, #start)').on("click", function (e) {
        if (this.id !== undefined && this.id === 'logging') {
            logging.verboseLogging = this.checked;
            log.toggleClass('hidden');
        }
        settingHandler();
    });
    $('select').on('change', function (e) {
        settingHandler();
    })

    function settingHandler() {
        if (storeSettings(readSettings())) {
            logging.addLog("Settings successfully stored.", logLevels.info);
        };
    }

    $('#start').on("click", function (e) {
        e.preventDefault();
        if (lockForm) {
            return false;
        }
        lockForm = true;
        let form = document.forms['atc'];

        if (host !== 'kbrg' || settings.source === 1) {
            let validation = validateForm(form);

            if (!validation) {
                logging.addLog('Process canceled. Inputs are invalid.', logLevels.status);
                lockForm = false;
            } else {
                processFile(validation);
            }
        } else {
            timecodeFromMetadata();
        }
    });

    $('#revert').on('click', function (e) {
        e.preventDefault();
        if (lockFormFix || host !== 'kbrg') {
            return false;
        }
        lockForm = true;

        logging.addLog("Revert timecodes to previously stored timecodes.", logLevels.status);
        revertTimecodechanges();
    });

    $('#csv').on('click', function (e) {
        e.preventDefault();
        if (lockFormFix || host !== 'kbrg') {
            return false;
        }
        logging.addLog("Exporting timecodes stored in metadata.", logLevels.status);
        exportCSV();
    });
    $('#update-xmp-timevalue').on('click', function (e) {
        e.preventDefault();
        if (lockFormFix) {
            return false;
        }
        lockFormFix = true;

        fixXMP(false);
    });

    $('#cleanup-xmp').on('click', function (e) {
        e.preventDefault();
        if (lockFormFix) {
            return false;
        }
        lockFormFix = true;

        fixXMP(true);
    });
});
/**
 * Helper function to call host to fix the XMP value - timeFormat.
 */
function fixXMP(type) {
    if (type) {
        logging.addLog("Fixing broken XMP timecode time format.", logLevels.status);
    } else {
        logging.addLog("Update timecode time format.", logLevels.status);
    }

    let csObject = {
        framerate: settings.xmpFix.framerate,
        searchTarget: settings.xmpFix.searchTarget,
        recursive: settings.xmpFix.searchRecursive,
        logging: settings.logging,
        errorOnly: type
    };

    let csInterface = new CSInterface();
    csInterface.evalScript(`$.agrarvolution.timecodeCorrection.fixXmpTimeFormat(${JSON.stringify(csObject)});`, function (e) {
        if (e === 'true') {
            logging.addLog("Time format was repaired.", logLevels.status);
        } else if (e === 'false') {
            logging.addLog("Media hasn't been updated. Process stopped.", logLevels.status);
        }
        lockForm = false;
    });
}

function exportCSV() {
    let csObject = {
        searchTarget: settings.xmpFix.searchTarget,
        recursive: settings.xmpFix.searchRecursive,
        logging: settings.logging
    };

    let csInterface = new CSInterface();
    csInterface.evalScript('$.agrarvolution.timecodeCorrection.gatherTimecodes(' +
        JSON.stringify(csObject) + ');', function (e) {
            if (e === 'false') {
                logging.addLog("Fail to retrieve any timecodes.", logLevels.status);
            } else {
                logging.addLog("Timecodes successfully arrived on the frontend.", logLevels.status);
            }
            lockForm = false;
        });
}
/**
 * Revert timecodechanges.
 * It restores the previous timecode value into the current value. The new value is stored in place of the previous one.
 * This method only keep one history record and can be called infitively.
 */
function revertTimecodechanges() {
    let csObject = {
        searchTarget: settings.xmpFix.searchTarget,
        recursive: settings.xmpFix.searchRecursive,
        logging: settings.logging
    };

    let csInterface = new CSInterface();
    csInterface.evalScript('$.agrarvolution.timecodeCorrection.revertChanges(' +
        JSON.stringify(csObject) + ');', function (e) {
            if (e === 'true') {
                logging.addLog("Timecode changes have been reverted. Old values were stored.", logLevels.status);
            } else if (e === 'false') {
                logging.addLog("Media hasn't been updated. Process stopped.", logLevels.status);
            }
            lockForm = false;
        });
}
/**
 * Alternative way of changing timecode.
 */
function timecodeFromMetadata() {
    let logMessage = '';
    switch (settings.source) {
        case 2:
            logMessage = "Creating timecode from creation time.";
            break;
        case 3:
            logMessage = "Creating timecode from time last changed.";
            break;
        default:
            logging.addLog('Code took wrong path - erroneously in metadata path.', logLevels.error);
            lockForm = false;
            return false;
    }
    logging.addLog(logMessage, logLevels.status);

    let csObject = {
        searchTarget: settings.searchTarget,
        source: settings.source,
        logging: logging.verboseLogging
    };

    csInterface.evalScript('$.agrarvolution.timecodeCorrection.timecodesFromMetadata(' + JSON.stringify(csObject) + ');', function (e) {
        if (e === 'true') {
            logging.addLog("Media has been updated. Process finished. Select the next file to be processed.", logLevels.status);
        } else if (e === 'false') {
            logging.addLog("Media hasn't been updated. Process stopped.", logLevels.status);
        }
        lockForm = false;
    });
}
/**
 * Handler for a fileLoaded event. Calls a csv validation and interfaces with Premiere to send the staged media and settings.
 * @param {*} file parsed csv
 */
function handleFileLoad(file) {
    let timeCodes = [];
    timeCodes = checkCSV(file, csvVersion.ttc116);

    let tcObject = {
        timeCodes: timeCodes,
        searchRecursive: settings.searchRecursive,
        searchTarget: settings.searchTarget,
        ignoreMediaStart: settings.ignoreMediaStart,
        logging: logging.verboseLogging
    };

    logging.addLog("Media to be updated: " + JSON.stringify(timeCodes), logLevels.info);

    let csInterface = new CSInterface();
    csInterface.evalScript('$', function (result) {
        logging.addLog(result, logLevels.info);
    });

    csInterface.evalScript('$.agrarvolution.timecodeCorrection.processInput(' + JSON.stringify(tcObject) + ');', function (e) {
        if (e === 'true') {
            logging.addLog("Media has been updated. Process finished. Select the next file to be processed.", logLevels.status);
            $('#source')[0].value = "";
        } else if (e === 'false') {
            logging.addLog("Media hasn't been updated. Process stopped.", logLevels.status);
        }
        lockForm = false;
    });
    return true;
}

/**
 * Creates a file reader and loads the file and calls a csv-parser. 
 * @param {string} file filepath
 */
function processFile(file) {
    const reader = new FileReader();
    reader.addEventListener('load', (reader) => {
        try {
            handleFileLoad(CSVToArray(reader.target.result));
        } catch {
            logging.addLog("Failed to parse CSV.", logLevels.status);
            return false;
        }
    });
    reader.readAsText(file);
}
/**
 * Validates parsed csv. Creates an array of timecode objects.
 * @param {array} csv 
 * @param {string} version 
 * @returns {boolean|array.{filename: string, framerate: number, duration: object, fileTC: object, audioTC: object}} false on failure
 */
function checkCSV(csv, version) {
    let timeCodes = [];

    if (version === csvVersion.ttc116) {
        //check first row
        if (!(csv[0][0] !== undefined && csv[0][0] === 'File Name' && csv[0][1] !== undefined && csv[0][1] === 'Duration' &&
            csv[0][2] !== undefined && csv[0][2] === 'File TC' && csv[0][3] !== undefined &&
            csv[0][3] === 'Audio TC' && csv[0][4] !== undefined && csv[0][4] === 'Framerate')) {
            logging.addLog("CSV Headers don't match [TTCT_1.16]", logLevels.status);
            return [];
        }

        //check rows + copy data
        for (let i = 1; i < csv.length; i++) {
            let rowResult = checkCSVrow(csv[i], version, i);
            if (rowResult !== false) {
                timeCodes.push(rowResult);
                logging.addLog(rowResult.filename + " - Parsed and staged at " + rowResult.framerate / 100 + " fps. [" +
                    rowResult.fileTC.text + " -> " + rowResult.audioTC.text + "]", logLevels.info);
            }

        }
        return timeCodes;
    } else {
        logging.addLog("CSV version is unsupported.", logLevels.status);
        return [];
    }
}
/**
 * Parse one csv row into a new object.
 * @param {array} row 
 * @param {string} version 
 * @param {number} rowNumber 
 * @returns {boolean|array.{filename: string, framerate: number, duration: object, fileTC: object, audioTC: object}} false on failure
 */
function checkCSVrow(row, version, rowNumber) {
    let tcMediaElement = {};

    if (version === csvVersion.ttc116) {
        for (let i = 0; i < row.length; i++) {
            if (row[i] === undefined) {
                logging.addLog("CSV row " + rowNumber + (row[0] !== undefined ? " (" + row[0] + ")" : '') + " is incomplete.", logLevels.error);
                return false;
            }
        }

        tcMediaElement.filename = row[0];

        //@todo check if no match - check if values are valid in new function

        tcMediaElement.framerate = Number(row[4]) * 100;
        if (Number.isNaN(tcMediaElement.framerate)) {
            logging.addLog(tcMediaElement.filename + " at row " + rowNumber + " - Framerate (" +
                row[4] + ") is invalid.", logLevels.error);
            return false;
        }
        switch (tcMediaElement.framerate) {
            case 2400:
            case 2500:
            case 5000:
            case 2397:
            case 2997:
            case 3000:
            case 5994:
            case 6000:
                break;
            default:
                logging.addLog(tcMediaElement.filename + " at row " + rowNumber + " - Framerate (" +
                    row[4] + ") is unexpected.", logLevels.info);
        }
        tcMediaElement.framerate /= 100;

        let hmsfPattern = /^(?<hours>[\d]{1,2})[:;](?<minutes>[\d]{1,2})[:;](?<seconds>[\d]{1,2})([:;](?<frames>[\d]{1,}))?$/g;

        tcMediaElement.duration = hmsfPattern.exec(row[1]);
        if (!validateTime(tcMediaElement.duration, tcMediaElement.framerate)) {
            logging.addLog(tcMediaElement.filename + " at row " + rowNumber + " - duration (" +
                row[1] + ") is invalid.", logLevels.error);
            return false;
        }
        tcMediaElement.duration = compressMatch(tcMediaElement.duration);
        hmsfPattern.lastIndex = 0;

        tcMediaElement.fileTC = hmsfPattern.exec(row[2]);
        if (!validateTime(tcMediaElement.fileTC, tcMediaElement.framerate, true)) {
            logging.addLog(tcMediaElement.filename + " at row " + rowNumber + " - File TC (" +
                row[2] + ") is invalid.", logLevels.error);
            return false;
        }
        tcMediaElement.fileTC = compressMatch(tcMediaElement.fileTC);
        hmsfPattern.lastIndex = 0;

        tcMediaElement.audioTC = hmsfPattern.exec(row[3]);
        if (!validateTime(tcMediaElement.audioTC, tcMediaElement.framerate)) {
            logging.addLog(tcMediaElement.filename + " at row " + rowNumber + " - Audio TC (" +
                row[3] + ") is invalid.", logLevels.error);
            return false;
        }
        tcMediaElement.audioTC = compressMatch(tcMediaElement.audioTC);

        return tcMediaElement;
    }
}
/**
 * Discards unneeded references from a regex match.
 * @param {object} timeMatched 
 * @returns {{text: string, groups: object}}
 */
function compressMatch(timeMatched) {
    if (timeMatched !== undefined) {
        return {
            text: timeMatched[0],
            groups: timeMatched.groups
        }
    }
}
/**
 * Validates a regex matched time string and converts its part into numbers.
 * @param {object} time 
 * @param {number} framerate 
 * @returns {boolean} true on success
 */
function validateTime(time, framerate) {
    return validateTime(time, framerate, false);
}
function validateTime(time, framerate, blockFrameCheck) {
    if (time === undefined || time == null || time.groups === undefined || time.groups == null) {
        return false;
    }

    time.groups.hours = Number(time.groups.hours);
    time.groups.minutes = Number(time.groups.minutes);
    time.groups.seconds = Number(time.groups.seconds);
    time.groups.frames = Number(time.groups.frames);

    if (time.length < 4 || time.length > 6) {
        return false;
    }

    if (time.groups.hour > 24 || time.groups.minutes > 60 || time.groups.seconds > 60 || (!blockFrameCheck && time.groups.frames !== NaN &&
        time.groups.frames >= framerate)) {
        return false
    }

    return true;
}
/**
 * This will parse a delimited string into an array of arrays. The default delimiter is the comma, but this can be overriden in the second argument.
 * @source https://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm
 * @param {string} strData 
 * @param {string} strDelimiter 
 * @returns {array}
 */
function CSVToArray(strData, strDelimiter) {
    strData = strData.trim();

    strDelimiter = (strDelimiter || ",");

    let objPattern = new RegExp(
        (
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
    );


    let arrData = [[]];
    let arrMatches = null;
    let strMatchedValue = [];
    while (arrMatches = objPattern.exec(strData)) {

        let strMatchedDelimiter = arrMatches[1];

        if (
            strMatchedDelimiter.length &&
            (strMatchedDelimiter != strDelimiter)
        ) {
            arrData.push([]);

        }

        if (arrMatches[2]) {
            strMatchedValue = arrMatches[2].replace(
                new RegExp("\"\"", "g"),
                "\""
            );

        } else {
            strMatchedValue = arrMatches[3];

        }

        arrData[arrData.length - 1].push(strMatchedValue);
    }

    return (arrData);
}

/**
 * Reads settings from the gui.
 * @returns {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}}
 */
function readSettings() {
    let form = document.forms[0];
    let fixForm = document.forms[1];
    let settings = {};

    logging.addLog('Reading settings.', logLevels.info);

    settings.logging = form[formIds.logging].checked;
    settings.searchRecursive = form[formIds.recursion].checked;

    settings.ignoreMediaStart = form[formIds.mediaStart].checked;

    for (let i = 0; i < form[formIds.target].length; i++) {
        if (form[formIds.target][i].checked) {
            settings.searchTarget = i;
        }
    }

    for (let i = 0; i < form[formIds.source].length; i++) {
        if (form[formIds.source][i].checked) {
            settings.source = i;
        }
    }

    settings.xmpFix = {};
    for (let i = 0; i < fixForm[formIds.fixTarget].length; i++) {
        if (fixForm[formIds.fixTarget][i].checked) {
            settings.xmpFix.searchTarget = i;
        }
    }
    settings.xmpFix.searchRecursive = fixForm[formIds.fixRecursion].checked;
    settings.xmpFix.framerate = fixForm[formIds.fixFramerate].value;
    return settings;
}
/**
 * Updates settings in gui.
 * @param {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}} settings 
 */
function changeSettings(settings) {
    try {
        let form = document.forms[0];
        let fixForm = document.forms[1];

        form[formIds.logging].checked = settings.logging || false;

        form[formIds.recursion].checked = settings.searchRecursive || false;
        form[formIds.mediaStart].checked = settings.ignoreMediaStart || false;

        for (let i = 0; i < form[formIds.target].length; i++) {
            form[formIds.target][i].checked = false;
            if (i === settings.searchTarget) {
                form[formIds.target][i].checked = true;
            }
        }

        for (let i = 0; i < form[formIds.source].length; i++) {
            form[formIds.source][i].checked = false;
            if (i === settings.source) {
                form[formIds.source][i].checked = true;
            }
        }

        for (let i = 0; i < fixForm[formIds.fixTarget].length; i++) {
            fixForm[formIds.fixTarget][i].checked = false;
            if (i === (settings?.xmpFix.searchTarget || 0)) {
                fixForm[formIds.fixTarget][i].checked = true;
            }
        }
        fixForm[formIds.fixRecursion].checked = settings?.xmpFix.searchRecursive || false;
        fixForm[formIds.fixFramerate].value = settings?.xmpFix.framerate || 25;


        logging.verboseLogging = settings.logging;
        logging.addLog("Settings successfully updated.", logLevels.info);
    } catch {
        logging.addLog("Failed to update settings.", logLevels.error);
    }
}
/**
 * Stores settings in local storage.
 * @param {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}} newSettings 
 * @returns {boolean} true on success
 */
function storeSettings(newSettings) {
    let settingsTxt = "";
    try {
        settingsTxt = JSON.stringify(newSettings);
    } catch (e) {
        logging.addLog("Failed to create settings string.", logLevels.critical);
        return false;
    }

    settings = newSettings;
    localStorage.setItem(settingsKey, settingsTxt);
    return true;
}
/**
 * Loads gui settings from local storage.
 * @returns {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}}
 */
function loadSettings() {
    let settings = localStorage.getItem(settingsKey);
    if (settings === null) {
        logging.addLog("No settings have been stored.", logLevels.info);
        settings = defaultSettings;
    } else {
        try {
            settings = JSON.parse(settings);
        } catch {
            logging.addLog("Failed to create settings object.", logLevels.critical);
            settings = defaultSettings;
        }
    }
    return settings;
}
/**
 * Validates the source file path.
 * @param {*} form 
 */
function validateForm(form) {
    if (form[0].files.length === 0) {
        logging.addLog('No file has been selected.', logLevels.status);
        return false;
    } else if (form[0].files[0].size === 0) {
        logging.addLog('Selection is not a file.', logLevels.status);
        return false;
    } else if (!(form[0].files[0].type === 'text/csv' || form[0].files[0].type === 'application/vnd.ms-excel')) {
        logging.addLog('File type does not match.', logLevels.info);
    }
    return form[0].files[0];
}


/**
 * Adds a new log message to the log text area.
 * @param {string} text 
 * @param {string} level 
 */
logging.addLog = function (text, level) {
    if (level === logLevels.status) {
        explainer.addClass('hidden');
        error.removeClass('hidden');
        error.text(text);
    }
    if (level === logLevels.error || this.verboseLogging) {
        if (this.log.hasClass('hidden')) {
            this.log.removeClass('hidden');
        }

        this.logArea.value = this.timeStamp() + level + " " + text + "\n" + log.children('#loggingArea')[0].value;
    }

}
/**
 * Clears the log area.
 */
logging.clearLog = function () {
    this.logArea.value = '';
}
/**
 * Creates a new timestamp, which is put in fron of the log messages.
 * @returns {string}
 */
logging.timeStamp = function () {
    let date = new Date();
    return "[" + this.leadingZero(date.getDate()) + "." + this.leadingZero(date.getMonth() + 1) + "." +
        date.getFullYear() + " - " + this.leadingZero(date.getHours()) + ":" + this.leadingZero(date.getMinutes()) +
        ":" + this.leadingZero(date.getSeconds()) + "] ";
}
/**
 * Adds a leading zero to single digit numbers.
 * @param {number} number 
 * @returns {string}
 */
logging.leadingZero = function (number) {
    return number < 10 ? "0" + number : number;
}


/**
 * Retrieves the appSkinInfo.
 * @param {*} event 
 */
function onAppThemeColorChanged() {
    // Should get a latest HostEnvironment object from application.
    let skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
    // Gets the style information such as color info from the skinInfo, 
    // and redraw all UI controls of your extension according to the style info.
    updateThemeWithAppSkinInfo(skinInfo);
}

/**
 * Set host in html as class - e.g. ppro or kbrg
 */
function setHostinDOM() {
    let host = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appId.toLowerCase();
    document.children[0].classList.add(host);

    return host;
}
/**
 * Adds a new css style to the style#dynStyle element. This enables dynamic theme updates according to the 
 * settings in Premiere.
 * @param {*} appSkinInfo 
 */
function updateThemeWithAppSkinInfo(appSkinInfo) {

    //Update the background color of the panel

    let panelBackgroundColor = toHex(appSkinInfo.panelBackgroundColor.color);

    let cssStyle = `:root {
        --dark-color: ${panelBackgroundColor};
        --bright-color: ${lightenDarkenColor(panelBackgroundColor, 150)};
        --highlight-color: ${toHex(appSkinInfo.systemHighlightColor)}; 
        --font-size: ${appSkinInfo.baseFontSize}px;  
    }`;
    $("#dynStyle")[0].textContent = cssStyle;
}

/**
 * Convert the Color object to string in hexadecimal format;
 * @param {{red: string|number, green: string|number, blue: string|number}} color 
 * @param {number} delta 
 * @return {string} color as hex value
 */
function toHex(color, delta) {
    /**
     * Creates a hex value for a given number offset by the delta.
     * @param {number} value 
     * @param {number} delta 
     * @return {string} hex value
     */
    function computeValue(value, delta) {
        var computedValue = !isNaN(delta) ? value + delta : value;
        if (computedValue < 0) {
            computedValue = 0;
        } else if (computedValue > 255) {
            computedValue = 255;
        }

        computedValue = Math.round(computedValue).toString(16);
        return computedValue.length == 1 ? "0" + computedValue : computedValue;
    }

    var hex = "";
    if (color) {
        hex = computeValue(color.red, delta) + computeValue(color.green, delta) + computeValue(color.blue, delta);
    }
    return "#" + hex;
}
/**
 * Lightens and darkens colors in hex format.
 * @author Chris Coyier
 * @source https://css-tricks.com/snippets/javascript/lighten-darken-color/
 * @param {string} col 
 * @param {number} amt
 * @return {string} color as hex string 
 */
function lightenDarkenColor(col, amt) {

    var usePound = false;

    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }

    var num = parseInt(col, 16);

    var r = (num >> 16) + amt;

    if (r > 255) r = 255;
    else if (r < 0) r = 0;

    var b = ((num >> 8) & 0x00FF) + amt;

    if (b > 255) b = 255;
    else if (b < 0) b = 0;

    var g = (num & 0x0000FF) + amt;

    if (g > 255) g = 255;
    else if (g < 0) g = 0;

    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);

}
