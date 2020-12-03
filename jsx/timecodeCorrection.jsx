var timecodeCorrection = timecodeCorrection || {};

/*Setup eventlistener*/
/*try {
    var xLib = new ExternalObject("lib:\\PlugPlugExternalObject");
} catch (e) {
    alert(e);
}*/

timecodeCorrection.processing = {
    ProjectItemTypes: {
        bin: "BIN",
        clip: "CLIP",
        file: "FILE",
        root: "ROOT"
    },
    kPProPrivateProjectMetadataURI: "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/",
    media: [],
    timecodeUpdates: [],
    searchRecursive: true,
    searchTarget: 0, //0: root, 1: selection
    timeTicks: 254016000000,

    cacheMediaObjects: function() {
        var i = 0;
        if (this.searchTarget === 0) {
            for (i = 0; i < app.project.rootItem.length; i++) {
                if (!selectItems[i].isSequence()) {
                    this.processProjectItem(rootItem[i]);
                }
            }
        } else if (this.searchTarget === 1) {
            var viewIDs = app.getProjectViewIDs();
            for (i = 0; i < viewIDs.length; i++) {
                var currentProject = app.getProjectFromViewID(viewIDs[i]);

                if (currentProject.documentID === app.project.documentID) {
                    var selectedItems = app.getProjectViewSelection(viewIDs[i]);
                    
                    for (i = 0; i < selectedItems.length; i++) {
                        this.processProjectItem(selectedItems[i]);
                    }
                }
            }            
        }
    },
    processProjectItem: function(projectItem) {
        var i = 0;

        if (!projectItem.isSequence() && projectItem.type === this.ProjectItemTypes.clip) {
            var item = {};
            item.projectItem = projectItem;
            item.name = projectItem.name;
            
            var projectItemXMP = new XMPMeta(projectItem.getXMPMetadata());
            item.duration = projectItemXMP.getProperty(kPProPrivateProjectMetadataURI, 'MediaDuration');
            item.startTime = projectItemXMP.getProperty(kPProPrivateProjectMetadataURI, 'MediaStart');

            var footageInterpretation = projectItem.getFootageInterpretation();
            item.framerate = footageInterpretation.framerate;

            this.media.push(item);
        } else if (projectItem.type === this.ProjectItemTypes.bin && this.searchRecursive) {
            for (i = 0; i < projectItem.children.length; i++) {
                this.processProjectItem(projectItem.children[i]);
            }
        } 
    },

    updateTimecodes: function() {
        var i,j = 0;
        for (i = 0; i < timecodeUpdates.length; i++) {
            for (j = 0; j < media.length; j++) {
                if (timecodeUpdates[i].name === media.name[j] && timecodeUpdates.duration[i] === media.duration[j] &&
                timecodeUpdates[i].fileTC === media.startTime[j]) {
                    changeStartTime(timecodeUpdates[i], media[j]);
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
    }
};
