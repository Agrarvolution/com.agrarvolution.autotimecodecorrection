#include 'KBRG_TimecodeCorrection.jsx';

tests();

function tests() {
    var cache = new CacheThumbnails({
        searchTarget: Agrarvolution.timecodeCorrection.SCAN_TARGET.folder,
        logTarget: Agrarvolution.CEP_PANEL.correction,
        logging: true
    });
    $.writeln("Test cache toString():\n" + cache);
    $.writeln("Test cache toCSV():\n" + cache.toTimecodeCSV());

    cache.updateCache({}, CacheThumbnails.PROCESS_METHODS.revertTimeCode);
    $.writeln("Test revert time values stored in cache:\n" + cache);

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
    
}

//Check WAV not saving metadata
/*csvTimecodes = JSON.parse('[{"filename":"221111_001.WAV","framerate":25,"duration":{"text":"00:00:22","groups":{"hours":0,"minutes":0,"seconds":22,"frames":null}},"fileTC":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}},"audioTC":{"text":"21:50:58:18","groups":{"hours":21,"minutes":50,"seconds":58,"frames":18}}},{"filename":"NZ6_3653.MOV","framerate":25,"duration":{"text":"00:00:14","groups":{"hours":0,"minutes":0,"seconds":14,"frames":null}},"fileTC":{"text":"20:47:36:10","groups":{"hours":20,"minutes":47,"seconds":36,"frames":10}},"audioTC":{"text":"21:50:03:08","groups":{"hours":21,"minutes":50,"seconds":3,"frames":8}}}]');
timeCorrection.processInput({
    timeCodes: csvTimecodes,
    searchRecursive: true,
    searchTarget: 2,
    ignoreMediaStart: true,
    logging: true
});*/

//get csv data
/*
timeCorrection.gatherTimecodes({
    searchTarget: 2,
    recursive: true,
    logging: true
});*/