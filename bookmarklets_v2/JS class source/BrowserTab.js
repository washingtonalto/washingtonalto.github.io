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
