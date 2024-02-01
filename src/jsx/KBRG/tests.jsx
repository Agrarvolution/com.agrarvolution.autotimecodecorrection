#include 'KBRG_TimecodeCorrection.jsx';

if (app.eventHandlers) { //uses the fact, that app.eventhandlers is only available if the script is directly called to guard the test scripts
    tests();
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
}