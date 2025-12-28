(function () {

    /**
     * ============================================================
     * Bookmarklet Guard Clause
     * ============================================================
     * Prevents redefining classes when the bookmarklet is executed
     * multiple times on the same page.
     *
     * All core classes must be undefined before continuing.
     */
    if (["BrowserTab", "PageProperty", "Obj_to_JSON"]
        .every(k => typeof globalThis[k] === "undefined")) {

        /* ============================================================
         * 1. Utility Functions
         * ============================================================
         */

        /**
         * Converts a string into a filename-safe value for Windows and Linux.
         *
         * Best practices applied:
         *  - Removes illegal characters
         *  - Normalizes whitespace
         *  - Prevents trailing dots/spaces (Windows)
         *  - Avoids Windows reserved device names
         *  - Preserves readability
         *
         * @param {string} input - Raw filename string
         * @param {Object} [options]
         * @param {string} [options.replacement="_"] - Replacement for illegal characters
         * @param {number} [options.maxLength=255] - Maximum filename length
         * @returns {string} Safe filename
         */
        function sanitizeFileName(input, options = {}) {
            const {
                replacement = "_",
                maxLength = 255
            } = options;

            if (!input || typeof input !== "string") {
                return "file";
            }

            let name = input
                .normalize("NFKD") // Normalize accented characters
                .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
                .replace(/[\x00-\x1F]/g, "") // Remove control chars
                .replace(/[\\\/:*?"<>|]/g, replacement) // Illegal Windows chars
                .replace(/\s+/g, " ") // Collapse whitespace
                .trim();

            // Remove trailing dots and spaces (Windows)
            name = name.replace(/[. ]+$/, "");

            // Prevent empty filenames
            if (!name) {
                name = "file";
            }

            // Avoid Windows reserved device names
            const windowsReserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
            if (windowsReserved.test(name)) {
                name = `${name}_file`;
            }

            // Enforce max length (preserve extension if present)
            if (name.length > maxLength) {
                const extMatch = name.match(/(\.[^.]+)$/);
                const ext = extMatch ? extMatch[1] : "";
                const base = name.slice(0, maxLength - ext.length);
                name = base + ext;
            }

            return name;
        }

        /**
         * Safely validates whether a dotted path resolves to an object.
         *
         * @param {string} objPath - Dot-delimited object path (e.g. "document.location")
         * @returns {boolean} True if resolved value is an object
         */
        function validateObjectPath(objPath) {
            const value = resolvePath(globalThis, objPath);
            return typeof value === "object" && value !== null;
        }

        /**
         * Safely resolves a dotted property path on an object.
         *
         * @param {Object} root - Root object (e.g., objItem, globalThis)
         * @param {string} path - Dot-delimited property path
         * @returns {*} Resolved value or undefined
         */
        function resolvePath(root, path) {
            return path
            .split(".")
            .reduce((acc, key) => acc && acc[key], root);
        }

        /* ============================================================
         * 2. Class Definitions
         * ============================================================
         */

        /**
         * ============================================================
         * Class: BrowserTab
         * ============================================================
         * Utility class responsible for safely opening a new browser
         * tab (or window) and injecting HTML content into it.
         *
         * Designed specifically for bookmarklet usage with:
         * - Popup-blocker handling
         * - Cross-browser compatibility
         * - Simple static API
         */
        class BrowserTab {

            /**
             * Opens a new browser tab and writes a full HTML document.
             *
             * @param {string} htmlContent - Fully composed HTML string
             * @param {string} [windowName="_blank"] - Optional window name
             * @returns {void}
             */
            static openWithHTML(htmlContent, windowName = "_blank") {
                const win = window.open("", windowName);

                if (!win) {
                    alert("Popup blocked. Please allow popups for this site.");
                    return;
                }

                try {
                    win.document.open();
                    win.document.write(htmlContent);
                    win.document.close();
                    win.focus();
                } catch (error) {
                    console.error("BrowserTab error:", error);
                }
            }
        }

        /**
         * ============================================================
         * Class: PageProperty
         * ============================================================
         * Responsible for rendering page-level metadata such as:
         * - Report title
         * - Page URL
         * - Page name
         *
         * Used to generate consistent headers and footers
         * for bookmarklet-generated reports.
         */
        class PageProperty {

            /** @type {string} Report page title */
            pageTitle = "";

            /**
             * @type {Object}
             * Key-value pairs representing page properties to display
             * Example: { "Page URL": location.href }
             */
            objProperty = {};

            /**
             * @param {Object} objProperty - Page properties to display
             * @param {string} [pageTitle=""] - Report title
             */
            constructor(objProperty, pageTitle = "") {
                this.pageTitle = pageTitle;
                this.objProperty = objProperty;
            }

            /**
             * Generates HTML for the page header section.
             * Includes:
             * - <title> tag
             * - <h1> heading
             * - Key-value metadata list
             *
             * @returns {string} HTML header block
             */
            displayPageHeaders() {
                let strHeader = this.pageTitle;
                let strOutput = "<TITLE>" + strHeader + "</TITLE>";
                strOutput += "<H1>" + strHeader + "</H1>";

                for (let key in this.objProperty) {
                    strOutput += "<STRONG>" + key + "</STRONG>: ";
                    strOutput +=
                    PageProperty.formatObjvalues(this.objProperty[key]) + "<BR>";
                }

                strOutput += "<BR>";
                return strOutput;
            }

            /**
             * Generates HTML for the page footer section.
             * Typically used for copyright or attribution.
             *
             * @returns {string} HTML footer block
             */
            displayPageFooters() {
                return `
                    <BR><BR>
                    <DIV style='text-align: center;'>
                        <CITE>Copyright: (c) 2026, Washington Alto</CITE>
                    </DIV>
                `;
            }

            /**
             * Determines whether a string is a valid HTTP/HTTPS URL.
             *
             * @param {string} strTest - String to test
             * @returns {boolean} True if valid URL
             */
            static isValidHttpUrl(strTest) {
                try {
                    const url = new URL(strTest);
                    return url.protocol === "http:" || url.protocol === "https:";
                } catch (_) {
                    return false;
                }
            }

            /**
             * Safely formats object values for HTML display.
             * - Escapes HTML characters
             * - Converts URLs into clickable links
             *
             * @param {*} strCellinput - Value to format
             * @returns {string} HTML-safe string
             */
            static formatObjvalues(strCellinput) {

                const tagsToReplace = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;"
                };

                const replaceTag = tag => tagsToReplace[tag] || tag;

                /**
                 * Escapes HTML characters so raw HTML can be safely displayed.
                 * Source:
                 * https://stackoverflow.com/questions/5499078
                 */
                const safe_tags_replace = str =>
                    str.replace(/[&<>]/g, replaceTag);

                let strOutput;

                if (PageProperty.isValidHttpUrl(strCellinput)) {
                    strOutput = `
                        <A HREF="${strCellinput}" target="_blank">
                            ${decodeURIComponent(strCellinput)}
                        </A>
                    `;
                } else {
                    strOutput =
                        strCellinput == null ||
                        String(strCellinput).trim().length === 0
                         ? ""
                         : safe_tags_replace(String(strCellinput).trim());
                }

                return strOutput;
            }
        }

        /**
         * ============================================================
         * Class: Obj_to_JSON
         * ============================================================
         * Converts a JavaScript object into:
         * - A recursive HTML visualization
         * - A downloadable JSON file
         *
         * Intended for inspection and debugging via bookmarklets.
         */
        class Obj_to_JSON {

            /** @type {string} Accumulated HTML output */
            strHTMLlines = "";

            /** @type {string} Raw JSON string */
            objJSON = "";

            /**
             * Generates inline CSS styles for object display.
             *
             * @param {string} divBackgroundcolor - Background color
             * @param {string} divPropertycolor - Property name color
             * @returns {string} HTML <style> block
             */
            static setDivStyle(divBackgroundcolor, divPropertycolor) {
                return `
            <STYLE>
                .propertyname { font-weight: bold; color: ${divPropertycolor}; }
                .outputarea { background-color: ${divBackgroundcolor}; }
            </STYLE>
        `;
            }

            /**
             * @param {string} inputObjPath - Path to global object (e.g. "document.location")
             */
            constructor(inputObjPath) {
                this.inputObj = resolvePath(globalThis, inputObjPath);
                this.inputObjname = inputObjPath;
            }

            /**
             * Recursively converts an object into nested HTML lists.
             *
             * @param {Object} obj - Object to format
             * @returns {string} HTML representation
             */
            static recursiveObjformat(obj) {
                let html = "<DIV class='outputarea'><UL>";

                for (let property in obj) {
                    if (!obj.hasOwnProperty(property))
                        continue;

                    const value = obj[property];
                    html += `<LI><SPAN class='propertyname'>${property}</SPAN>: `;

                    if (value === null) {
                        html += "(null)";
                    } else if (typeof value === "function") {
                        html += value.toString();
                    } else if (Array.isArray(value)) {
                        html += "<OL>";
                        for (let item of value) {
                            html += "<LI>";
                            html +=
                            item && typeof item === "object"
                             ? this.recursiveObjformat(item)
                             : item;
                            html += "</LI>";
                        }
                        html += "</OL>";
                    } else if (typeof value === "object") {
                        html += this.recursiveObjformat(value);
                    } else {
                        html += value;
                    }

                    html += "</LI>";
                }

                return html + "</UL></DIV>";
            }

            /**
             * Generates full HTML output including:
             * - Object visualization
             * - JSON download link
             *
             * @param {string} [divBackgroundcolor="lightblue"]
             * @param {string} [divPropertycolor="blue"]
             * @param {string} [jsonFileName="download.json"]
             * @returns {string} HTML output
             */
            display(divBackgroundcolor = "lightblue", divPropertycolor = "blue", jsonFileName = "download.json") {
                let html = `<STRONG>Object selected</STRONG>: ${this.inputObjname}`;

                html += Obj_to_JSON.setDivStyle(
                    divBackgroundcolor,
                    divPropertycolor);

                html += Obj_to_JSON.recursiveObjformat(this.inputObj);

                const json = Obj_to_JSON.createobjJSON(this);
                html += Obj_to_JSON.createJSONBloblink(json, jsonFileName);

                return html;
            }

            /**
             * Converts the selected object into a formatted JSON string.
             *
             * @param {Obj_to_JSON} thisObj
             * @returns {string} JSON string
             */
            static createobjJSON(thisObj) {
                return JSON.stringify(thisObj.inputObj, null, 2);
            }

            /**
             * Creates a downloadable JSON blob link.
             *
             * @param {string} objJSON - JSON string
             * @param {string} [jsonFileName="download.json"]
             * @returns {string} HTML anchor element
             */
            static createJSONBloblink(objJSON, jsonFileName = "download.json") {
                const blob = new Blob([objJSON], {
                    type: "application/json"
                });
                const url = URL.createObjectURL(blob);

                return `
            <A href="${url}" download="${jsonFileName}">
                Download as JSON
            </A><BR><BR>
        `;
            }
        }

        /* ============================================================
         * 3. Main Execution Flow
         * ============================================================
         */

        const page = new PageProperty({
            "Page URL": location.href,
            "Page Name": document.title
        }, "WLA Tealium Check Page Tool ver 1");

        let html = page.displayPageHeaders();
        let customObj = {};

        customObj = new Obj_to_JSON("utag.data");
        html += customObj.display(undefined,undefined,sanitizeFileName(location.href+"/utag.data.json"));

        customObj = new Obj_to_JSON("utag.rpt");
        html += customObj.display(undefined,undefined,sanitizeFileName(location.href+"/utag.rpt.json"));

        customObj = new Obj_to_JSON("utag.cfg");
        html += customObj.display(undefined,undefined,sanitizeFileName(location.href+"/utag.cfg.json"));

        customObj = new Obj_to_JSON("utag.send");
        html += customObj.display(undefined,undefined,sanitizeFileName(location.href+"/utag.send.json"));

        customObj = new Obj_to_JSON("utag.sender");
        html += customObj.display(undefined,undefined,sanitizeFileName(location.href+"/utag.sender.json"));

        if (utag.gdpr) {
            if (utag.gdpr.consent_prompt) {
                customObj = new Obj_to_JSON("utag.gdpr.consent_prompt");
                html += customObj.display(undefined,undefined,sanitizeFileName(location.href+"/utag.gdpr.consent_prompt.json"));
            }
            if (utag.gdpr.preferences_prompt) {
                customObj = new Obj_to_JSON("utag.gdpr.preferences_prompt");
                html += customObj.display(undefined,undefined,sanitizeFileName(location.href+"/utag.gdpr.preferences_prompt.json"));
            }
            customObj = new Obj_to_JSON("utag.gdpr.values");
            html += customObj.display(undefined,undefined,sanitizeFileName(location.href+"/utag.gdpr.values.json"));
        }

        html += page.displayPageFooters();
        BrowserTab.openWithHTML(html);
    }
})();
