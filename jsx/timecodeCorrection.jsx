var timecodeCorrection = timecodeCorrection || {};

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


    cacheMediaObjects: function() {
        var i = 0;
        if (this.searchTarget === 0) {
            for (i = 0; i < app.project.rootItem.length; i++) {
                this.processProjectItem(rootItem[i]);
            }
        } else if (this.searchTarget === 1) {

        }
    },
    processProjectItem: function(projectItem) {
        var i = 0;

        if (projectItem.type === ProjectItemTypes.clip) {
            //@Todo export to function
            var item = {};
            item.projectItem = projectItem;
            item.name = projectItem.name;
            
            var projectItemXMP = new XMPMeta(projectItem.getXMPMetadata());
            item.duration = projectItemXMP.getProperty(kPProPrivateProjectMetadataURI, 'MediaDuration');
            item.startTime = projectItemXMP.getProperty(kPProPrivateProjectMetadataURI, 'MediaStart');

            var footageInterpretation = projectItem.getFootageInterpretation();
            item.framerate = footageInterpretation.framerate;

            this.media.push(item);
        } else if (projectItem.type === ProjectItemTypes.bin && this.searchRecursive) {
            for (i = 0; i < projectItem.children.length; i++) {
                this.processProjectItem(projectItem.children[i]);
            }
        }
    },
        /*
        @ToDo
        *iterate through selection / project tree
        *add Media zu media array -> add object reference + name + duration + starttiem as extra values
        *push result object to media array
        */

    processInput: function (tcObject) {
        if (this.setValues(tcObject)) {
            this.cacheMediaObjects();
            this.timeValuesToInt();
        }
        
    },
    setValues: function (tcObject) {
        if (tcObject.timecodes !== undefined && tcObject.timescodes.length !== 0 && tcObject.searchRecursive !== undefined && tcObject.searchTarget !== undefined) {
            this.timecodeUpdates = timecodes;
            this.searchRecursive = tcObject.searchRecursive;
            this.searchTarget = tcObject.searchTarget;
            return true;
        }
        return false;
    },

    timeValuesToInt: function() {
        var i = 0;ä
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
    }
};
