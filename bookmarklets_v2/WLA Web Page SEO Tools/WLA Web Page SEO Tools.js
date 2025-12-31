(async() => {

    /**
     * ============================================================
     * Bookmarklet Guard Clause
     * ============================================================
     * Prevents redefining classes when the bookmarklet is executed
     * multiple times on the same page.
     *
     * All core classes must be undefined before continuing.
     */
    if (["RadioChoicePopup", "BrowserTab", "PageProperty", "ListofObj_Base", "ListofObj_to_Table", "ListofObj_to_DelimitedText"]
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

        /**
         * Get cookies as a plain object parsed from document.cookie.
         *
         * @returns {Record<string, string>}
         */
        function getCookieObject() {
            if (!document.cookie) {
                return {};
            }

            return document.cookie.split("; ").reduce((acc, cookie) => {
                const separatorIndex = cookie.indexOf("=");

                if (separatorIndex === -1) {
                    return acc;
                }

                const name = cookie.slice(0, separatorIndex).trim();
                const value = cookie.slice(separatorIndex + 1);

                try {
                    acc[name] = decodeURIComponent(value);
                } catch {
                    acc[name] = value;
                }

                return acc;
            }, {});
        }

        /**
         * Converts a cookie object into a DOM-like collection.
         *
         * @param {Record<string, string>} cookieObject
         * @returns {Object} Array-like cookie collection
         */
        function cookiesToCollection(cookieObject) {
            const collection = [];

            Object.keys(cookieObject).forEach((name, index) => {
                const item = {
                    name,
                    value: cookieObject[name]
                };

                collection.push(item);
                collection[index] = item;

                // Allow named access: collection["cookieName"]
                if (!(name in collection)) {
                    collection[name] = item;
                }
            });

            Object.defineProperties(collection, {
                length: {
                    value: collection.length,
                    writable: false
                },
                item: {
                    value(index) {
                        return this[index] || null;
                    }
                },
                namedItem: {
                    value(name) {
                        return this[name] || null;
                    }
                }
            });

            return collection;
        }

        /* ============================================================
         * 2. Class Definitions
         * ============================================================
         */

        /**
         * RadioChoicePopup
         *
         * A lightweight, dependency-free modal dialog for bookmarklets that allows
         * users to choose one option from a list (radio buttons), similar to `prompt()`
         * but with structured choices.
         *
         * - No external libraries
         * - Safe to execute multiple times
         * - Promise-based API
         * - Designed for bookmarklet execution context
         *
         * @example
         * const popup = new RadioChoicePopup({
         *   title: "Mode",
         *   message: "Select execution mode",
         *   options: [
         *     { label: "Analyze", value: "analyze" },
         *     { label: "Export", value: "export" }
         *   ]
         * });
         *
         * const result = await popup.show();
         */
        class RadioChoicePopup {

            /**
             * Creates a new RadioChoicePopup instance.
             *
             * @param {Object} [config] - Configuration object
             * @param {string} [config.title="Choose an option"] - Popup title text
             * @param {string} [config.message=""] - Optional descriptive message
             * @param {Array<{label:string,value:string}>} [config.options]
             *        Array of radio options to display
             */
            constructor({
                title = "Choose an option",
                message = "",
                options = [{
                        label: "Option A",
                        value: "A"
                    }, {
                        label: "Option B",
                        value: "B"
                    }
                ]
            } = {}) {

                /** @type {string} */
                this.title = title;

                /** @type {string} */
                this.message = message;

                /** @type {Array<{label:string,value:string}>} */
                this.options = options;

                /**
                 * DOM id used to ensure only one instance
                 * of the popup exists at a time
                 * @type {string}
                 */
                this.id = "radio-choice-popup";
            }

            /**
             * Displays the popup and waits for user interaction.
             *
             * Resolves with:
             * - selected option value (string) when OK is clicked
             * - null when Cancel is clicked
             *
             * @returns {Promise<string|null>}
             */
            show() {
                return new Promise((resolve) => {

                    /* ---------------------------------------------------------
                     * Prevent duplicate popups if bookmarklet is run again
                     * --------------------------------------------------------- */
                    const existing = document.getElementById(this.id);
                    if (existing) {
                        existing.remove();
                    }

                    /* ---------------------------------------------------------
                     * Create overlay container
                     * --------------------------------------------------------- */
                    const overlay = document.createElement("div");
                    overlay.id = this.id;

                    /* ---------------------------------------------------------
                     * Build popup HTML structure
                     * --------------------------------------------------------- */
                    overlay.innerHTML = `
        <div style="
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.45);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:2147483647;
          font-family:Arial,sans-serif;
        ">
          <div style="
            background:#fff;
            padding:16px 18px;
            width:320px;
            border-radius:8px;
            box-shadow:0 10px 25px rgba(0,0,0,.25);
          ">
            <div style="font-size:16px;font-weight:bold;margin-bottom:8px;">
              ${this.title}
            </div>

            ${
                        this.message
                         ? `<div style="margin-bottom:10px;font-size:13px;">${this.message}</div>`
                         : ""
}

            <form id="rcp-form">
              ${
                        this.options
                        .map(
                            (opt, index) => `
                    <label style="display:block;margin:6px 0;font-size:13px;">
                      <input
                        type="radio"
                        name="rcp"
                        value="${opt.value}"
                        ${index === 0 ? "checked" : ""}
                      >
                      ${opt.label}
                    </label>
                  `)
                        .join("")
}

              <div style="margin-top:12px;text-align:right;">
                <button type="button" id="rcp-cancel">Cancel</button>
                <button type="submit" style="margin-left:8px;">OK</button>
              </div>
            </form>
          </div>
        </div>
      `;

                    /* ---------------------------------------------------------
                     * Append popup to document
                     * --------------------------------------------------------- */
                    document.body.appendChild(overlay);

                    /**
                     * Cleanup helper to remove popup
                     * and resolve the Promise
                     *
                     * @param {string|null} result
                     */
                    const cleanup = (result) => {
                        overlay.remove();
                        resolve(result);
                    };

                    /* ---------------------------------------------------------
                     * Cancel button handler
                     * --------------------------------------------------------- */
                    overlay.querySelector("#rcp-cancel").onclick = () => {
                        cleanup(null);
                    };

                    /* ---------------------------------------------------------
                     * Form submit handler (OK button)
                     * --------------------------------------------------------- */
                    overlay.querySelector("#rcp-form").onsubmit = (event) => {
                        event.preventDefault();

                        const selected = overlay.querySelector(
                                'input[name="rcp"]:checked');

                        cleanup(selected ? selected.value : null);
                    };
                });
            }
        }

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
         * Base Class: ListofObj_Base
         * ============================================================
         * Shared base class for transforming collections of objects
         * using a schema-driven mapping.
         *
         * Responsibilities:
         * - Schema processing
         * - Safe property resolution (no eval)
         * - Row iteration and numbering
         * - Common value formatting
         *
         * Output rendering is delegated to subclasses.
         */
        class ListofObj_Base {

            /** @type {string[]} Column headers (includes "No.") */
            header = ["No."];

            /** @type {(string|Function)[]} Field resolvers */
            fields = [];

            /** @type {Object[]} Collection of objects */
            collection = [];

            /** @type {Object[]} schema */
            schema = [];

            /** @type {string} Optional title */
            title = "";

            /**
             * @param {Object} schema
             * Dictionary where:
             * - key   = column header label
             * - value = property path OR function(obj) => value
             *
             * @param {Object[]} collection
             */
            constructor(schema, collection) {
                this.header = this.header.concat(Object.keys(schema));
                this.fields = Object.values(schema);
                this.collection = collection;
                this.schema = schema;
            }

            /**
             * Sets an optional title.
             *
             * @param {string} title
             */
            setTitle(title = "") {
                this.title = title;
            }

            /**
             * Resolves a field value safely.
             *
             * @param {Object} objItem
             * @param {string|Function} resolver
             * @returns {*}
             */
            resolveField(objItem, resolver) {
                if (typeof resolver === "function") {
                    return resolver(objItem);
                }
                return resolvePath(objItem, resolver);
            }

            /**
             * Iterates through collection and yields resolved rows.
             *
             * @returns {Array<Array<*>>}
             */
            buildRows() {
                const rows = [];

                for (let i = 0; i < this.collection.length; i++) {
                    const objItem = this.collection[i];

                    const row = this.fields.map(resolver =>
                            this.resolveField(objItem, resolver));

                    rows.push([i + 1, ...row]);
                }

                return rows;
            }

            /**
             * Formats a value into readable text.
             * Shared by all output formats.
             *
             * @param {*} value
             * @returns {string}
             */
            static formatValue(value) {
                if (value == null)
                    return "";

                if (typeof value === "object") {
                    return Array.from(value)
                    .map(v => `${v.name}: ${v.value}`)
                    .join("; ");
                }

                return String(value).trim();
            }
        }

        /**
         * ============================================================
         * Class: ListofObj_to_Table
         * ============================================================
         * Renders collection output as an HTML table.
         */
        class ListofObj_to_Table extends ListofObj_Base {

            objCSV = ""; // Defines the string for the raw CSV object

            /**
             * Generates inline CSS styles for the table.
             */
            static tableStyle(headerBackgroundColor = "#FFC107") {
                return `
      <STYLE>
        table, th, td {
          border: 1px solid #9E9E9E;
          border-collapse: collapse;
        }
        th { background: ${headerBackgroundColor}; }
      </STYLE>
    `;
            }

            /**
             * Creates the HTML table output.
             * @param {string} [csvFileName = "download.csv"]
             * @returns {string}
             */
            render(csvFileName = "download.csv") {
                let html = "";

                if (this.title) {
                    html += `<H1>${this.title}</H1>`;
                }

                html += ListofObj_to_Table.tableStyle();
                html += "<TABLE><TR>";

                this.header.forEach(h => html += `<TH>${h}</TH>`);
                html += "</TR>";

                const rows = this.buildRows();

                rows.forEach(row => {
                    html += "<TR>";
                    row.forEach(cell => {
                        html += `<TD>${ListofObj_Base.formatValue(cell)}</TD>`;
                    });
                    html += "</TR>";
                });

                html += "</TABLE><BR>";

                const objDelimTxt = new ListofObj_to_DelimitedText(this.schema, this.collection, {
                    columnDelimiter: ",",
                    rowDelimiter: "\r\n"
                });
                this.objCSV = objDelimTxt.render();
                html += ListofObj_to_Table.createCSVBloblink(this.objCSV, csvFileName);
                return html;
            }

            /**
             * function createCSVBloblink (objCSV,csvFileName)
             * Formats the A href link for the objCSV so it can be downloadable
             * @param {string} objCSV - string of raw CSV where line breaks delimits rows of comma-separated values
             * @param {string} csvFileName - string of CSV filename. Default is "download.csv"
             * @returns {string}
             */
            static createCSVBloblink(objCSV, csvFileName = "download.csv") {
                let linkText = "Download as CSV";
                let objCSVBlob = new Blob([objCSV], {
                    type: "text/csv"
                });
                let csvURL = window.URL.createObjectURL(objCSVBlob);
                let HTMLlink =
                    '<A href="' +
                    csvURL +
                    '" download="' +
                    csvFileName +
                    '">' +
                    linkText +
                    "</A>";
                return HTMLlink;
            }

        }

        /**
         * ============================================================
         * Class: ListofObj_to_DelimitedText
         * ============================================================
         * Renders collection output as delimited plain text.
         */
        class ListofObj_to_DelimitedText extends ListofObj_Base {

            /**
             * @param {Object} schema
             * @param {Object[]} collection
             * @param {Object} [options]
             */
            constructor(schema, collection, options = {}) {
                super(schema, collection);

                this.columnDelimiter = options.columnDelimiter ?? ",";
                this.rowDelimiter = options.rowDelimiter ?? "<BR>";
            }

            /**
             * Creates delimited text output.
             *
             * @returns {string}
             */
            render() {
                let output = "";

                if (this.title) {
                    output += `<STRONG>${this.title}</STRONG>` + this.rowDelimiter;
                }

                output +=
                this.header.join(this.columnDelimiter) +
                this.rowDelimiter;

                const rows = this.buildRows();

                rows.forEach(row => {
                    output +=
                    row
                    .map(v => ListofObj_Base.formatValue(ListofObj_to_DelimitedText.escapeForCSV(ListofObj_to_DelimitedText.formatCSVcellvalues(v))))
                    .join(this.columnDelimiter) +
                    this.rowDelimiter;
                });

                return output;
            }

            /**
             * formats the string so that if it has double-quotes, it can be escaped properly for CSV formatting purposes
             * @param {string} inputString - string to be checked and formatted for quotes
             * @returns {string}
             */
            static escapeForCSV(inputString) {
                // Check if the string contains special characters
                if (/[",\n]/.test(inputString)) {
                    // Escape double quotes with double quotes and wrap the string in double quotes
                    return '"' + inputString.replace(/"/g, '""') + '"';
                }
                return inputString;
            }

            /**
             * Format CSVCellvalues so it can be displayed properly within CSV cells
             * @param {string} strCellinput - object value to be displayed in the CSV cell
             * @returns {string}
             */
            static formatCSVcellvalues(strCellinput) {
                function CSVlistAttributes(arr) {
                    let strOutput = "";
                    for (let i = 0; i < arr.length; i++) {
                        strOutput += arr[i].name + ": " + arr[i].value + ";\n\r";
                    }
                    return strOutput;
                }

                let strOutput;
                if (typeof strCellinput === "object") {
                    strOutput = CSVlistAttributes(strCellinput);
                } else {
                    strOutput = String(strCellinput).trim();
                }
                return strOutput;
            }

        }

        /* ============================================================
         * 3. Main Execution Flow
         * ============================================================
         */

        const popup = new RadioChoicePopup({
            title: "SEO Web Page SEO Tool",
            message: "Select the bookmarklet tool:",
            options: [{
                    label: "Link Tool",
                    value: "Link Tool"
                }, {
                    label: "Image Tool",
                    value: "Image Tool"
                }, {
                    label: "Cookie Tool",
                    value: "Cookie Tool"
                }, {
                    label: "Script Tool",
                    value: "Script Tool"
                }, {
                    label: "HTTP Resource Tool",
                    value: "HTTP Resource Tool"
                }
            ]
        });

        const choice = await popup.show();
        if (choice === "Link Tool") {

            listofObject = document.links;
            tableschema = {
                "Link URL": "href",
                "Link Text": "innerText",
                "Link outerHTML": "outerHTML",
                "Link attributes": "attributes"
            };

        } else if (choice === "Image Tool") {

            listofObject = document.images;
            tableschema = {
                "Image URL": "src",
                "Image Height": "height",
                "Image Width": "width",
                "Image Alt": "alt",
				"Image Loading": "loading",
				"Image srcset" : "srcset",
				"Image sizes" : "sizes",
                "Image attributes": "attributes"
            };

        } else if (choice === "Cookie Tool") {

            listofObject = cookiesToCollection(getCookieObject());
            tableschema = {
                "Cookie Name": "name",
                "Cookie Value": "value"
            };

        } else if (choice === "Script Tool") {

            listofObject = document.scripts;
            tableschema = {
                "Script id": "id",
                "Script src": "src",
				"Script async": "async",
				"Script outerText": "outerText"
            };

        } else if (choice === "HTTP Resource Tool") {

            listofObject = performance.getEntriesByType("resource"); // define the DOM object as HTML Collections
            tableschema = {
                "Resource Type": "initiatorType",
                "Resource Name": "name"
            };

        } else {

            alert("User has clicked 'Cancel'");
            return;

        }

        const page = new PageProperty({
            "Page URL": location.href,
            "Page Name": document.title,
            "Tool choice": choice
        }, "WLA Web Page SEO Tools ver 1");
        let csvFileName = location.href + "_" + choice + ".csv";
        let html = page.displayPageHeaders();
        const htmlTable = new ListofObj_to_Table(tableschema, listofObject);
        html += htmlTable.render(csvFileName);
        html += page.displayPageFooters();
        BrowserTab.openWithHTML(html);

    }
})();
