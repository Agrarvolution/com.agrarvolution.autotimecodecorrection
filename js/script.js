'use strict';
//Define form names
let formId = 'atc';
let sourceId = 'source';
let searchTargetId = 'target';
let searchRecursionId = 'recursion';
let loggingId = 'logging';
let mediaStartId = 'mediaStart';

var logging = logging || {};
logging.verboseLogging = true;
const logLevels = {
    critical: "CRIT",
    status: "STAT",
    info: "INFO",
    error: "ERR "
}
let log = null;
let error = null;

const settingsKey = "autoTimecodeCorrection.settings";
const defaultSettings = {
    logging: false,
    searchRecursive: true,
    searchTarget: 0,
    ignoreMediaStart: true
}
let settings = defaultSettings;


const csvVersion = {
    ttc116: 'tentacletimecodetool_1.16'
};

let lockForm = false;


$(function () {
        
    logging.logArea = $('#loggingArea')[0];
    logging.log = $('#log');
    log = $('#log');
    error = $('#errorDisplay');

    let csInterface = new CSInterface();
    csInterface.addEventListener("com.adobe.csxs.events.agrarvolution.cepLogging", function (e) {
        logging.addLog(e.data.text , e.data.logLevel);
    });

    //restore settings
    settings = loadSettings();
    changeSettings(settings);

    $('#resetLog').on('click', function(e) {
        logging.clearLog();
    });
    $('#hideLog').on('click', function(e) {
        log.addClass('hidden');
    });

    $('#reset').on("click", function(e){
        e.preventDefault();
        changeSettings(defaultSettings);
        $('#source')[0].value = "";
        storeSettings(defaultSettings);
        log.addClass('hidden');
        logging.clearLog();
        logging.addLog("Default settings are restored.", logLevels.info);
    });

    $('input:not(#source, #start)').on("click", function (e) {
        if (this.id !== undefined && this.id === 'logging') {
            logging.verboseLogging = this.checked;
            log.toggleClass('hidden');            
        }
        if (storeSettings(readSettings())) {
            logging.addLog("Settings successfully stored.", logLevels.info);
        };
    });

    $('#start').on("click", function(e){
        e.preventDefault();
        if (lockForm) {
            return false;
        }
        lockForm = true;
        let form = document.forms[formId];
        
        let validation = validateForm(form);

        if (!validation) {
            logging.addLog('Process canceled. Inputs are invalid.', logLevels.info);
            lockForm = false;
        } else {
            processFile(validation);        
        }      
    })    
});

/**
 * Handler for a fileLoaded event. Calls a csv validation and interfaces with Premiere to send the staged media and settings.
 * @param {*} file parsed csv
 */
