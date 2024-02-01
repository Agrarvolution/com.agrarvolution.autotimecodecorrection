'use strict';
//Define form names
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

const logger = new Logger();

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

let lockForm = false;

$(function () {
    onLoaded();
    logger.init($('#log'), $('#loggingArea')[0], $('#explainer'), $('#errorDisplay'));

    host = setHostinDOM();
    onAppThemeColorChanged();

    const csInterface = new CSInterface();
    csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
    csInterface.addEventListener("com.adobe.csxs.events.agrarvolution.timecodeRepairLog", function (e) {
        logger.addLog(e.data.text, e.data.logLevel);
    });
    csInterface.requestOpenExtension("com.agrarvolution.autoTimecodeCorrection.server", "");

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
    $('#rebase-xmp-timevalue').on('click', function (e) {
        e.preventDefault();
        if (lockForm) {
            return false;
        }
        lockForm = true;

        fixXMP(false);
    });

    $('#cleanup-xmp').on('click', function (e) {
        e.preventDefault();
        if (lockForm) {
            return false;
        }
        lockForm = true;

        fixXMP(true);
    });
});
/**
 * Helper function to call host to fix the XMP value - timeFormat.
 */
function fixXMP(type) {
    let method = '';
    if (type) {
        method = PROCESS_METHODS.fixXMPErrorOnly;
        logger.addLog("Fixing broken XMP timecode time format.", Logger.LOG_LEVELS.status);
    } else {
        method = PROCESS_METHODS.fixXMP;
        logger.addLog("Update timecode time format.", Logger.LOG_LEVELS.status);
    }

    let csObject = {
        framerate: settings.framerate,
        searchTarget: settings.searchTarget,
        searchRecursive: settings.searchRecursive,
        logging: settings.logging,
        method: method,
        logTarget: CEP_PANEL.repair,
        errorOnly: type
    };

    let csInterface = new CSInterface();
    csInterface.evalScript(`Agrarvolution.timecodeCorrection.fixXmpTimeFormat(${JSON.stringify(csObject)});`, function (e) {
        if (e === 'true') {
            logger.addLog("Time format was repaired.", Logger.LOG_LEVELS.status);
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
} 