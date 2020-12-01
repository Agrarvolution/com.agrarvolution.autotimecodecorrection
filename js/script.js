'use strict';
//Define form names
let formId = 'atc';
let sourceId = 'source';
let searchTargetId = 'target';
let searchRecursionId = 'recursion';
let loggingId = 'logging';

let verboseLogging = true;
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
    searchTarget: 1,
}
let settings = defaultSettings;

const csvVersion = {
    ttc116: 'tentacletimecodetool_1.16'
};

let fileLoadedEvent = document.createEvent('Event');
fileLoadedEvent.initEvent('fileLoaded', true, true);

$(function () {
    log = $('#log');
    error = $('#errorDisplay');

    changeSettings(loadSettings());

    $('#reset').on("click", function(e){
        e.preventDefault();
        changeSettings(defaultSettings);
        $('#source')[0].value = "";
        storeSettings(defaultSettings);
        log.addClass('hidden');
        clearLog();
        addLog("Default settings are restored.", logLevels.info);
    });

    $('input:not(#source)').on("change", function (e) {
        if (storeSettings(readSettings())) {
            addLog("Settings successfully stored.", logLevels.info);
        };
    });

    $('#logging').on('click', function(){
        verboseLogging = this.checked;
        log.toggleClass('hidden');
    });

    $('#start').on("click", function(e){
        e.preventDefault();
        let form = document.forms[formId];
        let timeCodes = [];

        let validation = validateForm(form);

        if (!validation) {
            addLog('Process canceled. Inputs are invalid. See logs above.', logLevels.info);
        } else {
            processFile(validation);
            document.addEventListener('fileLoaded', function (e){
                timeCodes = checkCSV(e.file, csvVersion.ttc116);
                
                let tcObject = {
                    timeCodes: timeCodes,
                    searchRecursive: settings.searchRecursive,
                    searchTarget: settings.searchTarget
                };

                tcObject;


            });            
        }
        
    })    



    let testCSV = 'File Name,Duration,File TC,Audio TC,Framerate\n"NZ6_0394.MOV","00:00:05","15:21:06:07","08:22:12:18","25.00",';
});

function processFile(file) {
    const reader = new FileReader();
    reader.addEventListener('load', (reader) => {
        try {
            fileLoadedEvent.file = CSVToArray(reader.target.result);
            document.dispatchEvent(fileLoadedEvent);
        } catch {
            addLog("Failed to parse CSV.", logLevels.status);
            return false;
        }
    });
    reader.readAsText(file);
}

function checkCSV(csv, version) {
    let timeCodes = [];

    if (version === csvVersion.ttc116) {
        //check first row
        if (!(csv[0][0] !== undefined && csv[0][0] === 'File Name' && csv[0][1] !== undefined && csv[0][1] === 'Duration' && 
            csv[0][2] !== undefined && csv[0][2] === 'File TC' && csv[0][3] !== undefined &&
            csv[0][3] === 'Audio TC' && csv[0][4] !== undefined && csv[0][4] === 'Framerate')) {
            addLog("CSV Headers don't match [TTCT_1.16]", logLevels.status);
            return false;
        }

        //check rows + copy data
        for (let i = 1; i < csv.length; i++) {
            let rowResult = checkCSVrow(csv[i], version, i);
            if (rowResult !== false) {
                timeCodes.push(rowResult);
                addLog(rowResult.fileName + " - Parsed and staged at " + rowResult.framerate/100 + " fps. [" + rowResult.fileTC.text + " -> " + rowResult.audioTC.text + "]", logLevels.info);
            }
            
        }
        return timeCodes;
    } else {
        addLog("CSV version is unsupported.", logLevels.status);
        return false;
    }
}

