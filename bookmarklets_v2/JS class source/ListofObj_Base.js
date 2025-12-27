
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
     *
     * @returns {string}
     */
    render() {
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
        return html;
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
            .map(v => ListofObj_Base.formatValue(v))
            .join(this.columnDelimiter) +
            this.rowDelimiter;
        });

        return output;
    }
}
