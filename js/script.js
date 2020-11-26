'use strict';
//Define form names
let formId = 'atc';
let sourceId = 'source';
let searchMethodId = 'target';
let searchRecursionId = 'recursion';
let loggingId = 'logging';

let verboseLogging = true;
const logLevels = {
    critical: "CRIT",
    status: "STAT",
    info: "INFO"
}
let log = null;
let error = null;

let settingsKey = "settings";

$(document).ready(function () {
    log = $('#log');
    error = $('#errorDisplay');

    loadSettings();
    
    $('#start').click(function(e){
        e.preventDefault();
        let form = document.forms[formId];

        if (!validateForm(form)) {
            addLog('Process canceled. Inputs are invalid. See logs above.', logLevels.status);
            
        }
           
        //process form -> results = settings
        let settings = {
            lastFile: 0,
            logging: form[loggingId],
            searchMethod: form[searchMethodId],
            searchRecursive: form[searchRecursionId]
        }
        if (storeSettings(settings)) {
            addLog("Settings successfully stored.", logLevels.info);
        };
    })    



    let testCSV = 'File Name,Duration,File TC,Audio TC,Framerate\n"NZ6_0394.MOV","00:00:05","15:21:06:07","08:22:12:18","25.00",';
});

function storeSettings(settings) {
    let settingsTxt = "";
    try {
        settingsTxt = JSON.stringify(settings);
    } catch (e) {
        addLog("Failed to create settings string.", logLevels.critical);
        return false;
    }
    localStorage.setItem(settingsKey, settings);
    return true;
}

function loadSettings() {
    let settings = localStorage.getItem(settingsKey);
    if (settings === null) {
        addLog("No settings have been stored.", logLevels.info);
    } else {
        try {
            settings = JSON.parse(settings);
        } catch {
            addLog("Failed to create settings object.", logLevels.critical);
            return false;
        }
        let form = $('form[name="atc"]');

    }
  
}

function validateForm(form) {
    if (form[sourceId].files.length === 0) {
        addLog('No file has been selected.', logLevels.status);
        return false;
    } else if (form[sourceId].files[0].size === 0) {
        addLog('Selection is not a file.', logLevels.status);
        return false;
    } 

}

function addLog (text, level) {
    error[0].value = text;
    if (verboseLogging) {
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
    return "[" + date.getDay() + "." + date.getMonth() + "." + date.getFullYear() + " - " +
        date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "] ";
}