function checkCSVrow (row, version, rowNumber) {
    let tcMediaElement = {};

    if (version === csvVersion.ttc116) {
        for (let i = 0; i < row.length; i++) {
            if (row[i] === undefined) {
                addLog("CSV row " + rowNumber + " is incomplete.", logLevels.error);
                return false;
            }
        }

        tcMediaElement.fileName = row[0];
        
        //@todo check if no match - check if values are valid in new function
        
        tcMediaElement.framerate = Number(row[4])*100;
        if (Number.isNaN(tcMediaElement.framerate)) {
            addLog(tcMediaElement.fileName + " at row " + rowNumber + " - Framerate (" + 
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
                addLog(tcMediaElement.fileName + " at row " + rowNumber + " - Framerate (" + 
                row[4] + ") is unexpected.", logLevels.info);
        }

        let hmsPattern = /^(?<hours>\d\d?)[:;](?<minutes>\d\d?)[:;](?<seconds>\d\d?)$/g;
        let hmsfPattern = /^(?<hours>\d\d?)[:;](?<minutes>\d\d?)[:;](?<seconds>\d\d?)[:;](?<frames>\d\d?)$/g;

        tcMediaElement.duration = hmsPattern.exec(row[1]);
        if (!validateTime(tcMediaElement.duration, tcMediaElement.framerate)) {
            addLog(tcMediaElement.fileName + " at row " + rowNumber + " - duration (" + 
            row[1] + ") is invalid.", logLevels.error);
            return false;
        }
        tcMediaElement.duration = compressMatch(tcMediaElement.duration);

        tcMediaElement.fileTC = hmsfPattern.exec(row[2]);
        if (!validateTime(tcMediaElement.fileTC, tcMediaElement.framerate)) {
            addLog(tcMediaElement.fileName + " at row " + rowNumber + " - File TC (" + 
            row[2] + ") is invalid.", logLevels.error);
            return false;
        }
        tcMediaElement.fileTC = compressMatch(tcMediaElement.fileTC);
        hmsfPattern.lastIndex = 0;
        
        tcMediaElement.audioTC = hmsfPattern.exec(row[3]);
        if (!validateTime(tcMediaElement.audioTC, tcMediaElement.framerate)) {
            addLog(tcMediaElement.fileName + " at row " + rowNumber + " - Audio TC (" + 
            row[3] + ") is invalid.", logLevels.error);
            return false;
        } 
        tcMediaElement.audioTC = compressMatch(tcMediaElement.audioTC);

        return tcMediaElement;
    }  
}

function compressMatch (timeMatched) {
    if (timeMatched !== undefined) {
        return {
            text: timeMatched[0],
            groups: timeMatched.groups
        }
    }
}

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

    if (time.groups.hour > 24 && time.groups.minutes > 60 && time.groups.seconds > 60 && 
        time.groups.frames !== NaN && time.groups.frames > framerate) {
        return false
    }

    return true;
}

//@source https://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
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

function readSettings() {
    let form = $('form[name="atc"]')[0];
    let settings = {};
    
    addLog('Reading settings.', logLevels.info);

    settings.logging = form[loggingId].checked;
    settings.searchRecursive = form[searchRecursionId].checked;
    for (let i = 0; i <  form[searchTargetId].length; i++) {
        if(form[searchTargetId][i].checked) {
            settings.searchTarget = i;
        } 
    }
    return settings;
}

function changeSettings(settings) {
    try {
        let form = $('form[name="atc"]')[0];

        form[loggingId].checked = settings.logging;
        form[searchRecursionId].checked = settings.searchRecursive;
        for (let i = 0; i <  form[searchTargetId].length; i++) {
            form[searchTargetId][i].checked = false;
            if (i === settings.searchTarget) {
                form[searchTargetId][i].checked = true;
            }
        }
        verboseLogging = settings.logging;
        addLog("Settings successfully updated.", logLevels.info);
    } catch {
        addLog("Failed to update settings.", logLevels.error);
    }
}

function storeSettings(newSettings) {
    let settingsTxt = "";
    try {
        settingsTxt = JSON.stringify(settings);
    } catch (e) {
        addLog("Failed to create settings string.", logLevels.critical);
        return false;
    }

    settings = newSettings;
    localStorage.setItem(settingsKey, settingsTxt);
    return true;
}

function loadSettings() {
    let settings = localStorage.getItem(settingsKey);
    if (settings === null) {
        addLog("No settings have been stored.", logLevels.info);
        settings = defaultSettings;
    } else {
        try {
            settings = JSON.parse(settings);
        } catch {
            addLog("Failed to create settings object.", logLevels.critical);
            settings = defaultSettings;
        }
    }
    return settings;
}

function validateForm(form) {
    if (form[sourceId].files.length === 0) {
        addLog('No file has been selected.', logLevels.status);
        return false;
    } else if (form[sourceId].files[0].size === 0) {
        addLog('Selection is not a file.', logLevels.status);
        return false;
    } else if (!(form[sourceId].files[0].type === 'text/csv' || form[sourceId].files[0].type === 'application/vnd.ms-excel')) {
        addLog('File type does not match.', logLevels.info);
    }
    return form[sourceId].files[0];
}

function addLog (text, level) {
    if (level === logLevels.status) {
        error.text(text);
    }
    if (level === logLevels.error || verboseLogging) {
        if (log.hasClass('hidden')) {
            log.removeClass('hidden');
        }   
       
        log.children('#loggingArea')[0].value = timeStamp() + level + " " + text + "\n" + log.children('#loggingArea')[0].value;
    }
    
}

function clearLog () {
    $('#loggingArea')[0].value = '';
}


function timeStamp() {
    let date = new Date();
    return "[" + leadingZero(date.getDate()) + "." + leadingZero(date.getMonth()+1) + "." + 
    date.getFullYear() + " - " + leadingZero(date.getHours()) + ":" + leadingZero(date.getMinutes()) + 
    ":" + leadingZero(date.getSeconds()) + "] ";
}

function leadingZero(number) {
    return number < 10 ? "0" + number : number;
}
