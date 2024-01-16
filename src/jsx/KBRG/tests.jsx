#include 'KBRG_TimecodeCorrection.jsx';

var timeCorrection = $.agrarvolution.timecodeCorrection;

//timeCorrection.cacheMediaObjects();
//timeCorrection.processInput(tcObject);
//timeCorrection.updateTimeCodes();

//timeCorrection.metaDataOfSelected();

// timeCorrection.timecodesFromMetadata({
//     searchTarget: 0,
//     source: $.agrarvolution.timecodeCorrection.TIMECODE_SOURCE.lastChanged,
//     framerate: "5994",
//     overrideFramerate: true,
//     logging: true
// });

/*
csvTimecodes = JSON.parse('[{"filename":"NZ6_9872.MOV","framerate":25,"duration":{"text":"00:02:55","groups":{"hours":0,"minutes":2,"seconds":55,"frames":null}},"fileTC":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}},"audioTC":{"text":"15:23:48:06","groups":{"hours":15,"minutes":23,"seconds":48,"frames":6}}},{"filename":"NZ6_9926.MOV","framerate":25,"duration":{"text":"00:04:20","groups":{"hours":0,"minutes":4,"seconds":20,"frames":null}},"fileTC":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}},"audioTC":{"text":"15:28:28:15","groups":{"hours":15,"minutes":28,"seconds":28,"frames":15}}},{"filename":"NZ6_6336.MOV","framerate":25,"duration":{"text":"00:00:23","groups":{"hours":0,"minutes":0,"seconds":23,"frames":null}},"fileTC":{"text":"16:18:43:09","groups":{"hours":16,"minutes":18,"seconds":43,"frames":9}},"audioTC":{"text":"15:17:08:07","groups":{"hours":15,"minutes":17,"seconds":8,"frames":7}}},{"filename":"NZ6_6339.MOV","framerate":25,"duration":{"text":"00:01:01","groups":{"hours":0,"minutes":1,"seconds":1,"frames":null}},"fileTC":{"text":"16:19:30:24","groups":{"hours":16,"minutes":19,"seconds":30,"frames":24}},"audioTC":{"text":"15:17:55:21","groups":{"hours":15,"minutes":17,"seconds":55,"frames":21}}},{"filename":"NZ6_6268.MOV","framerate":25,"duration":{"text":"00:00:38","groups":{"hours":0,"minutes":0,"seconds":38,"frames":null}},"fileTC":{"text":"16:06:29:05","groups":{"hours":16,"minutes":6,"seconds":29,"frames":5}},"audioTC":{"text":"15:04:54:01","groups":{"hours":15,"minutes":4,"seconds":54,"frames":1}}},{"filename":"NZ6_6269.MOV","framerate":25,"duration":{"text":"00:00:21","groups":{"hours":0,"minutes":0,"seconds":21,"frames":null}},"fileTC":{"text":"16:07:12:03","groups":{"hours":16,"minutes":7,"seconds":12,"frames":3}},"audioTC":{"text":"15:05:36:24","groups":{"hours":15,"minutes":5,"seconds":36,"frames":24}}},{"filename":"NZ6_6270.MOV","framerate":25,"duration":{"text":"00:00:05","groups":{"hours":0,"minutes":0,"seconds":5,"frames":null}},"fileTC":{"text":"16:09:23:14","groups":{"hours":16,"minutes":9,"seconds":23,"frames":14}},"audioTC":{"text":"15:07:48:14","groups":{"hours":15,"minutes":7,"seconds":48,"frames":14}}},{"filename":"NZ6_6271.MOV","framerate":25,"duration":{"text":"00:00:11","groups":{"hours":0,"minutes":0,"seconds":11,"frames":null}},"fileTC":{"text":"16:10:44:13","groups":{"hours":16,"minutes":10,"seconds":44,"frames":13}},"audioTC":{"text":"15:09:09:08","groups":{"hours":15,"minutes":9,"seconds":9,"frames":8}}},{"filename":"NZ6_6272.MOV","framerate":25,"duration":{"text":"00:00:41","groups":{"hours":0,"minutes":0,"seconds":41,"frames":null}},"fileTC":{"text":"16:12:05:07","groups":{"hours":16,"minutes":12,"seconds":5,"frames":7}},"audioTC":{"text":"15:10:30:05","groups":{"hours":15,"minutes":10,"seconds":30,"frames":5}}},{"filename":"NZ6_6285.MOV","framerate":25,"duration":{"text":"00:00:30","groups":{"hours":0,"minutes":0,"seconds":30,"frames":null}},"fileTC":{"text":"16:13:28:00","groups":{"hours":16,"minutes":13,"seconds":28,"frames":0}},"audioTC":{"text":"15:11:52:23","groups":{"hours":15,"minutes":11,"seconds":52,"frames":23}}},{"filename":"NZ6_6286.MOV","framerate":25,"duration":{"text":"00:00:21","groups":{"hours":0,"minutes":0,"seconds":21,"frames":null}},"fileTC":{"text":"16:14:06:03","groups":{"hours":16,"minutes":14,"seconds":6,"frames":3}},"audioTC":{"text":"15:12:30:24","groups":{"hours":15,"minutes":12,"seconds":30,"frames":24}}},{"filename":"NZ6_6295.MOV","framerate":25,"duration":{"text":"00:00:14","groups":{"hours":0,"minutes":0,"seconds":14,"frames":null}},"fileTC":{"text":"16:14:57:21","groups":{"hours":16,"minutes":14,"seconds":57,"frames":21}},"audioTC":{"text":"15:13:22:18","groups":{"hours":15,"minutes":13,"seconds":22,"frames":18}}},{"filename":"NZ6_6296.MOV","framerate":25,"duration":{"text":"00:00:18","groups":{"hours":0,"minutes":0,"seconds":18,"frames":null}},"fileTC":{"text":"16:15:20:10","groups":{"hours":16,"minutes":15,"seconds":20,"frames":10}},"audioTC":{"text":"15:13:45:07","groups":{"hours":15,"minutes":13,"seconds":45,"frames":7}}},{"filename":"NZ6_6297.MOV","framerate":25,"duration":{"text":"00:00:16","groups":{"hours":0,"minutes":0,"seconds":16,"frames":null}},"fileTC":{"text":"16:16:11:02","groups":{"hours":16,"minutes":16,"seconds":11,"frames":2}},"audioTC":{"text":"15:14:36:00","groups":{"hours":15,"minutes":14,"seconds":36,"frames":0}}},{"filename":"NZ6_6318.MOV","framerate":25,"duration":{"text":"00:00:11","groups":{"hours":0,"minutes":0,"seconds":11,"frames":null}},"fileTC":{"text":"16:17:05:08","groups":{"hours":16,"minutes":17,"seconds":5,"frames":8}},"audioTC":{"text":"15:15:30:03","groups":{"hours":15,"minutes":15,"seconds":30,"frames":3}}},{"filename":"NZ6_6319.MOV","framerate":25,"duration":{"text":"00:00:04","groups":{"hours":0,"minutes":0,"seconds":4,"frames":null}},"fileTC":{"text":"16:17:21:09","groups":{"hours":16,"minutes":17,"seconds":21,"frames":9}},"audioTC":{"text":"15:15:46:07","groups":{"hours":15,"minutes":15,"seconds":46,"frames":7}}},{"filename":"NZ6_6320.MOV","framerate":25,"duration":{"text":"00:00:14","groups":{"hours":0,"minutes":0,"seconds":14,"frames":null}},"fileTC":{"text":"16:17:50:15","groups":{"hours":16,"minutes":17,"seconds":50,"frames":15}},"audioTC":{"text":"15:16:15:13","groups":{"hours":15,"minutes":16,"seconds":15,"frames":13}}}]');
timeCorrection.processInput({
    timeCodes: csvTimecodes,
    searchRecursive: true,
    searchTarget: 2,
    ignoreMediaStart: true,
    logging: true
});*/

