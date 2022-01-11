#include 'KBRG_TimecodeCorrection.jsx';

var timeCorrection = $.agrarvolution.timecodeCorrection;

//timeCorrection.cacheMediaObjects();
//timeCorrection.processInput(tcObject);
//timeCorrection.updateTimeCodes();

//timeCorrection.metaDataOfSelected();
/*
timeCorrection.timecodesFromMetadata({
    searchTarget: 1,
    source: 2,
    logging: true
});
*/
/*
csvTimecodes = JSON.parse('[{"filename":"NZ6_0252.MOV","framerate":25,"duration":{"text":"00:00:12","groups":{"hours":0,"minutes":0,"seconds":12,"frames":null}},"fileTC":{"text":"10:37:27:20","groups":{"hours":10,"minutes":37,"seconds":27,"frames":20}},"audioTC":{"text":"13:37:27:20","groups":{"hours":13,"minutes":37,"seconds":27,"frames":20}}},{"filename":"NZ6_0394.MOV","framerate":25,"duration":{"text":"00:00:05","groups":{"hours":0,"minutes":0,"seconds":5,"frames":null}},"fileTC":{"text":"15:21:06:07","groups":{"hours":15,"minutes":21,"seconds":6,"frames":7}},"audioTC":{"text":"08:22:12:18","groups":{"hours":8,"minutes":22,"seconds":12,"frames":18}}}]');
timeCorrection.processInput({
    timeCodes: csvTimecodes,
    searchRecursive: true,
    searchTarget: 2,
    ignoreMediaStart: true,
    logging: true
});*/

/*
timeCorrection.revertChanges({
    searchTarget: 2,
    recursive: true,
    logging: true
});*/
/*
timeCorrection.fixXmpTimeFormat({
    framerate: 25,
    searchTarget: 2,
    recursive: 1,
    logging: true,
    errorOnly: false
});*/