'use strict';
//Define form names
const sourceId = 'source';
const formIds = {
    target: 'target',
    recursion: 'recursion',
    logging: 'logging',
    mediaStart: 'mediaStart',
    source: 'source',
    framerate: 'framerate',
    overrideFramerate: 'overrideFramerate'
}

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
    framerate: 25,
    overrideFramerate: false
}
const csvColumnNumbers = {
    fileName: 0,
    duration: 1,
    fileTimecode: 2,
    audioTimecode: 3,
    framerate: 4
};
const csvColumnNames = [
    "File Name", "Duration", "File TC", "Audio TC", "Framerate"
]
let settings = defaultSettings;


const csvVersion = {
    ttc116: 'tentacletimecodetool_1.16'
};

let lockForm = false;
let failedUpdateCache = [];

$(function () {
    onLoaded();
    logger.init($('#log'), $('#loggingArea')[0], $('#explainer'), $('#errorDisplay'));

    fileEl = $('#file');
    csvLink = $('#csvDownload');

    host = setHostinDOM();
    onAppThemeColorChanged();

    const csInterface = new CSInterface();
    csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
    csInterface.addEventListener("com.adobe.csxs.events.agrarvolution.timecodeCorrectionLog", e => {
        logger.addLog(e.data.text, e.data.logLevel);
    });
    csInterface.requestOpenExtension("com.agrarvolution.autoTimecodeCorrection.server", "");
    //localServer = cep_node.require(__dirname + '/server/main.js')();

    //restore settings
    settings = loadSettings();
    changeSettings(settings);

    $('#resetLog').on('click', e => {
        logger.clearLog();
    });
    $('#hideLog').on('click', e => {
        $('#logging').prop('checked', false);
        settingHandler();
        logger.hideLog();
    });

    $('#reset').on("click", e => {
        e.preventDefault();
        changeSettings(defaultSettings);
        $('#source')[0].value = "";
        storeSettings(defaultSettings);
        logger.clearLog();
        logger.addLog("Default settings are restored.", Logger.LOG_LEVELS.info);
        this.blur();
    });

    $('input:not(#source, #start)').on("click", e => {
        if (this.id !== undefined && this.id === 'logging') {
            logger.verboseLogging = this.checked;
            logger.toggleLog('hidden');
        }
        settingHandler();
    });
    $('select').on('change', e => {
        settingHandler();
    })

    function settingHandler() {
        if (storeSettings(readSettings())) {
            updateSourceInterface();
            logger.addLog("Settings successfully stored.", Logger.LOG_LEVELS.info);
        };
    }

    $('#start').on("click", e => {
        e.preventDefault();
        if (lockForm) {
            return false;
        }
        lockForm = true;

        if (host !== 'kbrg' || settings.source === TIMECODE_SOURCE.file) {
            let validation = validateFile();

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

    $('#revert').on('click', e => {
        e.preventDefault();
        if (lockForm || host !== 'kbrg') {
            return false;
        }
        lockForm = true;

        logger.addLog("Revert timecodes to previously stored timecodes.", Logger.LOG_LEVELS.status);
        revertTimecodechanges();
    });

    $('#csv').on('click', e => {
        e.preventDefault();
        if (lockForm || host !== 'kbrg') {
            return false;
        }
        logger.addLog("Exporting timecodes stored in metadata.", Logger.LOG_LEVELS.status);
        exportCSV();
    });

    $('#backToMain').on('click', e => {
        $('#statusSection').addClass('hidden');
        $('#process').removeClass('hidden'); 
    });

    $('#retryFailedUpdates').on('click', e => {      
        if (failedUpdateCache.length > 0 ) {
            logger.addLog('Retrying files that failed to update metadata.', Logger.LOG_LEVELS.status);
            timecodeFromArray(failedUpdateCache);
        }
        $('#backToMain').click();
        return true;
    });
});

/**
 * Helper function to gather relevant metadata of the selected files and stores them in a .csv file similar to a tentacle sync timecode tool output.
 */
function exportCSV() {
    const csObject = {
        searchTarget: settings.searchTarget,
        recursive: settings.searchRecursive,
        logTarget: CEP_PANEL.correction,
        logging: settings.logging
    };

    const csInterface = new CSInterface();
    csInterface.evalScript('$.Agrarvolution.timecodeCorrection.exportTimecodeData(' +
        JSON.stringify(csObject) + ');', async e => {
            logger.addLog("Timecodes arrived in frontend.", Logger.LOG_LEVELS.status);
            try {
                e = JSON.parse(e);
                if (e.csv === undefined || e.path === undefined) {
                    logger.addLog("Fail to retrieve any timecodes.", Logger.LOG_LEVELS.status);
                    return false;
                }

                const writeResult = window.cep.fs.writeFile(e.path + "\\timecode.csv", e.csv)
                if (writeResult.err === 0) {
                    logger.addLog("Saving metadata is finished.", Logger.LOG_LEVELS.status);

                } else {
                    console.log(writeResult);
                    logger.addLog("Failed to save timecode csv.", Logger.LOG_LEVELS.status);
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
        method: PROCESS_METHODS.revertTimeCode,
        logTarget: CEP_PANEL.correction,
        logging: settings.logging
    };

    const csInterface = new CSInterface();
    csInterface.evalScript('$.Agrarvolution.timecodeCorrection.processCEPInput(' +
        JSON.stringify(csObject) + ');', e => {
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
    let method = '';

    switch (settings.source) {
        case TIMECODE_SOURCE.created:
            method = PROCESS_METHODS.fromCreated;
            logMessage = "Creating timecode from creation time.";
            break;
        case TIMECODE_SOURCE.lastChanged:
            method = PROCESS_METHODS.fromLastChange;
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
        method: method,
        logging: logger.verboseLogging,
        logTarget: CEP_PANEL.correction,
        framerate: settings.framerate,
        overrideFramerate: settings.overrideFramerate
    };

    let csInterface = new CSInterface();
    csInterface.evalScript('$.Agrarvolution.timecodeCorrection.processCEPInput(' + JSON.stringify(csObject) + ');', e => {
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
    try {
        const timecodes = checkCSV(file, csvVersion.ttc116);
        timecodeFromArray(timecodes);
    } catch (e) {
        logger.addLog(e, Logger.LOG_LEVELS.error);
        lockForm = false;
        return false;
    }
}

function timecodeFromArray(timecodes) {
    const tcObject = {
        timecodes: timecodes,
        searchRecursive: settings.searchRecursive,
        searchTarget: settings.searchTarget,
        ignoreMediaStart: settings.ignoreMediaStart,
        overrideFramerate: settings.overrideFramerate,
        method: PROCESS_METHODS.fromTimecodes,
        logTarget: CEP_PANEL.correction,
        logging: logger.verboseLogging
    };

    logger.addLog("Media to be updated: " + JSON.stringify(timecodes), Logger.LOG_LEVELS.info);

    const csInterface = new CSInterface();
    csInterface.evalScript('$', function (result) {
        logger.addLog(result, Logger.LOG_LEVELS.info);
    });

    csInterface.evalScript('$.Agrarvolution.timecodeCorrection.processCEPInput(' + JSON.stringify(tcObject) + ');', e => {
        if (e === 'false') {
            logger.addLog("Media hasn't been updated. Process stopped.", Logger.LOG_LEVELS.status);
        } else {
             $('#source')[0].value = "";
            try {
                let status = JSON.parse(e);
                
                logger.addLog(`${status?.processed || 0} ${status.processed === 1 ? "file has" : "files have"} been updated. Process finished. Select the next file to be processed.`, Logger.LOG_LEVELS.status);
                
                updateFileStatus(status?.results);
            } catch (e) {
                console.log(e);
            }
        }

        lockForm = false;
    });
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
        if (!(csv?.[0]?.[0] === csvColumnNames[csvColumnNumbers.fileName] &&
            csv?.[0]?.[1] === csvColumnNames[csvColumnNumbers.duration] &&
            csv?.[0]?.[2] === csvColumnNames[csvColumnNumbers.fileTimecode] &&
            csv?.[0]?.[3] === csvColumnNames[csvColumnNumbers.audioTimecode] &&
            csv?.[0]?.[4] === csvColumnNames[csvColumnNumbers.framerate])) {
            logger.addLog("CSV Headers don't match [TTCT_1.16]", Logger.LOG_LEVELS.status);
            throw new Error("No valid csv. Check csv headers!");
        }

        //check rows + copy data
        for (let i = 1; i < csv.length; i++) {
            let rowResult = checkCSVrow(csv[i], version, i);
            if (rowResult !== false) {
                timeCodes.push(rowResult);
                logger.addLog(rowResult.filename + " - Parsed and staged at " + rowResult.framerate + " fps. [" +
                    rowResult.fileTC + " -> " + rowResult.audioTC + "]", Logger.LOG_LEVELS.info);
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
        if (row[csvColumnNumbers.framerate] === undefined) {
            logger.addLog("CSV row " + rowNumber + (row[csvColumnNumbers.fileName] !== undefined ? " (" + row[csvColumnNumbers.fileName] + ")" : '') + " is incomplete.", Logger.LOG_LEVELS.error);
            return false;
        }

        tcMediaElement.filename = row[csvColumnNumbers.fileName];

        tcMediaElement.framerate = Number(row[csvColumnNumbers.framerate]) * 100;
        if (Number.isNaN(tcMediaElement.framerate)) {
            logger.addLog(tcMediaElement.filename + " at row " + rowNumber + " - Framerate (" +
                row[csvColumnNumbers.framerate] + ") is invalid.", Logger.LOG_LEVELS.error);
            return false;
        }
        switch (tcMediaElement.framerate) {
            case 2400:
            case 2500:
            case 5000:
            case 2997:
            case 3000:
            case 5994:
            case 6000:
            case 2397:
            case 2398:
                break;
            default:
                logger.addLog(tcMediaElement.filename + " at row " + rowNumber + " - Framerate (" +
                    row[csvColumnNumbers.framerate] + ") is unexpected.", Logger.LOG_LEVELS.info);
                return false;
        }
        tcMediaElement.framerate /= 100;

        tcMediaElement.duration = validateTimeCode(
            row[csvColumnNumbers.duration],
            tcMediaElement.framerate,
            tcMediaElement.filename,
            rowNumber, csvColumnNumbers.duration);

        tcMediaElement.fileTC = validateTimeCode(
            row[csvColumnNumbers.fileTimecode],
            tcMediaElement.framerate,
            tcMediaElement.filename,
            rowNumber, csvColumnNumbers.fileTimecode);

        tcMediaElement.audioTC = validateTimeCode(
            row[csvColumnNumbers.audioTimecode],
            tcMediaElement.framerate,
            tcMediaElement.filename,
            rowNumber, csvColumnNumbers.audioTimecode);

        return tcMediaElement;
    }
}

/**
 * Validates string values for being a timecode and returns a timecode object as a result.
 * @param {string} timeString
 * @param {number} framerate 
 * @param {string} fileName used for logging only
 * @param {number} rowNumber used for logging only
 * @param {number} column 
 * @returns 
 */
function validateTimeCode(timeString, framerate, fileName, rowNumber, column) {
    const hmsfPattern = /^(?<hours>[\d]{1,2})[:;.](?<minutes>[\d]{1,2})[:;.](?<seconds>[\d]{1,2})([:;.](?<frames>[\d]{1,}))?$/g;

    let isTimecodeString = hmsfPattern.exec(timeString);

    if (!isTimecodeString) {
        logger.addLog(`${fileName} at row ${rowNumber} - ${csvColumnNames[csvColumnNumbers.framerate]} (" ${timeString} ") is invalid. Added empty timecode instead."`,
            Logger.LOG_LEVELS.info);
        return createZeroTimeCode(column !== csvColumnNumbers.duration, framerate);
    } else {
        return timeString;
    }
}

/**
 * Creates a new timecode with the value of 0.
 * @param {boolean} addFrames 
 * @param {number} framerate 
 * @returns {text: string, groups: {hours: number, minutes: number, seconds: number, frames: number}} timecode
 */
function createZeroTimeCode(addFrames, framerate) {
    let text = "00:00:00";
    if (addFrames) {
        text = "00:00:00:00";
    }
    if (addFrames && framerate === 2397 || framerate === 2997 || framerate === 5994) {
        text = "00;00;00;00";
    }

    return text;
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

    const objPattern = new RegExp(
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

function updateFileStatus(fileStatus) {
    if (fileStatus === undefined) {
        return;
    }
    const tableContent = $('tbody').empty();
    failedUpdateCache = [];

    for (const file of fileStatus) {
        tableContent.append($(`<tr class=${file.isMatching ? 'dataMatch' : 'dataMismatch'}>
            <th>${file.filename}</th>
            <td>${file?.fileTC?.text}</td>
            <td>${file?.audioTC?.text}</td>
            <td>${file?.fileTC?.framerate}</td>
            <td>${file?.audioTC?.framerate}</td>
        </tr>`));

        if (!file.isMatching) {
            failedUpdateCache.append({
                filename: file.filename,
                fileTC: file.fileTC.text,
                audioTC: file.audioTC.text,
                duration: 0,
                framerate: file.audioTC.framerate
            });
        }
    }

    if (fileStatus.length) {
        $('#statusSection').removeClass('hidden');
        $('#process').addClass('hidden');
    }
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
    settings.framerate = form[formIds.framerate].value;
    settings.overrideFramerate = form[formIds.overrideFramerate].checked

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
    const form = document.forms[0];

    form[formIds.logging].checked = settings.logging || false;

    form[formIds.recursion].checked = settings.searchRecursive || false;
    form[formIds.mediaStart].checked = settings.ignoreMediaStart || false;
    form[formIds.framerate].value = settings?.framerate || 25;
    form[formIds.overrideFramerate].checked = settings.overrideFramerate || false;

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

    updateSourceInterface();

    logger.verboseLogging = settings.logging;
    logger.addLog("Settings successfully updated.", Logger.LOG_LEVELS.info);
}

/**
 * Reflect current status of source selection.
 * This is to reduce visual clutter in the panel and only show appropriate settings.
 */
function updateSourceInterface() {
    const file = $('.file-only'),
        metadata = $('.metadata-only');

    if (document.forms[0][formIds.source][TIMECODE_SOURCE.file].checked) {
        file.removeClass('hidden');
        metadata.addClass('hidden');
        logger.addLog("Select .csv file to start.", Logger.LOG_LEVELS.status);
    } else {
        file.addClass('hidden');
        metadata.removeClass('hidden');
        logger.addLog("Press start to update timecodes form metadata.", Logger.LOG_LEVELS.status);
    }
}

/**
 * Validates the source file path.
 * 
 */
function validateFile() {
    const fileElement = $('#source')[0];
    if (fileElement.files.length === 0) {
        logger.addLog('No file has been selected.', Logger.LOG_LEVELS.status);
        return false;
    } else if (fileElement.files[0].size === 0) {
        logger.addLog('Selection is not a file.', Logger.LOG_LEVELS.status);
        return false;
    } else if (!(fileElement.files[0].type === 'text/csv' || fileElement.files[0].type === 'application/vnd.ms-excel')) {
        logger.addLog('File type does not match.', Logger.LOG_LEVELS.info);
    }
    return fileElement.files[0];
}