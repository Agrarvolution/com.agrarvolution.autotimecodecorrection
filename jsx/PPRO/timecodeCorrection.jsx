#include '../json2.js'

//add XMP context
if (ExternalObject.AdobeXMPScript === undefined) {

     ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');

}
//add event context
try {
    var xLib = new ExternalObject("lib:PlugPlugExternalObject");
} catch (e) {
    alert(e);
}

$.timecodeCorrection = $.timecodeCorrection || {
    ProjectItemTypes: {
        bin: 2,
        clip: 1,
        file: 4,
        root: 3
    },
    logLevels: {
        critical: "CRIT",
        status: "STAT",
        info: "INFO",
        error: "ERR "
    },
    kPProPrivateProjectMetadataURI: "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/",
    media: [],
    timecodeUpdates: [],
    searchRecursive: true,
    searchTarget: 1, //0: root, 1: selection
    ignoreMediaStart: true,
    timeTicks: 254016000000,

    cacheMediaObjects: function() {
        var i = 0;
        this.media = [];

        if (this.searchTarget === 0) {
            for (i = 0; i < app.project.rootItem.children.length; i++) {
                this.processProjectItem(app.project.rootItem.children[i]);
            }
        } else if (this.searchTarget === 1) {
            var viewIDs = app.getProjectViewIDs();
            if (viewIDs === undefined) {
                return false;
            }
            for (i = 0; i < viewIDs.length; i++) {
                var currentProject = app.getProjectFromViewID(viewIDs[i]);

                if (currentProject.documentID === app.project.documentID) {
                    var selectedItems = app.getProjectViewSelection(viewIDs[i]);
                    
                    if (selectedItems !== undefined) {
                        for (i = 0; i < selectedItems.length; i++) {
                            this.processProjectItem(selectedItems[i]);
                        }
                    }  
                }
            }            
        }

        if (this.splitTimes()) {
            this.logToCEP("Processing time strings was successfull.", this.logLevels.info);
        } else {
            this.logToCEP("Processing time strings was unsuccessfull.", this.logLevels.critical);
            return false;
        }

        var mediaLog = this.media;
        for (var i = 0; i < mediaLog.length; i++) {
            mediaLog[i].projectItem = "[ProjectItem - Object]";
        }
        this.logToCEP(this.media.length + " media files have been discovered in " + this.searchTarget === 0 ? "project" ? 
            this.searchTarget === 1 ? "selection" + ": " + JSON.stringify(mediaLog), this.logLevels.info);
    },
    processProjectItem: function(projectItem) {
        var i = 0;

        if (!projectItem.isSequence() && projectItem.type === this.ProjectItemTypes.clip) {
            var item = {};
            item.projectItem = projectItem;
            item.name = projectItem.name;
            
            var projectItemXMP = new XMPMeta(projectItem.getProjectMetadata());

            item.duration = '';
            if (projectItemXMP.doesPropertyExist(this.kPProPrivateProjectMetadataURI, 'Column.Intrinsic.VideoDuration') === true) {
                item.duration = projectItemXMP.getProperty(this.kPProPrivateProjectMetadataURI, 'Column.Intrinsic.VideoDuration');
                item.duration = item.duration.value;
            }

            item.startTime = '';
            if (projectItemXMP.doesPropertyExist(this.kPProPrivateProjectMetadataURI, 'Column.Intrinsic.MediaStart') === true) {
                item.startTime = projectItemXMP.getProperty(this.kPProPrivateProjectMetadataURI, 'Column.Intrinsic.MediaStart');
                item.startTime = item.startTime.value
            }
            
            var footageInterpretation = projectItem.getFootageInterpretation();
            item.frameRate = footageInterpretation.frameRate;

            this.media.push(item);
        } else if (!projectItem.isSequence() && projectItem.type === this.ProjectItemTypes.bin && this.searchRecursive) {
            for (i = 0; i < projectItem.children.length; i++) {
                this.processProjectItem(projectItem.children[i]);
            }
        } 
    },

    splitTimesToNumbers: function(){
        for (var i = 0; i < this.media.length; i++) {
            var durationMatch = this.splitTimeToNumber(this.media[i].duration, this.media[i].frameRate);
            if (!durationMatch) {
                this.logToCEP(this.media[i].name + " - Couldn't process duration. (" + this.media[i].duration + ")", this.logLevels.status);
                return false;
            }
            var startTimeMatch = this.splitTimeToNumber(this.media[i].startTime, this.media[i].frameRate);
            if (!durationMatch) {
                this.logToCEP(this.media[i].name + " - Couldn't process start time. (" + this.media[i].startTime + ")", this.logLevels.status);
                return false;
            }
        }
        return true;
    },
    splitTimeToNumber: function(timeText, frameRate) {
        var hmsfPattern = /^((\d\d?)[:;])?(\d\d?)[:;](\d\d?)[:;](\d\d?\d?)$/g;
        var match = hmsfPattern.exec(timeText);
        match = this.validateTime(match, frameRate);
        if (!match) {
            return false;
        }
        return match;
    }

    validateTime: function (time, framerate) {
        if (time === undefined || time == null || time.groups === undefined || time.groups == null) {
            return false;
        }

        time.groups.hours = Number(time[1]);
        time.groups.minutes = Number(time[2]);
        time.groups.seconds = Number(time[3]);
        time.groups.frames = Number(time[4]);

        if (time.length < 4 || time.length > 6) {
            return false;
        }

        if (time.groups.hour > 24 && time.groups.minutes > 60 && time.groups.seconds > 60 && 
            time.groups.frames !== NaN && time.groups.frames > framerate) {
            return false
        }

        return {
            text: time[0],
            groups: time.groups,
        };
    },

    updateTimeCodes: function() {
        var i,j = 0;
        for (i = 0; i < this.timecodeUpdates.length; i++) {
            for (j = 0; j < this.media.length; j++) {
                if (this.timecodeUpdates[i].name.toUpperCase() === this.media[j].name.toUpperCase() && 
                this.compareTimes(this.timecodeUpdates.duration[i].groups, this.media.duration[j]) &&
                this.ignoreMediaStart ? true : this.compareTimes(this.timecodeUpdates[i].fileTC.groups, this.media.startTime[j])) {
                    changeStartTime(this.timecodeUpdates[i], this.media[j]);
                }
            }
        }
        return true;
    },
    compareTimes: function(timeObj1, timeObj2) {
        if (timeObj1.hours != null && timeObj1.hours != null && timeObj1.hours === timeObj2.hours &&
        timeObj1.minutes === timeObj2.minutes && timeObj1.seconds === timeObj2.seconds && timeObj1.frames === timeObj2.frames) {
            return true
        }
        return false;
    },
    changeStartTime: function(update, projectItem) {
        var newStartTime = (((update.audioTC.groups.hours*60 + update.audioTC.groups.minutes)*60) + update.audioTC.groups.seconds + 
            (update.audioTC.groups.frames*100)/update.framerate) * timeTicks;

        if (newStartTime) {
            projectItem.setStartTime(new Time(newStartTime));
            this.logToCEP(projectItem.name + " - start time / timecode has been updated. (" + projectItem.startTime.text + "->" + 
                update.audioTC.text + ")", this.logLevels.info);
            return true;
        }

        this.logToCEP(projectItem.name + " - failed to update start time / timecode. (" + projectItem.startTime.text + "->" + 
                update.audioTC.text + ")", this.logLevels.error);
        return false;
    },

    processInput: function (tcObject) {
        if (this.setValues(tcObject) && this.cacheMediaObjects() && this.updateTimeCodes()) {
            return true;
        }
        return false;
    },
    setValues: function (tcObject) {
        this.logToCEP(tcObject, this.logLevels.info);
        if (tcObject !== undefined && tcObject.timeCodes !== undefined && tcObject.timeCodes.length !== undefined
        && tcObject.searchRecursive !== undefined && tcObject.searchTarget !== undefined && 
        tcObject.ignoreMediaStart !== undefined) {
            this.timecodeUpdates = tcObject.timecodes;
            this.searchRecursive = tcObject.searchRecursive;
            this.searchTarget = tcObject.searchTarget;
            this.ignoreMediaStart = tcObject.ignoreMediaStart;
            this.logToCEP("Values have succesfully arrived in host.", this.logLevels.info);
            
            return this.timeValuesToInt();
        }
        return false;
    },

    timeValuesToInt: function() {
        var i = 0;
        for (i = 0; i < this.media.length; i++) {
            if (this.media[i].hours) {
                this.media[i].hours = Number(this.media[i].hours);
            }
            if (this.media[i].minutes) {
                this.media[i].minutes = Number(this.media[i].minutes);
            }
            if (this.media[i].seconds) {
                this.media[i].seconds = Number(this.media[i].seconds);
            }
            if (this.media[i].frames) {
                this.media[i].frames = Number(this.media[i].frames);
            }
        }
        this.logToCEP("Inputs times have been converted to numbers.", this.logLevels.info);
        return true;
    },

    logToCEP: function(text, logLevel) {
        if (xLib) {
            var eventObj = new CSXSEvent();
            eventObj.type = "com.adobe.csxs.events.cepLogging";
            eventObj.data = JSON.stringify({text: text, logLevel: logLevel});
            eventObj.dispatch(); 
        }
    },

    alert: function() {
        alert("Alert from timecodeCorrection.processing");
    }
};

