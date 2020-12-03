var timecodeProcessing = timecodeProcessing || {};

var ProjectItemTypes = {
    bin: "BIN",
    clip: "CLIP",
    file: "FILE",
    root: "ROOT"
}
var kPProPrivateProjectMetadataURI = "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/";

timecodeProcessing.media = [];
timecodeProcessing.timecodeUpdates = [];
timecodeProcessing.searchRecursive = true;
timecodeProcessing.searchTarget = 0; //0: root, 1: selection

timecodeProcessing.mediaLookup = {
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

            media.push(item);
        } else if (projectItem.type === ProjectItemTypes.bin && this.searchRecursive) {
            for (i = 0; i < projectItem.children.length; i++) {
                this.processProjectItem(projectItem.children[i]);
            }
        }
    }
        /*
        @ToDo
        *iterate through selection / project tree
        *add Media zu media array -> add object reference + name + duration + starttiem as extra values
        *push result object to media array
        */
    }
};

timecodeProcessing.timecodeChange = {
    processInput: function (tcObject) {
        if (this.setValues(tcObject)) {
            this.cacheMediaObjects();
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
}
1;