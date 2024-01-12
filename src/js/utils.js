class Logger {
    log; //log parent Node
    logArea; //logging textArea
    explainer;
    error;
    verboseLogging = false;
    #initialized = false;

    static LOG_LEVELS = {
        critical: "CRIT",
        status: "STAT",
        info: "INFO",
        error: "ERR "
    }

    /**
     * Empty constructor
     */
    Logger() {
    }
    /**
     * Constructor     
     * @param {JQuery-Object} logElement 
     * @param {DOM-Object} logAreaElement 
     * @param {jQuery-Object} explainerElement
     * @param {jQuery-Object} errorElement 
    */
    Logger(logElement, logAreaElement, explainerElement, errorElement) {
        this.init(logElement, logAreaElement, explainerElement, errorElement);
    }


    /**
     * Initialize object
     * @param {JQuery-Object} logElement 
     * @param {DOM-Object} logAreaElement 
     * @param {jQuery-Object} explainerElement
     * @param {jQuery-Object} errorElement 
     */
    init(logElement, logAreaElement, explainerElement, errorElement) {
        this.log = logElement;
        this.logArea = logAreaElement;
        this.explainer = explainerElement;
        this.error = errorElement;
        this.#initialized = true;
    }
    /**
     * Adds a new log message to the log text area.
     * @param {string} text 
     * @param {string} level 
     */
    addLog(text, level) {
        if (!this.#initialized) {
            return;
        }
        if (level === Logger.LOG_LEVELS.error || this.verboseLogging) {
            if (this.log.hasClass('hidden')) {
                this.log.removeClass('hidden');
            }

            this.logArea.value = this.#timeStamp() + level + " " + text + "\n" + this.logArea.value;
        }
        if (level === Logger.LOG_LEVELS.status) {
            this.explainer.addClass('hidden');
            this.error.removeClass('hidden');
            this.error.text(text);
        }
        return level;
    }

    /**
     * Set log status outside of logging area.

     * @param {string} text 
     * @param {string} level 
     */
    static setLogStatus(explainer, error, text, level) {

    }

    /**
     * Clears the log area.
     */
    clearLog() {
        if (!this.#initialized) {
            return;
        }
        this.logArea.value = '';
    }

    /**
     * Hides log area.
     */
    hideLog() {
        this.verboseLogging = false;
        this.log.addClass('hidden');
    }
    /**
     * Toggles log area visiblity.
     */
    toggleLog() {
        this.log.toggleClass('hidden');
    }
    /**
     * Creates a new timestamp, which is put in fron of the log messages.
     * @returns {string}
     */
    #timeStamp() {
        let date = new Date();
        return "[" + this.#leadingZero(date.getDate()) + "." + this.#leadingZero(date.getMonth() + 1) + "." +
            date.getFullYear() + " - " + this.#leadingZero(date.getHours()) + ":" + this.#leadingZero(date.getMinutes()) +
            ":" + this.#leadingZero(date.getSeconds()) + "] ";
    }

    /**
     * Adds a leading zero to single digit numbers.
     * @param {number} number 
     * @returns {string}
     */
    #leadingZero(number) {
        return number < 10 ? "0" + number : number;
    }
}






/**
 * Retrieves the appSkinInfo.
 * @param {*} event 
 */
function onAppThemeColorChanged() {
    // Should get a latest HostEnvironment object from application.
    let skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
    // Gets the style information such as color info from the skinInfo, 
    // and redraw all UI controls of your extension according to the style info.
    updateThemeWithAppSkinInfo(skinInfo);
}

/**
 * Set host in html as class - e.g. ppro or kbrg
 */
function setHostinDOM() {
    let host = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appId.toLowerCase();
    document.children[0].classList.add(host);

    return host;
}
/**
 * Adds a new css style to the style#dynStyle element. This enables dynamic theme updates according to the 
 * settings in Premiere.
 * @param {*} appSkinInfo 
 */
function updateThemeWithAppSkinInfo(appSkinInfo) {

    //Update the background color of the panel

    let panelBackgroundColor = toHex(appSkinInfo.panelBackgroundColor.color);

    let cssStyle = `:root {
        --dark-color: ${panelBackgroundColor};
        --bright-color: ${lightenDarkenColor(panelBackgroundColor, 150)};
        --highlight-color: ${toHex(appSkinInfo.systemHighlightColor)}; 
        --font-size: ${appSkinInfo.baseFontSize}px;  
    }`;
    $("#dynStyle")[0].textContent = cssStyle;
}

/**
 * Convert the Color object to string in hexadecimal format;
 * @param {{red: string|number, green: string|number, blue: string|number}} color 
 * @param {number} delta 
 * @return {string} color as hex value
 */
function toHex(color, delta) {
    /**
     * Creates a hex value for a given number offset by the delta.
     * @param {number} value 
     * @param {number} delta 
     * @return {string} hex value
     */
    function computeValue(value, delta) {
        var computedValue = !isNaN(delta) ? value + delta : value;
        if (computedValue < 0) {
            computedValue = 0;
        } else if (computedValue > 255) {
            computedValue = 255;
        }

        computedValue = Math.round(computedValue).toString(16);
        return computedValue.length == 1 ? "0" + computedValue : computedValue;
    }

    var hex = "";
    if (color) {
        hex = computeValue(color.red, delta) + computeValue(color.green, delta) + computeValue(color.blue, delta);
    }
    return "#" + hex;
}
/**
 * Lightens and darkens colors in hex format.
 * @author Chris Coyier
 * @source https://css-tricks.com/snippets/javascript/lighten-darken-color/
 * @param {string} col 
 * @param {number} amt
 * @return {string} color as hex string 
 */
function lightenDarkenColor(col, amt) {

    var usePound = false;

    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }

    var num = parseInt(col, 16);

    var r = (num >> 16) + amt;

    if (r > 255) r = 255;
    else if (r < 0) r = 0;

    var b = ((num >> 8) & 0x00FF) + amt;

    if (b > 255) b = 255;
    else if (b < 0) b = 0;

    var g = (num & 0x0000FF) + amt;

    if (g > 255) g = 255;
    else if (g < 0) g = 0;

    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);

}
