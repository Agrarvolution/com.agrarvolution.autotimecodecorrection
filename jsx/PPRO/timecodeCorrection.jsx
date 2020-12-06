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
    timeCodeUpdates: [],
    searchRecursive: true,
    searchTarget: 1, //0: root, 1: selection
    ignoreMediaStart: true,
    timeTicks: 254016000000,
    logging: true,

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

        if (this.splitTimesToNumbers()) {
            this.logToCEP("Processing time strings was successfull.", this.logLevels.info);
        } else {
            this.logToCEP("Processing time strings was unsuccessfull.", this.logLevels.critical);
            return false;
        }

        var method = "";
        switch (this.searchTarget) {
            case 0: 
                method = "project";
                break;
            case 1:
                method = "selection";
                break;
        }
        if (this.logging) {
            this.logToCEP(this.media.length + " media files have been discovered in " + method + ": " + JSON.stringify(this.media), this.logLevels.info);
        }
        return true;
    },
    processProjectItem: function(projectItem) {
        var i = 0;

        if (!projectItem.isSequence() && projectItem.type === this.ProjectItemTypes.clip) {
            var item = {};
            item.projectItem = projectItem;
            item.fileName = projectItem.name;
            item.nodeId = projectItem.nodeId;

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
            this.media[i].duration = durationMatch;

            var startTimeMatch = this.splitTimeToNumber(this.media[i].startTime, this.media[i].frameRate);
            if (!startTimeMatch) {
                this.logToCEP(this.media[i].name + " - Couldn't process start time. (" + this.media[i].startTime + ")", this.logLevels.status);
                return false;
            }
            this.media[i].startTime = startTimeMatch;
        }
        return true;
    },
    splitTimeToNumber: function(timeText, frameRate) {
        var hmsfPattern = /^([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,2})[:;]([\d]{1,})$/g;
        var match = hmsfPattern.exec(timeText);
        match = this.validateTime(match, frameRate);
        if (!match) {
            return false;
        }
        return match;
        alert(JSON.stringify(match));
    },

    validateTime: function (time, framerate) {
        if (time === undefined || time == null) {
            return false;
        }
        var groups = {};
        groups.hours = Number(time[1]); 
        groups.minutes = Number(time[2]); 
        groups.seconds = Number(time[3]); 
        groups.frames = Number(time[4]);


        if (groups.hour > 24 && groups.minutes > 60 && groups.seconds > 60 && 
            groups.frames !== NaN && groups.frames > framerate) {
            return false
        }

        return {
            text: time[0],
            groups: groups,
        };
    },

    updateTimeCodes: function() {
        this.logToCEP(JSON.stringify(this), this.logLevels.info);
        var i = 0,j = 0;
        if (!(this.timeCodeUpdates !== undefined && this.media !== undefined)) {
            return false;
        }

        for (i = 0; i < this.timeCodeUpdates.length; i++) {
            for (j = 0; j < this.media.length; j++) {
                if (this.timeCodeUpdates[i].fileName.toUpperCase() === this.media[j].fileName.toUpperCase() && 
                this.compareTimes(this.timeCodeUpdates[i].duration.groups, this.media[j].duration.groups) && 
                    (this.ignoreMediaStart ? true : this.compareTimes(this.timeCodeUpdates[i].fileTC.groups, this.media[j].startTime.groups))
                ) { // 
                    
                    alert("Change!");
                    //changeStartTime(this.timeCodeUpdates[i], this.media[j]);
                }
            }
        }
        return true;
    },
    compareTimes: function(timeObj1, timeObj2) {
        if (timeObj1.hours === timeObj2.hours && timeObj1.minutes === timeObj2.minutes && 
        timeObj1.seconds === timeObj2.seconds && (timeObj1.frames === NaN || timeObj2.frames === NaN) ? true : timeObj1.frames === timeObj2.frames) {
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
        if (tcObject !== undefined && tcObject.timeCodes !== undefined && tcObject.timeCodes.length !== undefined
        && tcObject.searchRecursive !== undefined && tcObject.searchTarget !== undefined && 
        tcObject.ignoreMediaStart !== undefined) {
            this.timeCodeUpdates = tcObject.timeCodes;
            this.searchRecursive = tcObject.searchRecursive;
            this.searchTarget = tcObject.searchTarget;
            this.ignoreMediaStart = tcObject.ignoreMediaStart;
            this.logging = tcObject.logging
            this.logToCEP("Values have succesfully arrived in host.", this.logLevels.info);
            
            return this.parseTimeGroups();
        }
        return false;
    },

    parseTimeGroups: function() {
        var i = 0;
        for (i = 0; i < this.timeCodeUpdates.length; i++) {
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].duration.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couln't parse duration. (" + this.timeCodeUpdates[i].duration.text + ")", this.logLevels.status);
                return false;
            }
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].fileTC.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couln't parse file timecode. (" + this.timeCodeUpdates[i].fileTC.text + ")", this.logLevels.status);
                return false;
            }
            if (!this.timeValuesToInt(this.timeCodeUpdates[i].audioTC.groups)) {
                this.logToCEP(this.timeCodeUpdates[i].name + " - Couln't parse audio timecode. (" + this.timeCodeUpdates[i].audioTC.text + ")", this.logLevels.status);
                return false;
            }
        }
        this.logToCEP("Inputs times have been converted to numbers.", this.logLevels.info);
        return true;
    },
    timeValuesToInt: function(group) {
        if (group) {
            if (group.hours) {
               group.hours = Number(group.hours);
            }
            if (group.minutes) {
                group.minutes = Number(group.minutes);
            }
            if (group.seconds) {
                group.seconds = Number(group.seconds);
            }
            if (group.frames) {
                group.frames = Number(group.frames);
            }
            return true;
        }
        return false;
    },

    
    logToCEP: function(text, logLevel) {
        if (xLib && this.logging) {
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

