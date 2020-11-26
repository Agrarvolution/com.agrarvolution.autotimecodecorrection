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
alert("Fuck you");

$(document).ready(function () {
    log = $('#log');
    error = $('#errorDisplay');

    alert("Fuck you less");
    let settings = defaultSettings;
    settings = loadSettings();
    changeSettings(settings);
    $('#reset').on(summit, function(e){
        e.preventDefault();
        addLog("Default settings are restored.", logLevels.info);
        changeSettings(defaultSettings);
        $('#source')[0].value = "";
    });

    /*$('input:not(#source)').on(change, function (e) {
        if (storeSettings(settings)) {
            addLog("Settings successfully stored.", logLevels.info);
        };
    });*/


    $('#start').on(click, function(e){
        e.preventDefault();
        let form = document.forms[formId];

        if (!validateForm(form,settings)) {
            addLog('Process canceled. Inputs are invalid. See logs above.', logLevels.info);
            
        }
           
        //process form -> results = settings
        if (storeSettings(settings)) {
            addLog("Settings successfully stored.", logLevels.info);
        };
    })    



    let testCSV = 'File Name,Duration,File TC,Audio TC,Framerate\n"NZ6_0394.MOV","00:00:05","15:21:06:07","08:22:12:18","25.00",';
});

function changeSettings(settings) {
    try {
        let form = $('form[name="atc"]');

        form.children('#logging')[0].checked = settings.logging;
        form.children('#recursion')[0].checked = settings.searchRecursive;
        let radioSelection = form.children('[name="target]');
        for (let i = 0; i <  radioSelection.length; i++) {
            radioSelection[i].checked = false;
            if (i === settings.searchTarget) {
                radioSelection[i].checked = true;
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

function validateForm(form, input) {
    if (form[sourceId].files.length === 0) {
        addLog('No file has been selected.', logLevels.status);
        return false;
    } else if (form[sourceId].files[0].size === 0) {
        addLog('Selection is not a file.', logLevels.status);
        return false;
    } else if (form[sourceId].files[0].type === 'text/csv') {
        addLog('File type does not match.', logLevels.info);
    }
    input.file = form[sourceId].files[0];

    input.logging = form[loggingId].checked; 
    
    input.searchRecursive = form[searchRecursionId].checked;

    let searchTargetSelection = 0;
    for (let i = 0; i < form[searchTargetId].length; i++) {
        if (form[searchTargetId][i].checked) {
            searchTargetSelection++;
            input.searchTarget = i;
        }
    }
    if (searchTargetSelection != 1) {
        addLog('Search target is not defined.', logLevels.status);
        return false;
    }
    return input;
}

function addLog (text, level) {
    if (level === logLevels.status) {
        error.text(text);
    }
    if (level === logLevels.error || verboseLogging) {
        if (log.hasClass('hidden')) {
            log.removeClass('hidden');
        }   
        let textArea = log.children('#loggingArea');
        log.children('#loggingArea')[0].value += timeStamp() + level + " " + text + "\n";
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
