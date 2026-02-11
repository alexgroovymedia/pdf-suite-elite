// PDF → PNG rendering is done in the renderer process (where canvas is available).
// This module is a placeholder; the renderer drives canvas rendering and sends
// PNG bytes back to main via the save-png-bytes IPC handler.
//
// See src/ui/convertFromPdf.js for the renderer-side implementation.

module.exports = {};