function handleFileLoad (file) {
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
    csInterface.evalScript('$.agrarvolution.timecodeCorrection.processInput(' + JSON.stringify(tcObject) + ');', function(e) {
        if (e === 'true') {
            logging.addLog("Media has been updated. Process finished.", logLevels.status);
            $('#source')[0].value = "";
        } else if (e === 'false') {
            logging.addLog("Media hasn't been updated. Process stopped.", logLevels.status);
        }
        lockForm = false;
    })
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
 * @returns {boolean|array.{fileName: string, framerate: number, duration: object, fileTC: object, audioTC: object}} false on failure
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
                logging.addLog(rowResult.fileName + " - Parsed and staged at " + rowResult.framerate/100 + " fps. [" +
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
 * @returns {boolean|array.{fileName: string, framerate: number, duration: object, fileTC: object, audioTC: object}} false on failure
 */
function checkCSVrow (row, version, rowNumber) {
    let tcMediaElement = {};

    if (version === csvVersion.ttc116) {
        for (let i = 0; i < row.length; i++) {
            if (row[i] === undefined) {
                logging.addLog("CSV row " + rowNumber + " is incomplete.", logLevels.error);
                return false;
            }
        }

        tcMediaElement.fileName = row[0];
        
        //@todo check if no match - check if values are valid in new function
        
        tcMediaElement.framerate = Number(row[4])*100;
        if (Number.isNaN(tcMediaElement.framerate)) {
            logging.addLog(tcMediaElement.fileName + " at row " + rowNumber + " - Framerate (" + 
            row[4] + ") is invalid.", logLevels.error);
            return false;
        }
        switch ( tcMediaElement.framerate) {
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
                logging.addLog(tcMediaElement.fileName + " at row " + rowNumber + " - Framerate (" + 
                row[4] + ") is unexpected.", logLevels.info);
        }

        let hmsfPattern = /^(?<hours>[\d]{1,2})[:;](?<minutes>[\d]{1,2})[:;](?<seconds>[\d]{1,2})([:;](?<frames>[\d]{1,}))?$/g;

        tcMediaElement.duration = hmsfPattern.exec(row[1]);
        if (!validateTime(tcMediaElement.duration, tcMediaElement.framerate)) {
            logging.addLog(tcMediaElement.fileName + " at row " + rowNumber + " - duration (" + 
            row[1] + ") is invalid.", logLevels.error);
            return false;
        }
        tcMediaElement.duration = compressMatch(tcMediaElement.duration);
        hmsfPattern.lastIndex = 0;

        tcMediaElement.fileTC = hmsfPattern.exec(row[2]);
        if (!validateTime(tcMediaElement.fileTC, tcMediaElement.framerate)) {
            logging.addLog(tcMediaElement.fileName + " at row " + rowNumber + " - File TC (" + 
            row[2] + ") is invalid.", logLevels.error);
            return false;
        }
        tcMediaElement.fileTC = compressMatch(tcMediaElement.fileTC);
        hmsfPattern.lastIndex = 0;
        
        tcMediaElement.audioTC = hmsfPattern.exec(row[3]);
        if (!validateTime(tcMediaElement.audioTC, tcMediaElement.framerate)) {
            logging.addLog(tcMediaElement.fileName + " at row " + rowNumber + " - Audio TC (" + 
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
function compressMatch (timeMatched) {
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
function validateTime (time, framerate) {
    if (time === undefined || time == null || time.groups === undefined || time.groups == null) {
        return false;
    }

    time.groups.hours = Number(time.groups.hours);
    time.groups.minutes = Number(time.groups.minutes);
    time.groups.seconds = Number(time.groups.seconds);
    time.groups.frames = Number(time.groups.frames);

    framerate = framerate / 100;
    if (time.length < 4 || time.length > 6) {
        return false;
    }

    if (time.groups.hour > 24 || time.groups.minutes > 60 || time.groups.seconds > 60 || (time.groups.frames !== NaN && 
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
function CSVToArray (strData, strDelimiter){

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
    while (arrMatches = objPattern.exec(strData)){

        let strMatchedDelimiter = arrMatches[1];

        if (
            strMatchedDelimiter.length &&
            (strMatchedDelimiter != strDelimiter)
            ){
            arrData.push([]);

        }

        if (arrMatches[2]){
                strMatchedValue = arrMatches[2].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );

        } else {
            strMatchedValue = arrMatches[3];

        }

        arrData[arrData.length - 1].push(strMatchedValue);
    }

    return(arrData);
}

/**
 * Reads settings from the gui.
 * @returns {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}}
 */
function readSettings() {
    let form = $('form[name="atc"]')[0];
    let settings = {};
    
    logging.addLog('Reading settings.', logLevels.info);

    settings.logging = form[loggingId].checked;
    settings.searchRecursive = form[searchRecursionId].checked;

    settings.ignoreMediaStart = form[mediaStartId].checked;

    for (let i = 0; i <  form[searchTargetId].length; i++) {
        if(form[searchTargetId][i].checked) {
            settings.searchTarget = i;
        } 
    }
    return settings;
}
/**
 * Updates settings in gui.
 * @param {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}} settings 
 */
function changeSettings(settings) {
    try {
        let form = $('form[name="atc"]')[0];

        form[loggingId].checked = settings.logging;
        form[searchRecursionId].checked = settings.searchRecursive;
        form[mediaStartId].checked = settings.ignoreMediaStart;

        for (let i = 0; i <  form[searchTargetId].length; i++) {
            form[searchTargetId][i].checked = false;
            if (i === settings.searchTarget) {
                form[searchTargetId][i].checked = true;
            }
        }
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
function loadSettings () {
    let settings = localStorage.getItem(settingsKey);
    if (settings === null) {
        this.addLog("No settings have been stored.", logLevels.info);
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
function validateForm (form) {
    if (form[sourceId].files.length === 0) {
        logging.addLog('No file has been selected.', logLevels.status);
        return false;
    } else if (form[sourceId].files[0].size === 0) {
        logging.addLog('Selection is not a file.', logLevels.status);
        return false;
    } else if (!(form[sourceId].files[0].type === 'text/csv' || form[sourceId].files[0].type === 'application/vnd.ms-excel')) {
        logging.addLog('File type does not match.', logLevels.info);
    }
    return form[sourceId].files[0];
}

/**
 * Adds a new log message to the log text area.
 * @param {string} text 
 * @param {string} level 
 */
logging.addLog = function (text, level) {
    if (level === logLevels.status) {
        error.text(text);
    }
    if (level === logLevels.error || logging.verboseLogging) {
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
    return "[" + this.leadingZero(date.getDate()) + "." + this.leadingZero(date.getMonth()+1) + "." + 
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
