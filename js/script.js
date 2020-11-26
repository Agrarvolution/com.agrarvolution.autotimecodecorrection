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
    error: "ERR"
}
let log = null;
let error = null;

const settingsKey = "autoTimecodeCorrection.settings";
const defaultSettings = {
    logging: false,
    searchRecursive: true,
    searchTarget: 1,
}
const csvVersion = {
    ttc116 = 'tentacletimecodetool_1.16'
};

$(document).ready(function () {
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
    });

    $('#start').on("click", function(e){
        e.preventDefault();
        let form = document.forms[formId];
        let timeCodeInput = {};

        let validation = validateForm(form);

        if (!validation) {
            addLog('Process canceled. Inputs are invalid. See logs above.', logLevels.info);
        } else {
            timeCodeInput = processFile(validation);
        }
        
    })    



    let testCSV = 'File Name,Duration,File TC,Audio TC,Framerate\n"NZ6_0394.MOV","00:00:05","15:21:06:07","08:22:12:18","25.00",';
});

function processFile(file) {
    const reader = new FileReader();
    reader.addEventListener('load', (reader) => {
        let result = reader.target.result;
        try {
            result = CSVToArray(result);
        } catch {
            addLog("Failed to parse CSV.", logLevels.status);
            return false;
        }

        //check array columns

    });
    reader.readAsText(file);
}

function checkCSV(csv, version) {
    if (version === csvVersion.ttc116) {

        if (!(csv[0] === 'File Name' && csv[1] === 'Duration' && csv[2] === 'File TC' &&
            csv[3] === 'Audio TC' && csv[4] === 'Framerate')) {
            addLog("CSV Headers don't match [TTCT_1.16]", logLevels.status);
            return false;
        }
        /*
        @ToDo
        check rows, check if inputs are valid add input to overall object if valid
        :: ;; fsp validity
        create media object
        */
    }
}

//@source https://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray( strData, strDelimiter ){

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

function storeSettings(settings) {
    let settingsTxt = "";
    try {
        settingsTxt = JSON.stringify(settings);
    } catch (e) {
        addLog("Failed to create settings string.", logLevels.critical);
        return false;
    }
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
    } else if (form[sourceId].files[0].type !== 'text/csv') {
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
