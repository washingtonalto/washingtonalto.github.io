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
    options = [
      { label: "Option A", value: "A" },
      { label: "Option B", value: "B" }
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
                  `
                  )
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
          'input[name="rcp"]:checked'
        );

        cleanup(selected ? selected.value : null);
      };
    });
  }
}
