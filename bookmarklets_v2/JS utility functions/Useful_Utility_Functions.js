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
        .normalize("NFKD")                // Normalize accented characters
        .replace(/[\u0300-\u036f]/g, "")  // Remove diacritics
        .replace(/[\x00-\x1F]/g, "")      // Remove control chars
        .replace(/[\\\/:*?"<>|]/g, replacement) // Illegal Windows chars
        .replace(/\s+/g, " ")             // Collapse whitespace
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
