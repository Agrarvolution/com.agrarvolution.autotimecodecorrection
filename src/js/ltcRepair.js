'use strict';
//Define form names
const sourceId = 'source';
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

let error = null;
let explainer = null;
let fileEl = null;
let csvLink = null;

const settingsKey = "autoTimecodeRepair.settings";
const defaultSettings = {
    logging: false,
    framerate: 25,
    searchTarget: SELECTION.all,
    searchRecursive: false
}
let settings = defaultSettings;


const csvVersion = {
    ttc116: 'tentacletimecodetool_1.16'
};

let lockForm = false,
    lockFormFix = false;

$(function () {
    onLoaded();
    logger.init($('#log'), $('#loggingArea')[0]);

    error = $('#errorDisplay');
    explainer = $('#explainer');
    fileEl = $('#file');
    csvLink = $('#csvDownload');

    host = setHostinDOM();
    onAppThemeColorChanged();

    let csInterface = new CSInterface();
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

    $('select').on('change', function (e) {
        settingHandler();
    });

    $('input:not(#source, #start)').on("click", function (e) {
        if (this.id !== undefined && this.id === 'logging') {
            logger.verboseLogging = this.checked;
            logger.toggleLog('hidden');
        }
        settingHandler();
    });

    function settingHandler() {
        if (storeSettings(readSettings())) {
            logger.addLog("Settings successfully stored.", Logger.LOG_LEVELS.info);
        };
    }
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
        logger.addLog("Fixing broken XMP timecode time format.", Logger.LOG_LEVELS.status);
    } else {
        logger.addLog("Update timecode time format.", Logger.LOG_LEVELS.status);
    }

    let csObject = {
        framerate: settings.framerate,
        searchTarget: settings.searchTarget,
        recursive: settings.searchRecursive,
        logging: settings.logging,
        errorOnly: type
    };

    let csInterface = new CSInterface();
    csInterface.evalScript(`$.agrarvolution.timecodeCorrection.fixXmpTimeFormat(${JSON.stringify(csObject)});`, function (e) {
        if (e === 'true') {
            logger.addLog("Time format was repaired.", Logger.LOG_LEVELS.status);
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
 * Reads settings from the gui.
 * @returns {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}}
 */
function readSettings() {
    const form = document.forms[0];

    let settings = {};

    logger.addLog('Reading settings.', Logger.LOG_LEVELS.info);

    settings.logging = form[formIds.logging].checked;

    for (let i = 0; i < form[formIds.fixTarget].length; i++) {
        if (form[formIds.fixTarget][i].checked) {
            settings.searchTarget = i;
        }
    }
    settings.searchRecursive = form[formIds.fixRecursion].checked;
    settings.framerate = form[formIds.fixFramerate].value;
    return settings;
}
/**
 * Updates settings in gui.
 * @param {{logging: boolean, searchRecursive: boolean, ignoreMediaStart: boolean, searchTarger: number}} settings 
 */
function changeSettings(settings) {
    //try {
    const form = document.forms[0];

    form[formIds.logging].checked = settings.logging || false;

    for (let i = 0; i < form[formIds.fixTarget].length; i++) {
        form[formIds.fixTarget][i].checked = false;
        if (i === (settings?.searchTarget || 0)) {
            form[formIds.fixTarget][i].checked = true;
        }
    }
    form[formIds.fixRecursion].checked = settings?.searchRecursive || false;
    form[formIds.fixFramerate].value = settings?.framerate || 25;


    logger.verboseLogging = settings.logging;
    logger.addLog("Settings successfully updated.", Logger.LOG_LEVELS.info);
    // } catch (e) {
    //     logger.addLog("Failed to update settings. " + e, Logger.LOG_LEVELS.error);
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

