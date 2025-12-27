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