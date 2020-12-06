#include './PPRO/TimecodeCorrection.jsx'
#include './PPRO/Premiere.jsx'


var tcObject = {
    timeCodes: [
        {
            "fileName": "NZ6_0394.MOV",
            "framerate": 2500,
            "duration": {
                "text": "00:00:05",
                "groups": {
                    "hours": 0,
                    "minutes": 0,
                    "seconds": 5
                }
            },
            "fileTC": {
                "text": "15:21:06:07",
                "groups": {
                    "hours": 15,
                    "minutes": 21,
                    "seconds": 6,
                    "frames": 7
                }
            },
            "audioTC": {
                "text": "08:22:12:18",
                "groups": {
                    "hours": 8,
                    "minutes": 22,
                    "seconds": 12,
                    "frames": 18
                }
            }
        }
    ],
    searchRecursive: true,
    searchTarget: 0,
    ignoreMediaStart: true,
    logging: true
};
var timeCorrection = $.timecodeCorrection;
//timeCorrection.cacheMediaObjects();
timeCorrection.processInput(tcObject);
//timeCorrection.updateTimeCodes();
