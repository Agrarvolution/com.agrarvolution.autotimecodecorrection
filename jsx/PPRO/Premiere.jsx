/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2020 Adobe
* All Rights Reserved.
*
* NOTICE: Adobe permits you to use, modify, and distribute this file in
* accordance with the terms of the Adobe license agreement accompanying
* it. If you have received this file from a source other than Adobe,
* then your use, modification, or distribution of it requires the prior
* written permission of Adobe. 
**************************************************************************/

// time display types

var TIMEDISPLAY_24Timecode				= 100;
var TIMEDISPLAY_25Timecode				= 101;
var TIMEDISPLAY_2997DropTimecode		= 102;
var TIMEDISPLAY_2997NonDropTimecode		= 103;
var TIMEDISPLAY_30Timecode				= 104;
var TIMEDISPLAY_50Timecode				= 105;
var TIMEDISPLAY_5994DropTimecode		= 106;
var TIMEDISPLAY_5994NonDropTimecode		= 107;
var TIMEDISPLAY_60Timecode				= 108;
var TIMEDISPLAY_Frames					= 109;
var TIMEDISPLAY_23976Timecode			= 110;
var TIMEDISPLAY_16mmFeetFrames			= 111;
var TIMEDISPLAY_35mmFeetFrames			= 112;
var TIMEDISPLAY_48Timecode				= 113;
var TIMEDISPLAY_AudioSamplesTimecode	= 200;
var TIMEDISPLAY_AudioMsTimecode			= 201;
 
// field type constants

var FIELDTYPE_Progressive	= 0;
var FIELDTYPE_UpperFirst	= 1;
var FIELDTYPE_LowerFirst	= 2;

// audio channel types

var AUDIOCHANNELTYPE_Mono			= 0;
var AUDIOCHANNELTYPE_Stereo			= 1;
var AUDIOCHANNELTYPE_51				= 2;
var AUDIOCHANNELTYPE_Multichannel	= 3;
var AUDIOCHANNELTYPE_4Channel		= 4;
var AUDIOCHANNELTYPE_8Channel		= 5;
 
// vr projection type

var VRPROJECTIONTYPE_None				= 0;
var VRPROJECTIONTYPE_Equirectangular	= 1;
 
// vr stereoscopic type

var VRSTEREOSCOPICTYPE_Monoscopic		= 0;        
var VRSTEREOSCOPICTYPE_OverUnder		= 1;        
var VRSTEREOSCOPICTYPE_SideBySide		= 2;        

// constants used when clearing cache

var MediaType_VIDEO		= "228CDA18-3625-4d2d-951E-348879E4ED93"; // Magical constants from Premiere Pro's internal automation.
var MediaType_AUDIO		= "80B8E3D5-6DCA-4195-AEFB-CB5F407AB009";
var MediaType_ANY		= "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF";
		
var MediaType_Audio = 0;	// Constants for working with setting value. 
var MediaType_Video = 1;

var Colorspace_601 		= 0;
var Colorspace_709 		= 1;
var Colorspace_2020		= 2;
var Colorspace_2100HLG	= 3;

var BitPrecision_8bit	= 0;
var BitPrecision_10bit	= 1;
var BitPrecision_Float	= 2;
var BitPrecision_HDR	= 3;


var NOT_SET = "-400000";

