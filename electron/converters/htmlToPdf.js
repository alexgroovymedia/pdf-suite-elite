const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Convert HTML string content to a PDF using Chromium's printToPDF.
 * @param {string} htmlContent – the HTML string
 * @param {string} outputPath  – absolute path for the output PDF
 */
async function htmlToPdf(htmlContent, outputPath) {
  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 768,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    // Load HTML content via data URI
    const encoded = Buffer.from(htmlContent, 'utf-8').toString('base64');
    await win.loadURL(`data:text/html;base64,${encoded}`);

    // Wait a moment for rendering
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, pdfData);
  } finally {
    win.destroy();
  }
}

module.exports = { htmlToPdf };
