#include '../json2.js'

//add XMP context
if (ExternalObject.AdobeXMPScript === undefined) {

     ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');

}
//add event context
/*try {
    var xLib = new ExternalObject("lib:\\PlugPlugExternalObject");
} catch (e) {
    alert(e);
}*/

$.timecodeCorrection = $.timecodeCorrection || {
    ProjectItemTypes: {
        bin: 2,
        clip: 1,
        file: 4,
        root: 3
    },
    kPProPrivateProjectMetadataURI: "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/",
    media: [],
    timecodeUpdates: [],
    searchRecursive: true,
    searchTarget: 1, //0: root, 1: selection
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
        
       alert(JSON.stringify(this.media));
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
            //alert(JSON.lave(item));
        } else if (!projectItem.isSequence() && projectItem.type === this.ProjectItemTypes.bin && this.searchRecursive) {
            for (i = 0; i < projectItem.children.length; i++) {
                this.processProjectItem(projectItem.children[i]);
            }
        } 
    },

    updateTimecodes: function() {
        var i,j = 0;
        for (i = 0; i < this.timecodeUpdates.length; i++) {
            for (j = 0; j < this.media.length; j++) {
                if (this.timecodeUpdates[i].name === this.media.name[j] && this.timecodeUpdates.duration[i] === this.media.duration[j] &&
                this.timecodeUpdates[i].fileTC === this.media.startTime[j]) {
                    changeStartTime(this.timecodeUpdates[i], this.media[j]);
                }
            }
        }
    },
    changeStartTime: function(update, projectItem) {
        var newStartTime = (((update.hours*60 + update.minutes)*60) + update.seconds + (update.frames*100)/update.framerate) * timeTicks;
        if (newStartTime) {
            projectItem.setStartTime(new Time(newStartTime));
        }
    },

    processInput: function (tcObject) {
        alert("test");
        alert(JSON.stringify(tcObject));
        if (this.setValues(tcObject)) {
            this.cacheMediaObjects();
            this.timeValuesToInt();
        }
        
    },
    setValues: function (tcObject) {
        if (tcObject.timecodes !== undefined && tcObject.timescodes.length !== 0 && 
        tcObject.searchRecursive !== undefined && tcObject.searchTarget !== undefined) {
            this.timecodeUpdates = tcObject.timecodes;
            this.searchRecursive = tcObject.searchRecursive;
            this.searchTarget = tcObject.searchTarget;
            return true;
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
    },

    logToCEP: function(text) {
        var eventObj = new CSXSEvent();
		eventObj.type = "com.adobe.csxs.events.cepLogging";
		eventObj.data = text;
		eventObj.dispatch(); 
    },

    alert: function() {
        alert("Alert from timecodeCorrection.processing");
    }
};

