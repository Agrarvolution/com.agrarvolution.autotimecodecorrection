'use strict';
//Define form names
const sourceId = 'source';
const formIds = {
    target: 'target',
    recursion: 'recursion',
    logging: 'logging',
    mediaStart: 'mediaStart',
    source: 'source',
}
const SELECTION = {
    all: 0,
    selection: 1
}

const TIMECODE_SOURCE = {
    file: 1,
    created: 2,
    lastChanged: 3
};

let host = '';

const logger = new Logger();

let fileEl = null;
let csvLink = null;

const settingsKey = "autoTimecodeCorrection.settings";
const defaultSettings = {
    logging: false,
    searchRecursive: true,
    searchTarget: SELECTION.all,
    source: TIMECODE_SOURCE.file,
    ignoreMediaStart: true,
}
let settings = defaultSettings;


const csvVersion = {
    ttc116: 'tentacletimecodetool_1.16'
};

let lockForm = false,
    lockFormFix = false;



$(function () {
    onLoaded();
    logger.init($('#log'), $('#loggingArea')[0], $('#explainer'), $('#errorDisplay'));

    fileEl = $('#file');
    csvLink = $('#csvDownload');

    host = setHostinDOM();
    onAppThemeColorChanged();

    const csInterface = new CSInterface();
    csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
    csInterface.addEventListener("com.adobe.csxs.events.agrarvolution.cepLogging", function (e) {
        logger.addLog(e.data.text, e.data.logLevel);
    });
    csInterface.requestOpenExtension("com.agrarvolution.autoTimecodeCorrection.server", "");
    //localServer = cep_node.require(__dirname + '/server/main.js')();

    //restore settings
    settings = loadSettings();
    changeSettings(settings);

    $('#resetLog').on('click', function (e) {
        logger.clearLog();
    });
    $('#hideLog').on('click', function (e) {
        $('#logging').prop('checked', false);
        settingHandler();
        logger.hideLog();
    });

    $('#reset').on("click", function (e) {
        e.preventDefault();
        changeSettings(defaultSettings);
        $('#source')[0].value = "";
        storeSettings(defaultSettings);
        logger.clearLog();
        logger.addLog("Default settings are restored.", Logger.LOG_LEVELS.info);
        this.blur();
    });

    $('input:not(#source, #start)').on("click", function (e) {
        if (this.id !== undefined && this.id === 'logging') {
            logger.verboseLogging = this.checked;
            logger.toggleLog('hidden');
        }
        settingHandler();
    });
    $('select').on('change', function (e) {
        settingHandler();
    })

    function settingHandler() {
        if (storeSettings(readSettings())) {
            logger.addLog("Settings successfully stored.", Logger.LOG_LEVELS.info);
        };
    }

    $('#start').on("click", function (e) {
        e.preventDefault();
        if (lockForm) {
            return false;
        }
        lockForm = true;
        let form = document.forms['atc'];

        if (host !== 'kbrg' || settings.source === TIMECODE_SOURCE.file) {
            let validation = validateForm(form);

            if (!validation) {
                logger.addLog('Process canceled. Inputs are invalid.', Logger.LOG_LEVELS.status);
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

        logger.addLog("Revert timecodes to previously stored timecodes.", Logger.LOG_LEVELS.status);
        revertTimecodechanges();
    });

    $('#csv').on('click', function (e) {
        e.preventDefault();
        if (lockFormFix || host !== 'kbrg') {
            return false;
        }
        logger.addLog("Exporting timecodes stored in metadata.", Logger.LOG_LEVELS.status);
        exportCSV();
    });
});

/**
 * Helper function to gather relevant metadata of the selected files and stores them in a .csv file similar to a tentacle sync timecode tool output.
 */
function exportCSV() {
    const csObject = {
        searchTarget: settings.searchTarget,
        recursive: settings.searchRecursive,
        logging: settings.logging
    };

    const csInterface = new CSInterface();
    csInterface.evalScript('$.agrarvolution.timecodeCorrection.gatherTimecodes(' +
        JSON.stringify(csObject) + ');', async function (e) {
            logger.addLog("Timecodes arrived in frontend.", Logger.LOG_LEVELS.status);
            try {
                e = JSON.parse(e);
                if (e.csv === undefined || e.path === undefined) {
                    e === 'false';
                }

                if (e === 'false') {
                    logger.addLog("Fail to retrieve any timecodes.", Logger.LOG_LEVELS.status);
                } else {


                    let writeResult = window.cep.fs.writeFile(e.path + "\\timecode.csv", e.csv)
                    if (writeResult.err === 0) {
                        logger.addLog("Saving metadata is finished.", Logger.LOG_LEVELS.status);

                    } else {
                        console.log(writeResult);
                        logger.addLog("Failed to save timecode csv.", Logger.LOG_LEVELS.status);
                    }

                }
            } catch (e) {
                logger.addLog("Error parsing file metadata.", Logger.LOG_LEVELS.status);
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
    const csObject = {
        searchTarget: settings.searchTarget,
        recursive: settings.searchRecursive,
        logging: settings.logging
    };

    const csInterface = new CSInterface();
    csInterface.evalScript('$.agrarvolution.timecodeCorrection.revertChanges(' +
        JSON.stringify(csObject) + ');', function (e) {
            if (e === 'true') {
                logger.addLog("Timecode changes have been reverted. Old values were stored.", Logger.LOG_LEVELS.status);
            } else if (e === 'false') {
                logger.addLog("Media hasn't been updated. Process stopped.", Logger.LOG_LEVELS.status);
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
        case TIMECODE_SOURCE.created:
            logMessage = "Creating timecode from creation time.";
            break;
        case TIMECODE_SOURCE.lastChanged:
            logMessage = "Creating timecode from time last changed.";
            break;
        default:
            logger.addLog('Code took wrong path - erroneously in metadata path.', Logger.LOG_LEVELS.error);
            lockForm = false;
            return false;
    }
    logger.addLog(logMessage, Logger.LOG_LEVELS.status);

    let csObject = {
        searchTarget: settings.searchTarget,
        source: settings.source,
        logging: logger.verboseLogging
    };

    let csInterface = new CSInterface();
    csInterface.evalScript('$.agrarvolution.timecodeCorrection.timecodesFromMetadata(' + JSON.stringify(csObject) + ');', function (e) {
        if (e === 'true') {
            logger.addLog("Media has been updated. Process finished. Select the next file to be processed.", Logger.LOG_LEVELS.status);
        } else if (e === 'false') {
            logger.addLog("Media hasn't been updated. Process stopped.", Logger.LOG_LEVELS.status);
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

    try {
        timeCodes = checkCSV(file, csvVersion.ttc116);
    } catch (e) {
        logger.addLog(e, Logger.LOG_LEVELS.error);
        lockForm = false;
        return false;
    }


    let tcObject = {
        timeCodes: timeCodes,
        searchRecursive: settings.searchRecursive,
        searchTarget: settings.searchTarget,
        ignoreMediaStart: settings.ignoreMediaStart,
        logging: logger.verboseLogging
    };

    logger.addLog("Media to be updated: " + JSON.stringify(timeCodes), Logger.LOG_LEVELS.info);

    let csInterface = new CSInterface();
    csInterface.evalScript('$', function (result) {
        logger.addLog(result, Logger.LOG_LEVELS.info);
    });

    csInterface.evalScript('$.agrarvolution.timecodeCorrection.processInput(' + JSON.stringify(tcObject) + ');', function (e) {
        if (e === 'true') {
            logger.addLog("Media has been updated. Process finished. Select the next file to be processed.", Logger.LOG_LEVELS.status);
            $('#source')[0].value = "";
        } else if (e === 'false') {
            logger.addLog("Media hasn't been updated. Process stopped.", Logger.LOG_LEVELS.status);
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
            logger.addLog("Failed to parse CSV.", Logger.LOG_LEVELS.status);
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
            logger.addLog("CSV Headers don't match [TTCT_1.16]", Logger.LOG_LEVELS.status);
            throw new Error("No valid csv. Check csv headers!");
        }

        //check rows + copy data
        for (let i = 1; i < csv.length; i++) {
            let rowResult = checkCSVrow(csv[i], version, i);
            if (rowResult !== false) {
                timeCodes.push(rowResult);
                logger.addLog(rowResult.filename + " - Parsed and staged at " + rowResult.framerate + " fps. [" +
                    rowResult.fileTC.text + " -> " + rowResult.audioTC.text + "]", Logger.LOG_LEVELS.info);
            }

        }
        return timeCodes;
    } else {
        logger.addLog("CSV version is unsupported.", Logger.LOG_LEVELS.status);
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
                logger.addLog("CSV row " + rowNumber + (row[0] !== undefined ? " (" + row[0] + ")" : '') + " is incomplete.", Logger.LOG_LEVELS.error);
                return false;
            }
        }

        tcMediaElement.filename = row[0];

        //@todo check if no match - check if values are valid in new function

        tcMediaElement.framerate = Number(row[4]) * 100;
        if (Number.isNaN(tcMediaElement.framerate)) {
            logger.addLog(tcMediaElement.filename + " at row " + rowNumber + " - Framerate (" +
                row[4] + ") is invalid.", Logger.LOG_LEVELS.error);
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
                logger.addLog(tcMediaElement.filename + " at row " + rowNumber + " - Framerate (" +
                    row[4] + ") is unexpected.", Logger.LOG_LEVELS.info);
        }
        tcMediaElement.framerate /= 100;

        let hmsfPattern = /^(?<hours>[\d]{1,2})[:;](?<minutes>[\d]{1,2})[:;](?<seconds>[\d]{1,2})([:;](?<frames>[\d]{1,}))?$/g;

        tcMediaElement.duration = hmsfPattern.exec(row[1]);
        if (!validateTime(tcMediaElement.duration, tcMediaElement.framerate)) {
            logger.addLog(tcMediaElement.filename + " at row " + rowNumber + " - duration (" +
                row[1] + ") is invalid.", Logger.LOG_LEVELS.error);
            return false;
        }
        tcMediaElement.duration = compressMatch(tcMediaElement.duration);
        hmsfPattern.lastIndex = 0;

        tcMediaElement.fileTC = hmsfPattern.exec(row[2]);
        if (!validateTime(tcMediaElement.fileTC, tcMediaElement.framerate, true)) {
            logger.addLog(tcMediaElement.filename + " at row " + rowNumber + " - File TC (" +
                row[2] + ") is invalid.", Logger.LOG_LEVELS.error);
            return false;
        }
        tcMediaElement.fileTC = compressMatch(tcMediaElement.fileTC);
        hmsfPattern.lastIndex = 0;

        tcMediaElement.audioTC = hmsfPattern.exec(row[3]);
        if (!validateTime(tcMediaElement.audioTC, tcMediaElement.framerate)) {
            logger.addLog(tcMediaElement.filename + " at row " + rowNumber + " - Audio TC (" +
                row[3] + ") is invalid.", Logger.LOG_LEVELS.error);
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
    let settings = {};

    logger.addLog('Reading settings.', Logger.LOG_LEVELS.info);

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
    return settings;
}
/**
 * Updates settings in gui.
 * @param {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}} settings 
 */
function changeSettings(settings) {
    // try {
    let form = document.forms[0];

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

    logger.verboseLogging = settings.logging;
    logger.addLog("Settings successfully updated.", Logger.LOG_LEVELS.info);
    // } catch {
    //     logger.addLog("Failed to update settings.", Logger.LOG_LEVELS.error);
    // }
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
        logger.addLog("Failed to create settings string.", Logger.LOG_LEVELS.critical);
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
        logger.addLog("No settings have been stored.", Logger.LOG_LEVELS.info);
        settings = defaultSettings;
    } else {
        try {
            settings = JSON.parse(settings);
        } catch {
            logger.addLog("Failed to create settings object.", Logger.LOG_LEVELS.critical);
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
        logger.addLog('No file has been selected.', Logger.LOG_LEVELS.status);
        return false;
    } else if (form[0].files[0].size === 0) {
        logger.addLog('Selection is not a file.', Logger.LOG_LEVELS.status);
        return false;
    } else if (!(form[0].files[0].type === 'text/csv' || form[0].files[0].type === 'application/vnd.ms-excel')) {
        logger.addLog('File type does not match.', Logger.LOG_LEVELS.info);
    }
    return form[0].files[0];
}