$._PPP_={

	createDeepFolderStructure : function (foldersArray, maxDepth) {
		if (typeof foldersArray !== 'object' || foldersArray.length <= 0) {
			throw new Error('No valid folders array was provided!');
		}

		// if the first folder already exists, throw error
		for (var i = 0; i < app.project.rootItem.children.numItems; i++) {
			var curChild = app.project.rootItem.children[i];
			var binVal = ProjectItemType.BIN;
			if ((curChild.type === binVal) && (curChild.name === foldersArray[0])) {
				throw new Error('Folder with name "' + curChild.name + '" already exists!');
			}
		}
		// create the deep folder structure
		var currentBin = app.project.rootItem.createBin(foldersArray[0]);
		for (var m = 1; m < foldersArray.length && m < maxDepth; i++) {
			currentBin = currentBin.createBin(foldersArray[i]);
		}
	},

	getVersionInfo : function () {
		return 'PPro ' + app.version + 'x' + app.build;
	},

	getUserName : function () {
		var userName	= "User name not found.";
		var homeDir		= new File('~/');
		if (homeDir){
			userName = homeDir.displayName;
			homeDir.close();
		}
		return userName;
	},

	keepPanelLoaded : function () {
		app.setExtensionPersistent("com.adobe.PProPanel", 0); // 0, while testing (to enable rapid reload); 1 for "Never unload me, even when not visible."
	},

	updateAllGrowingFiles : function () {
		var numItems = app.project.rootItem.children.numItems;
		for (var i = 0; i < numItems; i++) {
			var currentItem = app.project.rootItem.children[i];
			if (currentItem) {
				currentItem.refreshMedia();
			}
		}
	},

	getSep : function () {
		if (Folder.fs === 'Macintosh') {
			return '/';
		} else {
			return '\\';
		}
	},

	saveProject : function () {
		app.project.save();
	},

	exportCurrentFrameAsPNG : function () {
		app.enableQE();
		var activeSequence = qe.project.getActiveSequence(); // note: make sure a sequence is active in PPro UI
		if (activeSequence) {
			// Create a file name, based on timecode of frame.
			var time = activeSequence.CTI.timecode; // CTI = Current Time Indicator.
			var removeThese = /:|;/ig; 				// Why? Because Windows chokes on colons in file names.
			time = time.replace(removeThese, '_');
			var outputPath = new File("~/Desktop");
			var outputFileName = outputPath.fsName + $._PPP_.getSep() + time + '___' + activeSequence.name;
			activeSequence.exportFramePNG(time, outputFileName);
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	renameProjectItem : function () {
		var item = app.project.rootItem.children[0]; // assumes the zero-th item in the project is footage.
		if (item) {
			item.name = item.name + ", updated by PProPanel.";
		} else {
			$._PPP_.updateEventPanel("No project items found.");
		}
	},

	getActiveSequenceName : function () {
		if (app.project.activeSequence) {
			return app.project.activeSequence.name;
		} else {
			return "No active sequence.";
		}
	},

	projectPanelSelectionChanged : function (eventObj) { // Note: This message is also triggered when the user opens or creates a new project. 
		var message = "";
		var projectItems	= eventObj;
		if (projectItems){
			if (projectItems.length) {
				var remainingArgs	=	projectItems.length;	
				var view			=	eventObj.viewID;
				message				=	remainingArgs + " items selected: ";
				
				for (var i = 0; i < projectItems.length; i++) {		// Concatenate selected project item names, into message. 
					message += projectItems[i].name;
					remainingArgs--;
					if (remainingArgs > 1) {
						message += ', ';
					}
					if (remainingArgs === 1) {
						message += ", and ";
					}
					if (remainingArgs === 0) {
						message += ".";
					}
				}
			} else {
				message = 'No items selected.';
			}
		} 
		$._PPP_.updateEventPanel(message);
	},

	registerProjectPanelSelectionChangedFxn : function () {
		app.bind("onSourceClipSelectedInProjectPanel", $._PPP_.projectPanelSelectionChanged);
	},

	registerItemsAddedToProjectFxn : function () {
		app.bind("onItemsAddedToProjectSuccess", $._PPP_.onItemsAddedToProject);
	},

	saveCurrentProjectLayout : function () {
		var currentProjPanelDisplay = app.project.getProjectPanelMetadata();
		if (currentProjPanelDisplay) {
			var outFileName			= 'Previous_Project_Panel_Display_Settings.xml';
			var actualProjectPath	= new File(app.project.path);
			var projDir 			= actualProjectPath.parent;
			if (actualProjectPath) {
				var completeOutputPath	= projDir + $._PPP_.getSep() + outFileName;
				var outFile				= new File(completeOutputPath);
				if (outFile) {
					outFile.encoding = "UTF8";
					outFile.open("w", "TEXT", "????");
					outFile.write(currentProjPanelDisplay);
					$._PPP_.updateEventPanel("Saved layout to next to the project.");
					outFile.close();
				}
				actualProjectPath.close();
			}
		} else {
			$._PPP_.updateEventPanel("Could not retrieve current project layout.");
		}
	},

	setProjectPanelMeta : function () {
		var filterString = "";
		if (Folder.fs === 'Windows') {
			filterString = "XML files:*.xml";
		}
		var fileToOpen = File.openDialog(	"Choose Project panel layout to open.",
											filterString,
											false);
		if (fileToOpen) {
			if (fileToOpen.fsName.indexOf('.xml')) { // We should really be more careful, but hey, it says it's XML!
				fileToOpen.encoding = "UTF8";
				fileToOpen.open("r", "TEXT", "????");
				var fileContents = fileToOpen.read();
				if (fileContents) {
					app.project.setProjectPanelMetadata(fileContents);
					$._PPP_.updateEventPanel("Updated layout from .xml file.");
				}
			}
		} else {
			$._PPP_.updateEventPanel("No valid layout file chosen.");
		}
	},

	exportSequenceAsPrProj : function () {
		var activeSequence	= app.project.activeSequence;
		if (activeSequence) {
			var startTimeOffset	= activeSequence.zeroPoint;
			var prProjExtension	= '.prproj';
			var outputName		= activeSequence.name;
			var outFolder		= Folder.selectDialog();
			if (outFolder) {
				var completeOutputPath = 	outFolder.fsName +
											$._PPP_.getSep() +
											outputName +
											prProjExtension;

				app.project.activeSequence.exportAsProject(completeOutputPath);

				$._PPP_.updateEventPanel("Exported " + app.project.activeSequence.name + " to " + completeOutputPath + ".");
			} else {
				$._PPP_.updateEventPanel("Could not find or create output folder.");
			}

			// Here's how to import N sequences from a project.
			//
			// var seqIDsToBeImported = new Array;
			// seqIDsToBeImported[0] = ID1;
			// ...
			// seqIDsToBeImported[N] = IDN;
			//
			//app.project.importSequences(pathToPrProj, seqIDsToBeImported);

		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	createSequenceMarkers : function () {
		var activeSequence = app.project.activeSequence;
		if (activeSequence) {
			var markers = activeSequence.markers;
			if (markers) {
				var numMarkers = markers.numMarkers;
				if (numMarkers > 0) {
					var marker_index = 1;
					for (var current_marker = markers.getFirstMarker(); current_marker !== undefined; current_marker = markers.getNextMarker(current_marker)) {
						if (current_marker.name !== "") {
							$._PPP_.updateEventPanel('Marker ' + marker_index + ' name = ' + current_marker.name + '.');
						} else {
							$._PPP_.updateEventPanel('Marker ' + marker_index + ' has no name.');
						}
						$._PPP_.updateEventPanel('Marker ' + marker_index + ' GUID = ' + current_marker.guid + '.');

						if (current_marker.end.seconds > 0) {
							$._PPP_.updateEventPanel('Marker ' + marker_index + ' duration = ' + (current_marker.end.seconds - current_marker.start.seconds) + ' seconds.');
						} else {
							$._PPP_.updateEventPanel('Marker ' + marker_index + ' has no duration.');
						}
						$._PPP_.updateEventPanel('Marker ' + marker_index + ' starts at ' + current_marker.start.seconds + ' seconds.');
						marker_index = marker_index + 1;
					}
				}
			}
			var tempTime					= new Time(); // Use a local time object to take care of all the tick math

			var newCommentMarker			= markers.createMarker(12.345);
			newCommentMarker.name			= 'Marker created by PProPanel.';
			newCommentMarker.comments		= 'Here are some comments, inserted by PProPanel.';
			tempTime.seconds				= 15.6789;
			newCommentMarker.end.ticks		= tempTime.ticks;

			var newWebMarker				= markers.createMarker(14.345);
			newWebMarker.name				= 'Web marker created by PProPanel.';
			newWebMarker.comments			= 'Here are some comments, inserted by PProPanel.';
			tempTime.seconds 			 	= 17.6789;
			newWebMarker.end.ticks			= tempTime.ticks;
			newWebMarker.setTypeAsWebLink("http://www.adobe.com", "frame target");
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	exportFCPXML : function () {
		if (app.project.activeSequence) {
			var projPath 		= new File(app.project.path);
			var parentDir 		= projPath.parent;
			var outputName 		= app.project.activeSequence.name;
			var xmlExtension 	= '.xml';
			var outputPath 		= Folder.selectDialog("Choose the output directory");

			if (outputPath) {
				var completeOutputPath = outputPath.fsName + $._PPP_.getSep() + outputName + xmlExtension;
				app.project.activeSequence.exportAsFinalCutProXML(completeOutputPath, 1); // 1 == suppress UI
				var info = "Exported FCP XML for " +
					app.project.activeSequence.name +
					" to " +
					completeOutputPath +
					".";
				$._PPP_.updateEventPanel(info);
			} else {
				$._PPP_.updateEventPanel("No output path chosen.");
			}
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	openInSource : function () {
		var filterString = "";
		if (Folder.fs === 'Windows') {
			filterString = "All files:*.*";
		}
		var fileToOpen = File.openDialog("Choose file to open.",
			filterString,
			false);
		if (fileToOpen) {
			
			// It's often desireable to preview media in the source monitor, without forcing the 
			// generation of audio peak files. Here's how to do so. 

			var property		= 'BE.Prefs.Audio.AutoPeakGeneration';
			var initialValue	= app.properties.getProperty(property);
			var propValue		= false;

			if (initialValue === 'true'){
				var persistent		= 1;
				var allowToCreate	= true;
				app.properties.setProperty('BE.Prefs.Audio.AutoPeakGeneration', propValue, persistent, allowToCreate);
			}
			
			app.sourceMonitor.openFilePath(fileToOpen.fsName);

			if (initialValue === 'true'){
				app.properties.setProperty(property, initialValue	, persistent, allowToCreate);
			}
			app.sourceMonitor.play(1.13); // playback speed as float, 1.0 = normal speed forward
			var position = app.sourceMonitor.getPosition(); // new in 13.0
			$._PPP_.updateEventPanel("Current Source monitor position: " + position.seconds + " seconds.");

			/* Example code for controlling scrubbing in Source monitor.

			app.enableQE();
			qe.source.player.startScrubbing();
			qe.source.player.scrubTo('00;00;00;11');
			qe.source.player.endScrubbing();
			qe.source.player.step();

			qe.source.player.play(playbackSpeed) // playbackSpeed must be between -4.0 and 4.0

			*/

			fileToOpen.close();
		} else {
			$._PPP_.updateEventPanel("No file chosen.");
		}
	},

	searchForBinWithName : function (nameToFind) {
		// deep-search a folder by name in project
		var deepSearchBin = function (inFolder) {
			if (inFolder && inFolder.name === nameToFind && inFolder.type === 2) {
				return inFolder;
			} else {
				for (var i = 0; i < inFolder.children.numItems; i++) {
					if (inFolder.children[i] && inFolder.children[i].type === 2) {
						var foundBin = deepSearchBin(inFolder.children[i]);
						if (foundBin) {
							return foundBin;
						}
					}
				}
			}
		};
		return deepSearchBin(app.project.rootItem);
	},

	disableImportWorkspaceWithProjects : function () {
		var prefToModify 		= 'FE.Prefs.ImportWorkspace';
		var propertyExists 		= app.properties.doesPropertyExist(prefToModify);
		var propertyIsReadOnly 	= app.properties.isPropertyReadOnly(prefToModify);
		var propertyValue 		= app.properties.getProperty(prefToModify);

		app.properties.setProperty(prefToModify, "0", 1, false);
		var safetyCheck = app.properties.getProperty(prefToModify);
		if (safetyCheck != propertyValue) {
			$._PPP_.updateEventPanel("Changed \'Import Workspaces with Projects\' from " + propertyValue + " to " + safetyCheck + ".");
		}
	},

	openProject : function () {
		var filterString = "";
		if (Folder.fs === 'Windows') {
			filterString = "Premiere Pro project files:*.prproj";
		}
		var projToOpen = File.openDialog(	"Choose project:",
											filterString,
											false);
		if ((projToOpen) && projToOpen.exists) {
			app.openDocument(	projToOpen.fsName,
								true,	// suppress 'Convert Project' dialogs?
								true,	// suppress 'Locate Files' dialogs?
								true,	// suppress warning dialogs?
								true);	// prevent document from getting added to MRU list?
			projToOpen.close();
		}
	},

	createSequence : function (name) {
		var someID	= "xyz123";
		var seqName	= prompt('Name of sequence?', '<<<default>>>', 'Sequence Naming Prompt');
		app.project.createNewSequence(seqName, someID);
	},

	createSequenceFromPreset : function (presetPath) {
		app.enableQE();
		var seqName = prompt('Name of sequence?', '<<<default>>>', 'Sequence Naming Prompt');
		if (seqName) {
			qe.project.newSequence(seqName, presetPath);
		}
	},

	saveProjectCopy : function () {
		var sessionCounter	= 1;
		var originalPath	= app.project.path;
		var outputPath		= Folder.selectDialog("Choose the output directory");

		if (outputPath) {
			var absPath		= outputPath.fsName;
			var outputName	= String(app.project.name);
			var array		= outputName.split('.', 2);

			outputName		= array[0] + sessionCounter + '.' + array[1];
			sessionCounter++;

			var fullOutPath = absPath + $._PPP_.getSep() + outputName;

			app.project.saveAs(fullOutPath);

			for (var a = 0; a < app.projects.numProjects; a++) {
				var currentProject = app.projects[a];
				if (currentProject.path === fullOutPath) {
					app.openDocument(originalPath, true, true, true, true); // Why first? So we don't frighten the user by making PPro's window disappear. :)
					currentProject.closeDocument();
				}
			}
		} else {
			$._PPP_.updateEventPanel("No output path chosen.");
		}
	},

	mungeXMP : function () {
		var projectItem = app.project.rootItem.children[0]; // assumes first item is footage.
		if (projectItem) {
			if (ExternalObject.AdobeXMPScript === undefined) {
				ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
			}
			if (ExternalObject.AdobeXMPScript !== undefined) { // safety-conscious!

				var xmpBlob = projectItem.getXMPMetadata();
				var xmp = new XMPMeta(xmpBlob);
				var oldSceneVal = "";
				var oldDMCreatorVal = "";

				if (xmp.doesPropertyExist(XMPConst.NS_DM, "scene") === true) {
					var myScene = xmp.getProperty(XMPConst.NS_DM, "scene");
					oldSceneVal = myScene.value;
				}

				if (xmp.doesPropertyExist(XMPConst.NS_DM, "creator") === true) {
					var myCreator	= xmp.getProperty(XMPConst.NS_DM, "creator");
					oldDMCreatorVal	= myCreator.value;
				}

				// Regardless of whether there WAS scene or creator data, set scene and creator data. 

				xmp.setProperty(XMPConst.NS_DM, "scene", oldSceneVal + " Added by PProPanel sample!");
				xmp.setProperty(XMPConst.NS_DM, "creator", oldDMCreatorVal + " Added by PProPanel sample!");

				// That was the NS_DM creator; here's the NS_DC creator.

				var creatorProp 					= "creator";
				var containsDMCreatorValue			= xmp.doesPropertyExist(XMPConst.NS_DC, creatorProp);
				var numCreatorValuesPresent			= xmp.countArrayItems(XMPConst.NS_DC, creatorProp);
				var CreatorsSeparatedBy4PoundSigns	= "";

				if (numCreatorValuesPresent > 0) {
					for (var z = 0; z < numCreatorValuesPresent; z++) {
						CreatorsSeparatedBy4PoundSigns = CreatorsSeparatedBy4PoundSigns + xmp.getArrayItem(XMPConst.NS_DC, creatorProp, z + 1);
						CreatorsSeparatedBy4PoundSigns = CreatorsSeparatedBy4PoundSigns + "####";
					}
					$._PPP_.updateEventPanel(CreatorsSeparatedBy4PoundSigns);

					if (confirm("Replace previous?", false, "Replace existing Creator?")) {
						xmp.deleteProperty(XMPConst.NS_DC, "creator");
					}
					xmp.appendArrayItem(XMPConst.NS_DC, // If no values exist, appendArrayItem will create a value.
										creatorProp,
										numCreatorValuesPresent + " creator values were already present.",
										null,
										XMPConst.ARRAY_IS_ORDERED);
				} else {
					xmp.appendArrayItem(XMPConst.NS_DC,
										creatorProp,
										"PProPanel wrote the first value into NS_DC creator field.",
										null,
										XMPConst.ARRAY_IS_ORDERED);
				}
				var xmpAsString = xmp.serialize(); // either way, serialize and write XMP.
				projectItem.setXMPMetadata(xmpAsString);
			}
		} else {
			$._PPP_.updateEventPanel("Project item required.");
		}
	},

	getProductionByName : function (nameToGet) {
		var production;
		var allProductions = app.anywhere.listProductions();
		for (var i = 0; i < allProductions.numProductions; i++) {
			var currentProduction = allProductions[i];
			if (currentProduction.name === nameToGet) {
				production = currentProduction;
			}
		}
		return production;
	},

	dumpOMF : function () {
		var activeSequence = app.project.activeSequence;
		if (activeSequence) {
			var outputPath = Folder.selectDialog("Choose the output directory");
			if (outputPath) {
				var absPath				= outputPath.fsName;
				var outputName 			= String(activeSequence.name) + '.omf';
				var fullOutPathWithName	= absPath + $._PPP_.getSep() + outputName;

				app.project.exportOMF(	app.project.activeSequence, // sequence
										fullOutPathWithName, // output file path
										'OMFTitle', // OMF title
										48000, // sample rate (48000 or 96000)
										16, // bits per sample (16 or 24)
										1, // audio encapsulated flag (1:yes or 0:no)
										0, // audio file format (0:AIFF or 1:WAV)
										0, // trim audio files (0:no or 1:yes)
										0, // handle frames (if trim is 1, handle frames from 0 to 1000)
										0); // include pan flag (0:no or 1:yes)
			}
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	addClipMarkers : function () {
		if (app.project.rootItem.children.numItems > 0) {
			var projectItem = app.project.rootItem.children[0]; // assumes first item is footage.
			if (projectItem) {
				if (projectItem.type == ProjectItemType.CLIP || projectItem.type == ProjectItemType.FILE) {
					var markers = projectItem.getMarkers();
					if (markers) {
						var numMarkers			= markers.numMarkers;
						var newMarker			= markers.createMarker(12.345);
						var guid 				= newMarker.guid; // new in 11.1
						newMarker.name			= 'Marker created by PProPanel.';
						newMarker.comments		= 'Here are some comments, inserted by PProPanel.';
						var tempTime 			= new Time();
						tempTime.seconds		= 15.6789;
						newMarker.end			= tempTime;

						//default marker type == comment. To change marker type, call one of these:

						// newMarker.setTypeAsChapter();
						// newMarker.setTypeAsWebLink();
						// newMarker.setTypeAsSegmentation();
						// newMarker.setTypeAsComment();
					}
				} else {
					$._PPP_.updateEventPanel("Can only add markers to footage items.");
				}
			} else {
				$._PPP_.updateEventPanel("Could not find first projectItem.");
			}
		} else {
			$._PPP_.updateEventPanel("Project is empty.");
		}
	},

	modifyProjectMetadata : function () {
		var kPProPrivateProjectMetadataURI	= "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/";
		var nameField						= "Column.Intrinsic.Name";
		var tapeName						= "Column.Intrinsic.TapeName";
		var logNote							= "Column.Intrinsic.LogNote";
		var newField						= "ExampleFieldName";
		var desc							= "Column.PropertyText.Description";
		var test = "init";
		if (app.isDocumentOpen()) {
			var projectItem = app.project.rootItem.children[0]; // just grabs first projectItem.
			if (projectItem) {
				if (ExternalObject.AdobeXMPScript === undefined) {
					ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
				}
				if (ExternalObject.AdobeXMPScript !== undefined) { // safety-conscious!
					var projectMetadata 			= projectItem.getProjectMetadata();
					var successfullyAdded 			= app.project.addPropertyToProjectMetadataSchema(newField, "ExampleFieldLabel", 2);
					var xmp							= new XMPMeta(projectMetadata);
					var obj							= xmp.dumpObject();
					var foundLogNote				= xmp.doesPropertyExist(kPProPrivateProjectMetadataURI, logNote);
					var oldLogValue 				= "";
					var appendThis 					= "This log note inserted by PProPanel.";
					var appendTextWasActuallyNew 	= false;

					if (foundLogNote) {
						var oldLogNote = xmp.getProperty(kPProPrivateProjectMetadataURI, logNote);
						if (oldLogNote) {
							oldLogValue = oldLogNote.value;
						}
					}
					xmp.setProperty(kPProPrivateProjectMetadataURI, tapeName, "***TAPENAME***");
					xmp.setProperty(kPProPrivateProjectMetadataURI, desc, "***DESCRIPTION***");
					xmp.setProperty(kPProPrivateProjectMetadataURI, nameField, "***NEWNAME***");
					xmp.setProperty(kPProPrivateProjectMetadataURI, newField, "PProPanel set this, using addPropertyToProjectMetadataSchema().");
					test = xmp.getProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.MediaStart");
					xmp.setProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.MediaStart", "00:00:00:00");
					test = xmp.getProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.MediaStart");

					var test2 =  xmp.getProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.MediaEnd");
					xmp.setProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.MediaEnd", "00:00:05:09");
					xmp.setProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.VideoOutPoint", "00:00:05:09");
					xmp.setProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.VideoInPoint", "00:00:00:00");
					xmp.setProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.AudioOutPoint", "00:00:05:19199");
					xmp.setProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.AudioInPoint", "00:00:00:00000");
					xmp.setProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.SoundTimeCode", "00:00:00:00");
					test2 =  xmp.getProperty(kPProPrivateProjectMetadataURI, "Column.Intrinsic.MediaEnd");
					var startTime = projectItem.startTime();
					projectItem.setStartTime("0");
					var namespaceps = XMPMeta.dumpNamespaces();

					var array = [];
					array[0] = tapeName;
					array[1] = desc;
					array[2] = nameField;
					array[3] = newField;

					var concatenatedLogNotes = "";

					if (oldLogValue != appendThis) { // if that value is not exactly what we were going to add
						if (oldLogValue.length > 0) { // if we have a valid value
							concatenatedLogNotes += "Previous log notes: " + oldLogValue + "    ||||    ";
						}
						concatenatedLogNotes += appendThis;
						xmp.setProperty(kPProPrivateProjectMetadataURI, logNote, concatenatedLogNotes);
						array[4] = logNote;
					}
					var str = xmp.serialize();
					projectItem.setProjectMetadata(str, array);

					// test: is it in there?

					var newblob = projectItem.getProjectMetadata();
					var newXMP = new XMPMeta(newblob);
					var foundYet = newXMP.doesPropertyExist(kPProPrivateProjectMetadataURI, newField);

					if (foundYet) {
						$._PPP_.updateEventPanel("PProPanel successfully added a field to the project metadata schema, and set a value for it.");
					}
				}
			} else {
				$._PPP_.updateEventPanel("No project items found.");
			}
		}
	},

	updatePAR : function () {
		var item = app.project.rootItem.children[0];
		if (item) {
			if ((item.type == ProjectItemType.FILE) || (item.type == ProjectItemType.CLIP)) {
				// If there is an item, and it's either a clip or file...
				item.setOverridePixelAspectRatio(185, 100); // anamorphic is BACK!	  ;)
			} else {
				$._PPP_.updateEventPanel('You cannot override the PAR of bins or sequences.');
			}
		} else {
			$._PPP_.updateEventPanel("No project items found.");
		}
	},

	getnumAEProjectItems : function () {
		var bt		= new BridgeTalk();
		bt.target	= 'aftereffects';
		bt.body		= 'alert("Items in AE project: " + app.project.rootFolder.numItems);app.quit();';
		bt.send();
	},

	updateEventPanel : function (message) {
		app.setSDKEventMessage(message, 'info');
		//app.setSDKEventMessage('Here is some information.', 'info');
		//app.setSDKEventMessage('Here is a warning.', 'warning');
		//app.setSDKEventMessage('Here is an error.', 'error');  // Very annoying; use sparingly.
	},

	walkAllBinsDumpingXMP : function (parentItem, outPath) {
		for (var j = 0; j < parentItem.children.numItems; j++) {
			var currentChild = parentItem.children[j];
			if (currentChild) {
				if (currentChild.type === ProjectItemType.BIN) {
					$._PPP_.walkAllBinsDumpingXMP(currentChild, outPath); // warning; recursion!
				} else {
					var isMultiCam		= currentChild.isMultiCamClip();
					var isMergedClip	= currentChild.isMergedClip();
					if ((isMergedClip === false) && (isMultiCam === false)){
						$._PPP_.dumpProjectItemXMP(currentChild, outPath);
					}
				}
			}
		}
	},

	walkAllBinsUpdatingPaths : function (parentItem, outPath) {
		for (var j = 0; j < parentItem.children.numItems; j++) {
			var currentChild = parentItem.children[j];
			if (currentChild) {
				if (currentChild.type === ProjectItemType.BIN) {
					$._PPP_.walkAllBinsUpdatingPaths(currentChild, outPath); // warning; recursion!
				} else {
					$._PPP_.updateProjectItemPath(currentChild, outPath);
				}
			}
		}
	},

	searchBinForProjItemByName : function (i, containingBin, nameToFind) {
		for (var j = i; j < containingBin.children.numItems; j++) {
			var currentChild = containingBin.children[j];
			if (currentChild) {
				if (currentChild.type === ProjectItemType.BIN) {
					return $._PPP_.searchBinForProjItemByName(j, currentChild, nameToFind); // warning; recursion!
				} else {
					if (currentChild.name === nameToFind) {
						return currentChild;
					} else {
						currentChild = currentChild.children[j + 1];
						if (currentChild) {
							return $._PPP_.searchBinForProjItemByName(0, currentChild, nameToFind);
						}
					}
				}
			}
		}
	},

	dumpProjectItemXMP : function (projectItem, outPath) {
		var xmpBlob				= projectItem.getXMPMetadata();
		var outFileName			= projectItem.name + '.xmp';
		var completeOutputPath	= outPath + $._PPP_.getSep() + outFileName;
		var outFile				= new File(completeOutputPath);
		
		if (outFile) {
			outFile.encoding = "UTF8";
			outFile.open("w", "TEXT", "????");
			outFile.write(xmpBlob.toString());
			outFile.close();
		}
	},

	addSubClip : function () {
		var startTime 			= new Time();
		startTime.seconds		= 0.0;
		var endTime				= new Time();
		endTime.seconds			= 3.21;
		var hasHardBoundaries	= 0;
		var sessionCounter		= 1;
		var takeVideo			= 1; // optional, defaults to 1
		var takeAudio			= 1; //	optional, defaults to 1
		var projectItem 		= app.project.rootItem.children[0]; // just grabs the first item
		if (projectItem) {
			if ((projectItem.type === ProjectItemType.CLIP) || (projectItem.type === ProjectItemType.FILE)) {
				var newSubClipName = prompt('Name of subclip?', projectItem.name + '_' + sessionCounter, 'Name your subclip');
				if (newSubClipName){
					var newSubClip = projectItem.createSubClip(	newSubClipName,
																startTime,
																endTime,
																hasHardBoundaries,
																takeVideo,
																takeAudio);
					if (newSubClip) {
						var newStartTime		=	new Time();
						newStartTime.seconds	=	12.345;
						newSubClip.setStartTime(newStartTime);
					}
				} else {
					$._PPP_.updateEventPanel("No name provided for sub-clip.");
				}
			} else {
				$._PPP_.updateEventPanel("Could not sub-clip " + projectItem.name + ".");
			}
		} else {
			$._PPP_.updateEventPanel("No project item found.");
		}
	},

	dumpXMPFromAllProjectItems : function () {
		var numItemsInRoot = app.project.rootItem.children.numItems;
		if (numItemsInRoot > 0) {
			var outPath = Folder.selectDialog("Choose the output directory");
			if (outPath) {
				for (var i = 0; i < numItemsInRoot; i++) {
					var currentItem = app.project.rootItem.children[i];
					if (currentItem) {
						if (currentItem.type == ProjectItemType.BIN) {
							$._PPP_.walkAllBinsDumpingXMP(currentItem, outPath.fsName);
						} else {
							$._PPP_.dumpProjectItemXMP(currentItem, outPath.fsName);
						}
					}
				}
			}
		} else {
			$._PPP_.updateEventPanel("No project items found.");
		}
	},

	exportAAF : function () {
		var sessionCounter = 1;
		if (app.project.activeSequence) {
			var outputPath = Folder.selectDialog("Choose the output directory");
			if (outputPath) {
				var absPath		= outputPath.fsName;
				var outputName	= String(app.project.name);
				var array		= outputName.split('.', 2);
				outputName		= array[0] + sessionCounter + '.' + array[1];
				var fullOutPath = absPath + $._PPP_.getSep() + outputName + '.aaf';
				
				//var optionalPathToOutputPreset = null;  New in 11.0.0, you can specify an output preset.

				app.project.exportAAF(	app.project.activeSequence, // which sequence
										fullOutPath, 	// output path
										1, 				// mix down video?
										0, 				// explode to mono?
										96000, 			// sample rate
										16, 			// bits per sample
										0, 				// embed audio? 
										0, 				// audio file format? 0 = aiff, 1 = wav
										0, 				// number of 'handle' frames
										0/*
										optionalPathToOutputPreset*/); // optional; .epr file to use
				sessionCounter++;
			} else {
				$._PPP_.updateEventPanel("Couldn't create AAF output.");
			}
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	setScratchDisk : function () {
		var scratchPath = Folder.selectDialog("Choose new scratch disk directory");
		if ((scratchPath) && scratchPath.exists) {
			app.setScratchDiskPath(scratchPath.fsName, ScratchDiskType.FirstAutoSaveFolder); // see ScratchDiskType object, in ESTK.
		}
	},

	getProjectProxySetting : function () {
		var returnVal = "";
		if (app.project) {
			var returnVal = "No sequence detected in " + app.project.name + ".";
			if (app.getEnableProxies()) {
				returnVal = 'true';
			} else {
				returnVal = 'false';
			}
		} else {
			returnVal = "No project available.";
		}
		return returnVal;
	},

	onPlayWithKeyframes : function () {
		var seq = app.project.activeSequence;
		if (seq) {
			var firstVideoTrack = seq.videoTracks[0];
			if (firstVideoTrack) {
				var firstClip = firstVideoTrack.clips[0];
				if (firstClip) {
					var clipComponents = firstClip.components;
					if (clipComponents) {
						for (var i = 0; i < clipComponents.numItems; ++i) {
							$._PPP_.updateEventPanel('component ' + i + ' = ' + clipComponents[i].matchName + ' : ' + clipComponents[i].displayName);
						}
						if (clipComponents.numItems > 2) {

							// 0 = clip
							// 1 = Opacity
							// N effects, then...
							// Shape layer (new in 12.0)

							var updateUI	= true;
							var blur		= clipComponents[2]; // Assume Gaussian Blur is the first effect applied to the clip.
							if (blur) {
								var blurProps = blur.properties;
								if (blurProps) {
									for (var j = 0; j < blurProps.numItems; ++j) {
										$._PPP_.updateEventPanel('param ' + j + ' = ' + blurProps[j].displayName);
									}
									var blurriness = blurProps[0];

									/* Sample code showing how to get and set the values of a color parameter.
									
									var colorToChange = change_colorProps[N]; // where 'N' is the index of the effect with a color param.
									
									var colorVal = colorToChange.getColorValue();
									
									var alpha = colorVal[0];
									var red   = colorVal[1];
									var blue  = colorVal[2];
									var green = colorVal[3];
                                                                   
                                  	colorToChange.setColorValue(255, 33, 222, 111); // a, r, g, b

									*/

									if (blurriness) {
										if (!blurriness.isTimeVarying()) {
											blurriness.setTimeVarying(true);
										}
										for (var k = 0; k < 20; ++k) {
											updateUI = (k == 9); // Decide how often to update PPro's UI
											blurriness.addKey(k);
											var blurVal = Math.sin(3.14159 * i / 5) * 20 + 25;
											blurriness.setValueAtKey(k, blurVal, updateUI);
											var adjLayer = app.project.activeSequence.getSelection()[0];

											var playheadSeconds = app.project.activeSequence.getPlayerPosition().seconds;
											var adjLayerInPointSeconds = adjLayer.inPoint.seconds;
											var adjLayerStartSeconds = adjLayer.start.seconds;

											var now = adjLayerInPointSeconds + playheadSeconds - adjLayerStartSeconds;

											blurriness.setInterpolationTypeAtKey(now, 2, true);
										}
									}

									var repeatEdgePixels = blurProps[2];
									if (repeatEdgePixels) {
										if (!repeatEdgePixels.getValue()) {
											updateUI = true;
											repeatEdgePixels.setValue(true, updateUI);
										}
									}

									// look for keyframe nearest to 4s with 1/10 second tolerance
									
									var keyFrameTime = blurriness.findNearestKey(4.0, 0.1);
									if (keyFrameTime !== undefined) {
										$._PPP_.updateEventPanel('Found keyframe = ' + keyFrameTime.seconds);
									} else {
										$._PPP_.updateEventPanel('Keyframe not found.');
									}

									// scan keyframes, forward

									keyFrameTime = blurriness.findNearestKey(0.0, 0.1);
									var lastKeyFrameTime = keyFrameTime;
									while (keyFrameTime !== undefined) {
										$._PPP_.updateEventPanel('keyframe @ ' + keyFrameTime.seconds);
										lastKeyFrameTime	= keyFrameTime;
										keyFrameTime 		= blurriness.findNextKey(keyFrameTime);
									}

									// scan keyframes, backward
									keyFrameTime = lastKeyFrameTime;
									while (keyFrameTime !== undefined) {
										$._PPP_.updateEventPanel('keyframe @ ' + keyFrameTime.seconds);
										lastKeyFrameTime	= keyFrameTime;
										keyFrameTime		= blurriness.findPreviousKey(keyFrameTime);
									}

									var blurKeyframesArray = blurriness.getKeys(); // get all keyframes
									if (blurKeyframesArray) {
										$._PPP_.updateEventPanel(blurKeyframesArray.length + ' keyframes found');
									}

									blurriness.removeKey(19); // remove keyframe at 19s

									var shouldUpdateUI = true;
									blurriness.removeKeyRange(0, 5, shouldUpdateUI); // remove keyframes in range from 0s to 5s
								}
							} else {
								$._PPP_.updateEventPanel("To make this sample code work, please apply the Gaussian Blur effect to the first clip in the first video track of the active sequence.");
							}
						}
					}
				}
			}
		} else {
			$._PPP_.updateEventPanel("no active sequence.");
		}
	},

	extractFileNameFromPath : function (fullPath) {
		var lastDot = fullPath.lastIndexOf(".");
		var lastSep = fullPath.lastIndexOf("/");
		if (lastDot > -1) {
			return fullPath.substr((lastSep + 1), (fullPath.length - (lastDot + 1)));
		} else {
			return fullPath;
		}
	},

	ingestFiles : function (outputPresetPath) {
		app.encoder.bind('onEncoderJobComplete',	$._PPP_.onProxyTranscodeJobComplete);
		app.encoder.bind('onEncoderJobError',		$._PPP_.onProxyTranscodeJobError);
		app.encoder.bind('onEncoderJobQueued',		$._PPP_.onProxyTranscodeJobQueued);
		app.encoder.bind('onEncoderJobCanceled',	$._PPP_.onEncoderJobCanceled);

		if (app.project) {
			var filterString = "";
			if (Folder.fs === 'Windows') {
				filterString = "All files:*.*";
			}
			var fileOrFilesToImport = File.openDialog(	"Choose full resolution files to import", 	// title
														filterString, 								// filter available files? 
														true); 										// allow multiple fiels to be selected?
			if (fileOrFilesToImport) {
				var nameToFind = 'Proxies generated by PProPanel';
				var targetBin = $._PPP_.searchForBinWithName(nameToFind);
				if (targetBin === 0) {
					// If panel can't find the target bin, it creates it.
					app.project.rootItem.createBin(nameToFind);
					targetBin = $._PPP_.searchForBinWithName(nameToFind);
				}
				if (targetBin) {
					targetBin.select();
					var importThese = []; // We have an array of File objects; importFiles() takes an array of paths.
					if (importThese) {
						for (var i = 0; i < fileOrFilesToImport.length; i++) {
							importThese[i] 			= fileOrFilesToImport[i].fsName;
							var justFileName 		= $._PPP_.extractFileNameFromPath(importThese[i]);
							var suffix 				= '_PROXY.mp4';
							var containingPath 		= fileOrFilesToImport[i].parent.fsName;
							var completeProxyPath 	= containingPath + $._PPP_.getSep() + justFileName + suffix;

							var jobID = app.encoder.encodeFile(	fileOrFilesToImport[i].fsName,
																completeProxyPath,
																outputPresetPath,
																0);
						}

						app.project.importFiles(importThese,	// array of file paths to be imported
												true, 			// suppress warnings 
												targetBin,		// destination bin
												false); 		// import as numbered stills
					}
				} else {
					$._PPP_.updateEventPanel("Could not find or create target bin.");
				}
			} else {
				$._PPP_.updateEventPanel("No files to import.");
			}
		} else {
			$._PPP_.updateEventPanel("No project found.");
		}
	},

	insertOrAppend : function () {
		var seq = app.project.activeSequence;
		if (seq) {
			var first = app.project.rootItem.children[0];
			if (first) {
				if (!first.isSequence()){
					if (first.type !== ProjectItemType.BIN) {
						var numVTracks = seq.videoTracks.numTracks;
						var targetVTrack = seq.videoTracks[(numVTracks - 1)];
						if (targetVTrack) {
							// If there are already clips in this track, append this one to the end. Otherwise, insert at start time.
							if (targetVTrack.clips.numItems > 0) {
								var lastClip = targetVTrack.clips[(targetVTrack.clips.numItems - 1)];
								if (lastClip) {
									targetVTrack.insertClip(first, lastClip.end.seconds);
								}
							} else {
								var timeAtZero = new Time();
								targetVTrack.insertClip(first, timeAtZero.seconds);
								// New in 13.1; using the new linkSelection/unlinkSelection calls, 
								// panels can remove just the audio (or video) of a given clip.
								var newlyAddedClip = targetVTrack.clips[(targetVTrack.clips.numItems - 1)];
								if (newlyAddedClip) {
									newlyAddedClip.setSelected(true, true);
									seq.unlinkSelection();
									newlyAddedClip.remove(true, true);
									seq.linkSelection();
								}
							}
						} else {
							$._PPP_.updateEventPanel("Could not find first video track.");
						}
					} else {
						$._PPP_.updateEventPanel(first.name + " is a bin.");	
					}
				} else {
					$._PPP_.updateEventPanel(first.name + " is a sequence.");
				}
			} else {
				$._PPP_.updateEventPanel("Couldn't locate first projectItem.");
			}
		} else {
			$._PPP_.updateEventPanel("no active sequence.");
		}
	},

	overWrite : function () {
		var seq = app.project.activeSequence;
		if (seq) {
			var first = app.project.rootItem.children[0];
			if (first) {
				var vTrack1 = seq.videoTracks[0];
				if (vTrack1) {
					var now = seq.getPlayerPosition();
					vTrack1.overwriteClip(first, now.seconds);
				} else {
					$._PPP_.updateEventPanel("Could not find first video track.");
				}
			} else {
				$._PPP_.updateEventPanel("Couldn't locate first projectItem.");
			}
		} else {
			$._PPP_.updateEventPanel("no active sequence.");
		}
	},

	closeFrontSourceClip : function () {
		app.sourceMonitor.closeClip();
	},

	closeAllClipsInSourceMonitor : function () {
		app.sourceMonitor.closeAllClips();
	},

	changeLabel : function () {
		var first = app.project.rootItem.children[0];
		if (first) {
			var currentLabel 	= first.getColorLabel();
			var newLabel 		= currentLabel + 1; // 4 = Cerulean. 0 = Violet, 15 = Yellow.
			if (newLabel > 15) {
				newLabel = newLabel - 16;
			}
			$._PPP_.updateEventPanel("Previous Label color = " + currentLabel + ".");
			first.setColorLabel(newLabel);
			$._PPP_.updateEventPanel("New Label color = " + newLabel + ".");
		} else {
			$._PPP_.updateEventPanel("Couldn't locate first projectItem.");
		}
	},

	getPPPInsertionBin : function () {
		var nameToFind	= "Here's where PProPanel puts things.";
		var targetBin	= $._PPP_.searchForBinWithName(nameToFind);

		if (targetBin === undefined) {
			// If panel can't find the target bin, it creates it.
			app.project.rootItem.createBin(nameToFind);
			targetBin = $._PPP_.searchForBinWithName(nameToFind);
		}
		if (targetBin) {
			targetBin.select();
			return targetBin;
		} else {
			$._PPP_.updateEventPanel("Couldn't find or create a target bin.");
		}
	},

	importComps : function () {
		var targetBin = $._PPP_.getPPPInsertionBin();
		if (targetBin) {
			var filterString = "";
			if (Folder.fs === 'Windows') {
				filterString = "All files:*.*";
			}
			var compNamesToImport	= [];
			var aepToImport			= File.openDialog(	"Choose After Effects project", // title
														filterString, 					// filter available files? 
														false); 						// allow multiple?
			if (aepToImport) {
				var importAll = confirm("Import all compositions in project?", false, "Import all?");
				if (importAll) {
					var result = app.project.importAllAEComps(aepToImport.fsName, 0, targetBin);
				} else {
					var compName = prompt('Name of composition to import?', '', 'Which Comp to import');
					if (compName) {
						compNamesToImport[0] 	= compName;
						var importAECompResult 	= app.project.importAEComps(aepToImport.fsName, compNamesToImport, targetBin);
					} else {
						$._PPP_.updateEventPanel("No composition specified.");
					}
				}
			} else {
				$._PPP_.updateEventPanel("Could not open project.");
			}
		} else {
			$._PPP_.updateEventPanel("Could not find or create target bin.");
		}
	},

	consolidateProject : function () {
		var pmo = app.projectManager.options;

		if (app.project.sequences.numSequences) {
			if (pmo) {
				var filterString = "";
				if (Folder.fs === 'Windows') {
					filterString = "Output Presets:*.epr";
				}
				var outFolder = Folder.selectDialog("Choose output directory.");
				if (outFolder) {
					var presetPath = "";
					var useSpecificPreset = confirm("Would you like to select an output preset?", false, "Are you sure...?");
					if (useSpecificPreset) {
						var useThisEPR = File.openDialog(	"Choose output preset (.epr file)", // title
															filterString, 						// filter available files? 
															false); 							// allow multiple?

						if (useThisEPR) {
							pmo.clipTranscoderOption	= pmo.CLIP_TRANSCODE_MATCH_PRESET;
							pmo.encoderPresetFilePath	= useThisEPR.fsName;
						} else {
							$._PPP_.updateEventPanel("Couldn't find specified .epr file.");
						}
					} else {
						pmo.clipTranscoderOption = pmo.CLIP_TRANSCODE_MATCH_SEQUENCE;
					}
					var processAllSequences = confirm("Process all sequences? No = just the first sequence found.", true, "Process all?");
					if (processAllSequences) {
						pmo.includeAllSequences = true;
					} else {
						pmo.includeAllSequences	= false;
						pmo.affectedSequences	= [app.project.sequences[0]];
					}

					pmo.clipTransferOption 			= pmo.CLIP_TRANSFER_TRANSCODE;
					pmo.convertAECompsToClips 		= false;
					pmo.convertSyntheticsToClips 	= false;
					pmo.copyToPreventAlphaLoss 		= false;
					pmo.destinationPath 			= outFolder.fsName;
					pmo.excludeUnused 				= false;
					pmo.handleFrameCount 			= 0;
					pmo.includeConformedAudio 		= true;
					pmo.includePreviews 			= true;
					pmo.renameMedia 				= false;

					var result		= app.projectManager.process(app.project);
					var errorList	= app.projectManager.errors;

					if (errorList.length) {
						for (var k = 0; k < errorList.length; k++) {
							$._PPP_.updateEventPanel(errorList[k][0]);
						}
					} else {
						$._PPP_.updateEventPanel(app.project.name + " successfully processed to " + outFolder.fsName + ".");
					}
					return result;
				}
			} else {
				$._PPP_.updateEventPanel("Could not get Project Manager options.");
			}
		} else {
			$._PPP_.updateEventPanel("No sequences available.");
		}
	},

	reportCurrentProjectSelection : function () {
		var viewIDs 		= app.getProjectViewIDs(); 
		var viewSelection 	= app.getProjectViewSelection(viewIDs[0]); // sample code optimized for a single open project
		$._PPP_.projectPanelSelectionChanged(viewSelection, viewIDs[0]);
	},

	randomizeProjectSelection : function () {
		var viewIDs						= app.getProjectViewIDs();
		var firstProject				= app.getProjectFromViewID(viewIDs[0]);
		var arrayOfRandomProjectItems	= [];

		for (var b = 0; b < app.project.rootItem.children.numItems; b++) {
			var currentProjectItem = app.project.rootItem.children[b];
			if (Math.random() > 0.5) {
				arrayOfRandomProjectItems.push(currentProjectItem);
			}
		}
		if (arrayOfRandomProjectItems.length > 0) {
			app.setProjectViewSelection(arrayOfRandomProjectItems, viewIDs[0]);
		}
	},

	setAllProjectItemsOnline : function (startingBin) {
		for (var k = 0; k < startingBin.children.numItems; k++) {
			var currentChild = startingBin.children[k];
			if (currentChild) {
				if (currentChild.type === ProjectItemType.BIN) {
					$._PPP_.setAllProjectItemsOnline(currentChild); // warning; recursion!
				} else if (currentChild.isOffline()) {
					currentChild.changeMediaPath(currentChild.getMediaPath(), true);
					if (currentChild.isOffline()) {
						$._PPP_.updateEventPanel("Failed to bring \'" + currentChild.name + "\' online.");
					} else {
						$._PPP_.updateEventPanel("\'" + currentChild.name + "\' is once again online.");
					}
				}
			}
		}
	},

	setAllOnline : function () {
		var startingBin = app.project.rootItem;
		$._PPP_.setAllProjectItemsOnline(startingBin);
	},

	setOffline : function () {
		var viewIDs = app.getProjectViewIDs();
		for (var a = 0; a < app.projects.numProjects; a++) {
			var currentProject = app.getProjectFromViewID(viewIDs[a]);
			if (currentProject) {
				if (currentProject.documentID === app.project.documentID) { // We're in the right project!
					var selectedItems = app.getProjectViewSelection(viewIDs[a]);
					if (selectedItems && selectedItems.length > 0){
						for (var b = 0; b < selectedItems.length; b++) {
							var currentItem = selectedItems[b];
							if (currentItem) {
								if ((!currentItem.isSequence()) && (currentItem.type !== ProjectItemType.BIN)) { // For every selected item which isn't a bin or sequence...
									if (currentItem.isOffline()) {
										$._PPP_.updateEventPanel("\'" + currentItem.name + "\'was already offline.");
									} else {
										var result = currentItem.setOffline();
										$._PPP_.updateEventPanel("\'" + currentItem.name + "\' is now offline.");
									}
								}
							}
						}
					}
				}
			}
		}
	},

	updateFrameRate : function () {
		var item = app.project.rootItem.children[0];
		if (item) {
			if ((item.type == ProjectItemType.FILE) || (item.type == ProjectItemType.CLIP)) {
				// If there is an item, and it's either a clip or file...
				item.setOverrideFrameRate(23.976);
			} else {
				$._PPP_.updateEventPanel('You cannot override the frame rate of bins or sequences.');
			}
		} else {
			$._PPP_.updateEventPanel("No project items found.");
		}
	},

	onItemAddedToProject : function (whichProject, addedProjectItem) {
		var msg = addedProjectItem.name + " was added to " + whichProject + ".";
		$._PPP_.updateEventPanel(msg);
	},

	registerItemAddedFxn : function () {
		app.onItemAddedToProjectSuccess = $._PPP_.onItemAddedToProject;
	},

	myOnProjectChanged : function (documentID) {
		var msg = 'Project with ID ' + documentID + ' changed, in some way.';
		$._PPP_.updateEventPanel(msg);
	},

	registerProjectChangedFxn : function () {
		app.bind('onProjectChanged', $._PPP_.myOnProjectChanged);
	},

	confirmPProHostVersion : function () {
		var version = parseFloat(app.version);
		if (version < 14.0) {
			$._PPP_.updateEventPanel("Note: PProPanel relies on features added in 14.0, but is currently running in " + version + ".");
		}
	},

	changeSeqTimeCodeDisplay : function () {
		var seq = app.project.activeSequence;
		if (seq) {
			var currentSeqSettings	= app.project.activeSequence.getSettings();
			if (currentSeqSettings) {
				var oldVidSetting	= currentSeqSettings.videoDisplayFormat;
				var timeAsText		= seq.getPlayerPosition().getFormatted(currentSeqSettings.videoFrameRate, app.project.activeSequence.videoDisplayFormat);

				currentSeqSettings.videoDisplayFormat = oldVidSetting + 1;
				if (currentSeqSettings.videoDisplayFormat > TIMEDISPLAY_48Timecode) {	// clamp to valid values
					currentSeqSettings.videoDisplayFormat = TIMEDISPLAY_24Timecode;
				}
				app.project.activeSequence.setSettings(currentSeqSettings);
				$._PPP_.updateEventPanel("Changed timecode display format for \'" + app.project.activeSequence.name + "\'.");
			}
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	myActiveSequenceChangedFxn : function () {
		$._PPP_.updateEventPanel(app.project.activeSequence.name + " changed, in some way.");
	},

	mySequenceActivatedFxn : function () {
		$._PPP_.updateEventPanel("Active sequence is now " + app.project.activeSequence.name + ", in Project " + app.project.name + ".");
	},

	myActiveSequenceSelectionChangedFxn : function () {
		var seq = app.project.activeSequence;
		if (seq){
			var sel = seq.getSelection();
			if (sel && (sel !== "Connection to object lost")){
				$._PPP_.updateEventPanel(sel.length + ' track items selected in ' + app.project.activeSequence.name + '.');
				for (var i = 0; i < sel.length; i++) {
					if (sel[i].name !== 'anonymous') {
						$._PPP_.updateEventPanel('Selected item ' + (i + 1) + ' == ' + sel[i].name + '.');
					}
				}
			} else {
				$._PPP_.updateEventPanel('No clips selected.');
			}
		} else {
			$._PPP_.updateEventPanel('No active sequence.');
		}
	},

	myActiveSequenceStructureChangedFxn : function (){
		$._PPP_.updateEventPanel('Something in  ' + app.project.activeSequence.name + 'changed.');
	},
	
	registerActiveSequenceStructureChangedFxn : function () {
		var success	=	app.bind("onActiveSequenceStructureChanged", $._PPP_.myActiveSequenceStructureChangedFxn);
	},

	registerActiveSequenceChangedFxn : function () {
		var success	=	app.bind("onActiveSequenceChanged", $._PPP_.myActiveSequenceChangedFxn);
	},

	registerSequenceSelectionChangedFxn : function () {
		var success = app.bind('onActiveSequenceSelectionChanged', $._PPP_.myActiveSequenceSelectionChangedFxn);
	},

	registerSequenceActivatedFxn : function () {
		var success = app.bind('onSequenceActivated', $._PPP_.mySequenceActivatedFxn);
	},
	
	enableNewWorldScripting : function () {
		app.enableQE();

		var previousNWValue				= qe.getDebugDatabaseEntry("ScriptLayerPPro.EnableNewWorld");
		var previousInternalDOMValue	= qe.getDebugDatabaseEntry("dvascripting.EnabledInternalDOM");
		if ((previousNWValue === 'true') && (previousInternalDOMValue === 'true')) {
			qe.setDebugDatabaseEntry("ScriptLayerPPro.EnableNewWorld", "false");
			qe.setDebugDatabaseEntry("dvascripting.EnabledInternalDOM", "false");
			$._PPP_.updateEventPanel("ScriptLayerPPro.EnableNewWorld and dvascripting.EnabledInternalDOM are now OFF.");
		} else {
			qe.setDebugDatabaseEntry("ScriptLayerPPro.EnableNewWorld", "true");
			qe.setDebugDatabaseEntry("dvascripting.EnabledInternalDOM", "true");
			$._PPP_.updateEventPanel("ScriptLayerPPro.EnableNewWorld and dvascripting.EnabledInternalDOM are now ON.");
		}
	},

	forceLogfilesOn : function () {
		app.enableQE();
		var previousLogFilesValue = qe.getDebugDatabaseEntry("CreateLogFilesThatDoNotExist");

		if (previousLogFilesValue === 'true'){
			$._PPP_.updateEventPanel("Force create Log files was already ON.");
		} else {
			qe.setDebugDatabaseEntry("CreateLogFilesThatDoNotExist", "true");
			$._PPP_.updateEventPanel("Set Force create Log files to ON.");
		}
	},

	insertOrAppendToTopTracks : function () {
		var seq = app.project.activeSequence;
		if (seq) {
			var first = app.project.rootItem.children[0];
			if (first) {
				var time	= seq.getPlayerPosition();
				var newClip = seq.insertClip(first, time, (seq.videoTracks.numTracks - 1), (seq.audioTracks.numTracks - 1));
				if (newClip) {
					$._PPP_.updateEventPanel("Inserted " + newClip.name + ", into " + seq.name + ".");
				}
			} else {
				$._PPP_.updateEventPanel("Couldn't locate first projectItem.");
			}
		} else {
			$._PPP_.updateEventPanel("no active sequence.");
		}
	},

	closeAllProjectsOtherThanActiveProject : function () {
		var viewIDs				= app.getProjectViewIDs();
		var closeTheseProjects	= [];
		for (var a = 0; a < viewIDs.length; a++) {
			var thisProj = app.getProjectFromViewID(viewIDs[a]);
			if (thisProj.documentID !== app.project.documentID) {
				closeTheseProjects[a] = thisProj;
			}
		}
		// Why do this afterward? Because if we close projects in that loop [above], we change the active project, and scare the user. :)
		for (var b = 0; b < closeTheseProjects.length; b++) {
			$._PPP_.updateEventPanel("Closed " + closeTheseProjects[b].name);
			closeTheseProjects[b].closeDocument();
		}
	},

	countAdjustmentLayersInBin : function (parentItem, arrayOfAdjustmentLayerNames, foundSoFar) {
		for (var j = 0; j < parentItem.children.numItems; j++) {
			var currentChild = parentItem.children[j];
			if (currentChild) {
				if (currentChild.type == ProjectItemType.BIN) {
					$._PPP_.countAdjustmentLayersInBin(currentChild, arrayOfAdjustmentLayerNames, foundSoFar); // warning; recursion!
				} else {
					if (currentChild.isAdjustmentLayer()) {
						arrayOfAdjustmentLayerNames[foundSoFar] = currentChild.name;
						foundSoFar++;
					}
				}
			}
		}
		$._PPP_.updateEventPanel(foundSoFar + " adjustment layers found in " + app.project.name + ".");
	},

	findAllAdjustmentLayersInProject : function () {
		var arrayOfAdjustmentLayerNames	= [];
		var foundSoFar					= 0;
		var startingBin					= app.project.rootItem;

		$._PPP_.countAdjustmentLayersInBin(startingBin, arrayOfAdjustmentLayerNames, foundSoFar);

		if (arrayOfAdjustmentLayerNames.length) {
			var remainingArgs	= arrayOfAdjustmentLayerNames.length;
			var message			= remainingArgs + " adjustment layers found: ";

			for (var i = 0; i < arrayOfAdjustmentLayerNames.length; i++) {
				message += arrayOfAdjustmentLayerNames[i];
				remainingArgs--;
				if (remainingArgs > 1) {
					message += ', ';
				}
				if (remainingArgs === 1) {
					message += ", and ";
				}
				if (remainingArgs === 0) {
					message += ".";
				}
			}
			$._PPP_.updateEventPanel(message);
		} else {
			$._PPP_.updateEventPanel("No adjustment layers found in " + app.project.name + ".");
		}
	},

	consolidateDuplicates : function () {
		var result = app.project.consolidateDuplicates();
		$._PPP_.updateEventPanel("Duplicates consolidated in " + app.project.name + ".");
	},

	closeAllSequences : function () {
		var seqList = app.project.sequences;
		if (seqList.numSequences) {
			for (var a = 0; a < seqList.numSequences; a++) {
				var currentSeq = seqList[a];
				if (currentSeq) {
					currentSeq.close();
				} else {
					$._PPP_.updateEventPanel("No sequences from " + app.project.name + " were open.");
				}
			}
		} else {
			$._PPP_.updateEventPanel("No sequences found in " + app.project.name + ".");
		}
	},

	dumpAllPresets : function () {
		var desktopPath		= new File("~/Desktop");
		var outputFileName	= desktopPath.fsName + $._PPP_.getSep() + 'available_presets.txt';
		var exporters		= app.encoder.getExporters();
		var outFile			= new File(outputFileName);
		outFile.encoding	= "UTF8";
		
		outFile.open("w", "TEXT", "????");

		for (var i = 0; i < exporters.length; i++) {
			var exporter = exporters[i];
			if (exporter) {
				outFile.writeln('-----------------------------------------------');
				outFile.writeln(i + ': ' + exporter.name + ' : ' + exporter.classID + ' : ' + exporter.fileType);
				var presets = exporter.getPresets();
				if (presets) {
					outFile.writeln(presets.length + ' presets found.');
					outFile.writeln('+++++++++');
					outFile.writeln('+++++++++');
					for (var j = 0; j < presets.length; j++) {
						var preset = presets[j];
						if (preset) {
							outFile.writeln('matchName: ' + preset.matchName + '(' + preset.name + ')');
							outFile.writeln('+++++++++');
						}
					}
				}
			}
		}
		$._PPP_.updateEventPanel("List of available presets saved to desktop as \'available_presets.txt\'.");
		desktopPath.close();
		outFile.close();
	},

	reportSequenceVRSettings : function () {
		var seq = app.project.activeSequence;
		if (seq) {
			var settings = seq.getSettings();
			if (settings) {
				$._PPP_.updateEventPanel("====================================================");
				$._PPP_.updateEventPanel("VR Settings for \'" + seq.name + "\':");
				$._PPP_.updateEventPanel("");
				$._PPP_.updateEventPanel("");
				$._PPP_.updateEventPanel("	Horizontal captured view: "	+ settings.vrHorzCapturedView);
				$._PPP_.updateEventPanel("	Vertical captured view: "	+ settings.vrVertCapturedView);
				$._PPP_.updateEventPanel("	Layout: "					+ settings.vrLayout);
				$._PPP_.updateEventPanel("	Projection: "				+ settings.vrProjection);
				$._PPP_.updateEventPanel("");
				$._PPP_.updateEventPanel("");
				$._PPP_.updateEventPanel("====================================================");
			}
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	openProjectItemInSource : function () {
		var viewIDs = app.getProjectViewIDs();
		if (viewIDs) {
			for (var a = 0; a < app.projects.numProjects; a++) {
				var currentProject = app.getProjectFromViewID(viewIDs[a]);
				if (currentProject) {
					if (currentProject.documentID === app.project.documentID) { // We're in the right project!
						var selectedItems = app.getProjectViewSelection(viewIDs[a]);
						if (selectedItems){
							for (var b = 0; b < selectedItems.length; b++) {
								var currentItem = selectedItems[b];
								if (currentItem) {
									if (currentItem.type !== ProjectItemType.BIN) { // For every selected item which isn't a bin or sequence...
										app.sourceMonitor.openProjectItem(currentItem);
									}
								} else {
									$._PPP_.updateEventPanel("No item available.");
								}
							}
						}
					}
				} else {
					$._PPP_.updateEventPanel("No project available.");
				}
			}
		} else {
			$._PPP_.updateEventPanel("No view IDs available.");
		}
	},

	reinterpretFootage : function () {
		var viewIDs = app.getProjectViewIDs();
		if (viewIDs) {
			for (var a = 0; a < app.projects.numProjects; a++) {
				var currentProject = app.getProjectFromViewID(viewIDs[a]);
				if (currentProject) {
					if (currentProject.documentID === app.project.documentID) { // We're in the right project!
						var selectedItems = app.getProjectViewSelection(viewIDs[a]);
						if (selectedItems.length) {
							for (var b = 0; b < selectedItems.length; b++) {
								var currentItem = selectedItems[b];
								if (currentItem) {
									if ((currentItem.type !== ProjectItemType.BIN) &&
										(currentItem.isSequence() === false)) {
										var interp = currentItem.getFootageInterpretation();
										if (interp) {
											interp.frameRate		= 17.868;
											interp.pixelAspectRatio	= 1.2121;
											currentItem.setFootageInterpretation(interp);
											$._PPP_.updateEventPanel("Changed frame rate and PAR for " + currentItem.name + ".");
										} else {
											$._PPP_.updateEventPanel("Unable to get interpretation for " + currentItem.name + ".");
										}
										var mapping = currentItem.getAudioChannelMapping;
										if (mapping) {
											mapping.audioChannelsType	= AUDIOCHANNELTYPE_Stereo;
											mapping.audioClipsNumber	= 1;
											mapping.setMappingForChannel(0, 4); // 1st param = channel index, 2nd param = source index
											mapping.setMappingForChannel(1, 5);
											currentItem.setAudioChannelMapping(mapping); // submit changed mapping object
											$._PPP_.updateEventPanel("Modified audio channel type and channel mapping for " + currentItem.name + ".");
										}
									}
								} else {
									$._PPP_.updateEventPanel("No project item available.");
								}
							}
						} else {
							$._PPP_.updateEventPanel("No items selected.");
						}
					}
				} else {
					$._PPP_.updateEventPanel("No project available.");
				}
			}
		} else {
			$._PPP_.updateEventPanel("No view IDs available.");
		}
	},

	createSubSequence : function () {

		/* 	Behavioral Note

			createSubSequence() uses track targeting to select clips when there is
			no current clip selection, in the sequence. To create a subsequence with
			clips on tracks that are currently NOT targeted, either select some clips
			(on any track), or temporarily target all desired tracks.

		*/

		var activeSequence = app.project.activeSequence;
		if (activeSequence) {
			var targetTrackFound = false;
			var cloneAnyway = true;
			for (var a = 0;	(a < activeSequence.videoTracks.numTracks && targetTrackFound === false); a++) {
				if (activeSequence.videoTracks[a].isTargeted()) {
					targetTrackFound = true;
				}
			}
			// If no targeted track was found, just target the first (zero-th) track, for demo purposes
			if (targetTrackFound === false) {
				activeSequence.videoTracks[0].setTargeted(true, true);
			}
			if ((activeSequence.getInPoint() === NOT_SET) && (activeSequence.getOutPoint() === NOT_SET)) {
				cloneAnyway = confirm("No in or out points set; clone entire sequence?", false, "Clone the whole thing?");
			}
			if (cloneAnyway) {
				var ignoreMapping	= confirm("Ignore track mapping?", false, "Ignore track mapping?");
				var newSeq			= activeSequence.createSubsequence(ignoreMapping);
				newSeq.name = newSeq.name + ", cloned by PProPanel.";
			}
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	selectAllRetimedClips : function () {
		var activeSeq 		= app.project.activeSequence;
		var numRetimedClips = 0;
		if (activeSeq) {
			var trackGroups		= [activeSeq.audioTracks, activeSeq.videoTracks];
			var trackGroupNames = ["audioTracks", "videoTracks"];
			var updateUI 		= true;
			for (var groupIndex = 0; groupIndex < 2; groupIndex++) {
				var group = trackGroups[groupIndex];
				for (var trackIndex = 0; trackIndex < group.numTracks; trackIndex++) {
					var track = group[trackIndex];
					var clips = track.clips;
					for (var clipIndex = 0; clipIndex < clips.numItems; clipIndex++) {
						var clip = clips[clipIndex];
						if (clip.getSpeed() !== 1) {
							clip.setSelected(true, updateUI);
							numRetimedClips++;
						}
					}
				}
			}
			$._PPP_.updateEventPanel(numRetimedClips + " retimed clips found.");
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	selectReversedClips : function () {
		var sequence			= app.project.activeSequence;
		var numReversedClips	= 0;
		if (sequence) {
			var trackGroups		= [sequence.audioTracks, sequence.videoTracks];
			var trackGroupNames	= ["audioTracks", "videoTracks"];
			var updateUI = true;

			for (var groupIndex = 0; groupIndex < 2; groupIndex++) {
				var group = trackGroups[groupIndex];
				for (var trackIndex = 0; trackIndex < group.numTracks; trackIndex++) {
					for (var clipIndex = 0; clipIndex < group[trackIndex].clips.numItems; clipIndex++) {
						var clip		= group[trackIndex].clips[clipIndex];
						var isReversed	= clip.isSpeedReversed();
						if (isReversed) {
							clip.setSelected(isReversed, updateUI);
							numReversedClips++;
						}
					}
				}
			}
			$._PPP_.updateEventPanel(numReversedClips + " reversed clips found.");
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	logConsoleOutput : function () {
		app.enableQE();
		var logFileName	= "PPro_Console_output.txt";
		var outFolder	= Folder.selectDialog("Where do you want to save the log file?");
		if (outFolder) {
			var entireOutputPath	= outFolder.fsName + $._PPP_.getSep() + logFileName;
			var result				= qe.executeConsoleCommand("con.openlog " + entireOutputPath);
			$._PPP_.updateEventPanel("Log opened at " + entireOutputPath + ".");
		} else {
			$._PPP_.updateEventPanel("No output folder selected.");
		}
	},

	closeLog : function () {
		app.enableQE();
		qe.executeConsoleCommand("con.closelog");
	},

	stitch : function (presetPath) {
		var viewIDs = app.getProjectViewIDs();
		var allPathsToStitch = "";

		for (var a = 0; a < app.projects.numProjects; a++) {
			var currentProject = app.getProjectFromViewID(viewIDs[a]);
			if (currentProject) {
				if (currentProject.documentID === app.project.documentID) { // We're in the right project!
					var selectedItems = app.getProjectViewSelection(viewIDs[a]);
					if (selectedItems.length > 1) {
						for (var b = 0; b < selectedItems.length; b++) {
							var currentItem = selectedItems[b];
							if (currentItem) {
								if ((!currentItem.isSequence()) && (currentItem.type !== ProjectItemType.BIN)) { // For every selected item which isn't a bin or sequence...
									allPathsToStitch += currentItem.getMediaPath();
									allPathsToStitch += ";";
								}
							}
						}
						var AMEString = "var fe = app.getFrontend(); fe.stitchFiles(\"" + allPathsToStitch + "\"";
						var addendum = ", \"H.264\", \"" + presetPath + "\", " + "\"(This path parameter is never used)\");";

						AMEString	+= addendum;
						var bt		= new BridgeTalk();
						bt.target	= 'ame';
						bt.body		= AMEString;
						bt.send();				
					} else {
						$._PPP_.updateEventPanel("Select more than one render-able item, then try stitching again.");
					}
				}
			}
		}
	},

	myTrackItemAdded : function (track, trackItem) {
		$._PPP_.updateEventPanel('onActiveSequenceTrackItemAdded: ' + track.name + ' : ' + trackItem.name + ' : ' + trackItem.nodeId + ".");
	},

	myTrackItemRemoved : function (track, trackItem) {
		$._PPP_.updateEventPanel('onActiveSequenceTrackItemRemoved: ' + track.name + ' : ' + trackItem.name + ' : ' + trackItem.nodeId + ".");
	},

	mySequenceStructureChanged : function () {
		$._PPP_.updateEventPanel('onActiveSequenceStructureChanged.');
	},

	registerSequenceMessaging : function () {
		app.bind('onActiveSequenceTrackItemRemoved',	$._PPP_.myTrackItemRemoved);
		app.bind('onActiveSequenceTrackItemAdded',		$._PPP_.myTrackItemAdded);
		app.bind('onActiveSequenceStructureChanged',	$._PPP_.mySequenceStructureChanged);
	},

	enumerateTeamProjects : function () {
		app.enableQE();
		var numTeamProjectsOpen = 0;
		for (var i = 0; i < app.projects.numProjects; i++) {
			var project = app.projects[i];
			if (project.isCloudProject) {
				numTeamProjectsOpen++;
				$._PPP_.updateEventPanel(project.name + " is a cloud-based project.");
				var localHubID = project.cloudProjectLocalID;
				$._PPP_.updateEventPanel("LocalHub Id is " + localHubID + ".");
				var production = qe.ea.getProductionByID(localHubID);
				$._PPP_.updateEventPanel("Production Name is " + production.name + ".");
				var remoteID = production.getRemoteProductionID();
				$._PPP_.updateEventPanel("Remote Production Id is " + remoteID + ".");
			}
		}
		if (numTeamProjectsOpen === 0) {
			$._PPP_.updateEventPanel("No open Team Projects found.");
		} else {
			$._PPP_.updateEventPanel(numTeamProjectsOpen + " open Team Projects Team Projects found.");
		}
	},

	enableWorkArea : function (enable) {
		var seq = app.project.activeSequence;
		if (seq) {
			var newStateString = "undefined";
			seq.setWorkAreaEnabled(enable);
			var newState = seq.isWorkAreaEnabled();
			if (newState) {
				newStateString = "ON";
			} else {
				newStateString = "OFF";
			}
			var update = "Work area for " + app.project.activeSequence.name + " is now " + newStateString + ".";
			$._PPP_.updateEventPanel(update);
		} else {
			$._PPP_.updateEventPanel("No active sequence.");
		}
	},

	modifyWorkArea : function () {
		var seq = app.project.activeSequence;
		if (seq) {
			var workAreaIsEnabled = seq.isWorkAreaEnabled();
			if (!workAreaIsEnabled) {
				var confirmString	= "Enable work area for " + seq.name + "?";
				var turnOn			= confirm(confirmString, true, "Are you sure...?");
				if (turnOn) {
					$._PPP_.enableWorkArea(true);
				}
			}
			var oldIn 		= seq.getWorkAreaInPointAsTime();
			var oldOut 		= seq.getWorkAreaOutPointAsTime();
			var newIn 		= oldIn;
			var newOut 		= oldOut;
			var duration 	= oldOut.seconds	- oldIn.seconds;
			newIn.seconds 	= oldIn.seconds		+ 10;
			newOut.seconds 	= oldOut.seconds	- 10;

			seq.setWorkAreaInPoint(newIn.seconds);
			seq.setWorkAreaOutPoint(newOut.seconds);
		}
	},

	setLocale : function (localeFromCEP) {
		$.locale = localeFromCEP;
		$._PPP_.updateEventPanel("ExtendScript Locale set to " + localeFromCEP + ".");
	},

	disableTranscodeOnIngest : function(newValue){
		return app.setEnableTranscodeOnIngest(newValue);
	},

	generateSystemCompatibilityReport : function(){
		app.enableQE();
		var outputPath = new File("~/Desktop");
		var outputFileName = outputPath.fsName + $._PPP_.getSep() + "System_Compatibility_Report.txt";
		SystemCompatibilityReport.CreateReport(outputFileName);
		$._PPP_.updateEventPanel("System Compatibility report and project analysis report saved to user's Desktop.");
	},
};