// var tcObject = JSON.parse('{"timeCodes":[{"filename":"GX010004.MP4","framerate":23.98,"duration":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}},"fileTC":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}},"audioTC":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}}},{"filename":"GX010005.MP4","framerate":23.98,"duration":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}},"fileTC":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}},"audioTC":{"text":"00:00:00:00","groups":{"hours":0,"minutes":0,"seconds":0,"frames":0}}}],"searchRecursive":true,"searchTarget":0,"ignoreMediaStart":true,"overrideFramerate":false,"logging":true}');
// var tcObject = JSON.parse('{"timeCodes":[{"filename":"GX010004.MP4","framerate":23.98,"duration":{"text":"00:00:10","groups":{"hours":0,"minutes":0,"seconds":10,"frames":null}},"fileTC":{"text":"22:46:08:18","groups":{"hours":22,"minutes":46,"seconds":8,"frames":18}},"audioTC":{"text":"21:49:13:08","groups":{"hours":21,"minutes":49,"seconds":13,"frames":8}}},{"filename":"GX010005.MP4","framerate":23.98,"duration":{"text":"00:00:06","groups":{"hours":0,"minutes":0,"seconds":6,"frames":null}},"fileTC":{"text":"21:49:29:21","groups":{"hours":21,"minutes":49,"seconds":29,"frames":21}},"audioTC":{"text":"21:49:29:20","groups":{"hours":21,"minutes":49,"seconds":29,"frames":20}}}],"searchRecursive":true,"searchTarget":0,"ignoreMediaStart":true,"overrideFramerate":true,"logging":true}');
// timeCorrection.processInput(tcObject);
/*
timeCorrection.revertChanges({
    searchTarget: 2,
    recursive: true,
    logging: true
});*/

// timeCorrection.fixXmpTimeFormat({
//     framerate: 50,
//     searchTarget: $.agrarvolution.timecodeCorrection.SCAN_TARGET.selection,
//     recursive: 1,
//     logging: true,
//     errorOnly: false
// });


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