# Automated Timecode Update for Adobe Premiere Pro  14.5+ (CC 2020)

*Made for .csv files exported by the [Tentacle Timecode Tool 1.16](https://tentaclesync.com/timecode-tool).*

## Automated processing
This CEP HTML plugin changes start times of media files (can be any, except sequences) in a Premiere Pro project. 

**Important: Media files are not changed. Only XMP Metadata is updated. Use at your own risk.**

There is no guarantee every editing software is capable of interpreting Adobe XMP metadata.

![Default panel look](payloads/panel_1.png)


## Why would you need that?

This plugin offers following benefits:

- **Fast** - it is multiple times faster then baking the timecode with a conversion or manual timecode updates
- **Flexible** - modifying the .csv file in your spreadsheet app of choice offers to possibility to fix timecode drift or add missing timecode if a conversion should have failed. (Out of the box Premiere offers nothing comparable besides changing every file one by one.)
- **Non destructive** - original start time / time code will not be overwritten
- **Framerating mixing** - automatically converts different timebases (e.g. from a 25 fps source to a 30 fps file).

### Why can't this plugin not read audio timecode?

It would have drastically widened the scope and it wouldn't ahve been able to be made in the time that it was.

## Options


After selecting your file, you can select following options to discover the media files you need:

- **Start with project bin / selection** 
    
    These radio buttons decide whether your selection or the project root / bin are the starting base to search for clips.

- **Search in sub bins**

    Enabling this option will make the program "open" every folder it discovers. Should be used in caution in combination with selections. Repeating matches will be disgarded, but it might take longer. 

- **Disable media start comparison**

    Enabling this option will disable the comparing of the file timecode parsed from the .csv and the media start time of the clip. It will then only compare the file name and duration, which in an off change lead to false matches.

    This can be used to correct mistakes or bulk revert changes (with swapped .csv columns).

- **Enable verbose logging**

    Enabling this option will show an extensive log of what is happening in the plugin. Errors contained in the .csv will show up no matter the settings.

    #### Logging levels
   - **CRIT** - plugin errors (e.g. settings invalid etc.)
   - **ERR** - mistakes in the .csv  
   - **INFO** - normal program routines
   - **STAT** - errors that disrupted the process

![Panel with logging enabled](payloads/panel_2.png)


### .CSV content / Manual input

If a .csv spreadsheet is created without the tentacle timecode tool, it has to contain "File Name", "Duration", "File TC", "Audio TC" and "Framerate" in this order.

| File Name | Duration | File TC | Audio TC | Framerate
|-----------|----------|---------|----------|-----------
|Test | 00:00:05 | 15:23:10:20| 15:23:08:20 | 25.00

Tentacle Timecode Tool only stores hh:mm:ss for durations, but frames can be inserted in this section. The match will work anyways.

## Safety

It was important for me to get a quick overview on mistakes that might have come up during import, so one can fix it easily. Especially for the more critical process of settings timecodes, where finding mistakes can take a long time. For this reason a log area is implement, which shows errors or a verbose process status.

If an error in the csv is discovered at the parsing stage, it will push a log message inside the gui with the cause of failure.

The process will stop if the file is not a .csv, header information of the .csv is incomplete, the rows are missing columns etc. . 

Parsing single rows will give a warning for every file that couldn't be processed.

At the end every successful change will be logged only if verbose logging is enabled.
- - -

## Version history

### Current

### Previous

| Version   | Date      | Description
|---------  |------     |------------
| 0.10      | 10.12.2020 | Pre-test, non-compiled, but optically finished build
| 0.00      | 25.11.2020 | Development start
- - -

## Maintenance

This plugin will not be thoroughly maintained. If any bugs occur, it might take a while for them to be fixed. It is just a side project of myself.

---

## Compiling / running the source code

Running the plugin via the source code requires the setting up [Premiere Pro for Developemnt](https://github.com/Adobe-CEP/Samples/tree/master/PProPanel).

Further informations for creating a package out of changed source code can be found under this link as well.

---

## License

---
## Future

This is considered feature complete. There will only be bug fixes if the time allows and or maintenance to make the plugin run on newer Premiere Pro versions again.

---

## Reason

I film with DSLRs cameras providing interal timecode, but not taking external sources. So it is hard to synchronize those files using the benefits of timecode. Thus I record audio timecode via a Tentactle Sync E s. 

These audio timecode need to be read by a tool like the Tentacle Timecode Tool and can then be converted to a new media file with the correct time code. Since this takes up a considerable amount of CPU-Time, I have opted to painstackenly update the timecodes by hand. Since this takes up 30 min to several hours per project anyways, I wanted to automate the direct update of the media metadata. It now does work in a few milliseconds to seconds instead of hours. 

This could have been implemented as a macro as well. Implementing error detection / correction would have needed extensive programming anywways. 

So I opted for making a CEP plugin which integrates seemlessly into Premiere. I wanted an "easier" scope to test CEP plugin development for Premiere, to have a better idea creating future  plugins.
ing a JavaScript debugger

To enable debugging of panels using Chrome’s developer tools, put a file named
`.debug` into your extension’s folder (as a peer of the `/CSXS` folder). The
contents of the file should resemble the following (and the Extension ID must
match the one in the panel's manifest):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
    <Extension Id="com.example.PProPanel">
        <HostList>
            <Host Name="PPRO" Port="7777"/>
        </HostList>
    </Extension>
</ExtensionList>
```

When the panel is active, you can debug the panel in Chrome by
browsing to `localhost:7777`, and selecting your panel:

![Localhost screenshot](payloads/localhost.png)

Note: You can also use Microsoft Visual Studio Code to debug your panel's JavaScript.

Optional diagnostics: Turn on CEP logging. Find CEP logs (distinct from Premiere
Pro's logs) here. Note that Mac Library path is the system's library, not the
user's. Also, note that logging WILL impact performance.

```html
Windows:    %\AppData\Local\Temp\csxs9-PPRO.log
Mac:        /Library/Logs/CSXS/csxs9-PPRO.log
```

Set logging level in Windows Registry (see above), or MacOS X .plist:

```html
defaults write /Users/<username>/Library/Preferences/com.adobe.CSXS.9.plist LogLevel 6
```

## 5. Create your panel's ExtendScript using Microsoft Visual Studio Code

Once you've installed the ExtendScript debugging extension, you can set breakpoints in your ExtendScript code within VSCode. Here's a view of the debug configurations associated with the PProPanel sample, in VSCode:

![ESTK Screenshot](payloads/vscode_debug.png)


Here's a [screen video](https://www.dropbox.com/s/sasea78m05nqcyz/MS_Code_Debugging.mp4?dl=1)
showing how to debug panels at both the JavaScript and ExtendScript levels.

## 6. Package and deploy your panel

Further [relevant information](https://github.com/Adobe-CEP/Getting-Started-guides/tree/master/Package%20Distribute%20Install) is available from the Extensibility team.

You can either generate a self-signed certificate (ZXPSignCmd will make them for
you), or get one from a commercial security provider. Here's an example:

```bash
./ZXPSignCmd -selfSignedCert US California Adobe "Bruce Bullis" TotallySecurePassword certificate.p12
```

To sign directory `/PanelDir` with `certificate.p12`, do the following:

```bash
./ZXPSignCmd -sign panelDir/ PanelName.zxp certificate.p12 password -tsa http://timestamp.digicert.com/
```

Submit your panel to the [Adobe Add-Ons
site](https://www.adobeexchange.com/producer) for approval, and distribution.
You can also directly supply the .zxp file enterprise customers, and those who
do not connect their systems to the public internet, for installation using
[ExManCmd](https://www.adobeexchange.com/resources/28), the command line version
of Extension Manager.

If you encounter any issues with the Add-Ons store or ExManCmd, please [contact
the Add-Ons team](mailto:kwak@adobe.com).

