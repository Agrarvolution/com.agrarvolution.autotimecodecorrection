#include 'KBRG_TimecodeCorrection.jsx';

if (app.eventHandlers) { //uses the fact, that app.eventhandlers is only available if the script is directly called to guard the test scripts
    //testCache();
    //tests();

    testWavRepair();
    // wavTest();
}

function testCache() {
    var cache = new CacheThumbnails({
        searchTarget: Agrarvolution.timecodeCorrection.SCAN_TARGET.folder,
        searchRecursive: true,
        logTarget: Agrarvolution.CEP_PANEL.correction,
        logging: true
    });
}

function tests() {
    var cache = new CacheThumbnails({
        searchTarget: Agrarvolution.timecodeCorrection.SCAN_TARGET.folder,
        logTarget: Agrarvolution.CEP_PANEL.correction,
        logging: true
    });
    $.writeln("Test cache toString():\n" + cache);
    $.writeln("Test cache toCSV():\n" + cache.toTimecodeCSV());

    cache.updateCache({
        framerate: 25,
        overrideFramerate: true,
    }, CacheThumbnails.PROCESS_METHODS.fromCreated);
    $.writeln("Test cache update by creation date:\n" + cache);

    cache.updateCache({
        framerate: 25,
        overrideFramerate: true,
    }, CacheThumbnails.PROCESS_METHODS.fromLastChange);
    $.writeln("Test cache update by lastchange:\n" + cache);

    cache.updateCache({}, CacheThumbnails.PROCESS_METHODS.revertTimeCode);
    $.writeln("Test revert time values stored in cache:\n" + cache);

    cache.updateCache({
        framerate: 25
    }, CacheThumbnails.PROCESS_METHODS.fixXMP);
    $.writeln("Test fixing time values:\n" + cache);

    cache.updateCache({
        framerate: 50
    }, CacheThumbnails.PROCESS_METHODS.rebase);
    $.writeln("Test rebase time values:\n" + cache);


    Agrarvolution.timecodeCorrection.processCEPInput({
        framerate: 29.97,
        method: CacheThumbnails.PROCESS_METHODS.rebase
    });
    $.writeln("Test process input call:\n" + cache);

    Agrarvolution.timecodeCorrection.processCEPInput({
        timecodes: [{
            filename: "GX010004.MP4",
            framerate: 23.98,
            duration: "00:00:10",
            fileTC: "22:46:08:18",
            audioTC: "21:49:13:08"
        }, {
            filename: "GX010005.MP4",
            framerate: 23.98,
            duration: "00:00:06",
            fileTC: "21:49:29:21",
            audioTC: "21:49:29:20"
        }],
        searchRecursive: true,
        searchTarget: 0,
        ignoreMediaStart: true,
        overrideFramerate: true,
        method: "updateFromTimecodes",
        logTarget: 0,
        logging: true
    });
    $.writeln("Test process timcecode updates from input call:\n" + cache);


    Agrarvolution.timecodeCorrection.processCEPInput({
        searchTarget: 0,
        method: "updateFromLastChanged",
        logging: true,
        logTarget: 0,
        framerate: "2997",
        overrideFramerate: true
    });
    $.writeln("Test process input call:\n" + cache);

    Agrarvolution.timecodeCorrection.processCEPInput({
        framerate: "48",
        searchTarget: 0,
        searchRecursive: false,
        logging: true,
        method: "rebase",
        logTarget: 1,
        errorOnly: false
    });
    $.writeln("Test process rebase by CEP call:\n" + cache);
}

function testWavRepair() {
    $.writeln("Test wav repair.");
    Agrarvolution.timecodeCorrection.processCEPInput({
        framerate: 25,
        samplerate: 96000,
        searchTarget: 1,
        searchRecursive: false,
        logging: true,
        method: "rebase",
        logTarget: 1,
        errorOnly: true
    });

}

function wavTest() {
    app.synchronousMode = false;
    $.writeln("Test processing empty wavs.");
    Agrarvolution.timecodeCorrection.processCEPInput({
        timecodes: [{
            "filename": "240312_001.WAV",
            "framerate": 25,
            "duration": "00:03:24",
            "fileTC": "00:00:00:00",
            "audioTC": "09:53:00:23"
        }, {
            "filename": "240312_002.WAV",
            "framerate": 25,
            "duration": "00:46:36",
            "fileTC": "00:00:00:00",
            "audioTC": "09:57:03:12"
        }, {
            "filename": "240312_003.WAV",
            "framerate": 25,
            "duration": "00:46:36",
            "fileTC": "00:00:00:00",
            "audioTC": "10:43:39:12"
        }, {
            "filename": "240312_004.WAV",
            "framerate": 25,
            "duration": "00:46:36",
            "fileTC": "00:00:00:00",
            "audioTC": "11:30:15:12"
        }, {
            "filename": "240312_005.WAV",
            "framerate": 25,
            "duration": "00:46:36",
            "fileTC": "00:00:00:00",
            "audioTC": "12:16:51:12"
        }, {
            "filename": "240312_006.WAV",
            "framerate": 25,
            "duration": "00:04:01",
            "fileTC": "00:00:00:00",
            "audioTC": "13:03:27:12"
        }],
        searchRecursive: true,
        searchTarget: 0,
        ignoreMediaStart: true,
        overrideFramerate: false,
        method: "updateFromTimecodes",
        logTarget: 0,
        logging: false
    });
}