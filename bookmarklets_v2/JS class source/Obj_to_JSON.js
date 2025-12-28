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
    display(divBackgroundcolor = "lightblue", divPropertycolor = "blue",jsonFileName = "download.json") {
        let html = `<STRONG>Object selected</STRONG>: ${this.inputObjname}`;

        html += Obj_to_JSON.setDivStyle(
            divBackgroundcolor,
            divPropertycolor);

        html += Obj_to_JSON.recursiveObjformat(this.inputObj);

        const json = Obj_to_JSON.createobjJSON(this);
        html += Obj_to_JSON.createJSONBloblink(json,jsonFileName);

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
