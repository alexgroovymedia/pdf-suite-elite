const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { getSettings, setSettings, getDefaultOutputDir } = require('./util/settings');
const { convertWithLibreOffice } = require('./converters/libreoffice');
const { imagesToPdf } = require('./converters/imagesToPdf');
const { htmlToPdf } = require('./converters/htmlToPdf');

function validateFilePath(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new Error('Invalid file path.');
  }
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return resolved;
}

function ensureOutputDir(outputDir) {
  if (!outputDir) {
    outputDir = getDefaultOutputDir();
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

function generateOutputName(inputPath, ext, settings) {
  const base = path.basename(inputPath, path.extname(inputPath));
  if (settings.appendTimestamp) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${base}_${ts}${ext}`;
  }
  return `${base}${ext}`;
}

function registerIpcHandlers() {
  ipcMain.handle('open-file-dialog', async (_event, filters) => {
    if (!Array.isArray(filters)) {
      filters = [{ name: 'All Files', extensions: ['*'] }];
    }
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters,
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('read-file-bytes', async (_event, filePath) => {
    const resolved = validateFilePath(filePath);
    const buffer = fs.readFileSync(resolved);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  });

  ipcMain.handle('convert-to-pdf', async (_event, job) => {
    const settings = getSettings();
    const outputDir = ensureOutputDir(settings.outputFolder);

    if (!job || !job.type) {
      throw new Error('Invalid conversion job.');
    }

    try {
      switch (job.type) {
        case 'docx':
        case 'xlsx':
        case 'pptx': {
          const inputPath = validateFilePath(job.inputPath);
          const result = await convertWithLibreOffice(inputPath, outputDir, 'pdf');
          return { success: true, outputPath: result };
        }
        case 'image': {
          const inputPath = validateFilePath(job.inputPath);
          const outName = generateOutputName(inputPath, '.pdf', settings);
          const outPath = path.join(outputDir, outName);
          await imagesToPdf(inputPath, outPath);
          return { success: true, outputPath: outPath };
        }
        case 'html-file': {
          const inputPath = validateFilePath(job.inputPath);
          const htmlContent = fs.readFileSync(inputPath, 'utf-8');
          const outName = generateOutputName(inputPath, '.pdf', settings);
          const outPath = path.join(outputDir, outName);
          await htmlToPdf(htmlContent, outPath);
          return { success: true, outputPath: outPath };
        }
        case 'html-string': {
          if (!job.htmlContent || typeof job.htmlContent !== 'string') {
            throw new Error('No HTML content provided.');
          }
          const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const outName = `html_${ts}.pdf`;
          const outPath = path.join(outputDir, outName);
          await htmlToPdf(job.htmlContent, outPath);
          return { success: true, outputPath: outPath };
        }
        default:
          throw new Error(`Unknown conversion type: ${job.type}`);
      }
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('convert-from-pdf', async (_event, job) => {
    const settings = getSettings();
    const outputDir = ensureOutputDir(settings.outputFolder);

    if (!job || !job.type) {
      throw new Error('Invalid conversion job.');
    }

    try {
      switch (job.type) {
        case 'docx': {
          const inputPath = validateFilePath(job.inputPath);
          const result = await convertWithLibreOffice(inputPath, outputDir, 'docx');
          return { success: true, outputPath: result };
        }
        case 'png': {
          // PNG rendering happens in the renderer via canvas.
          // This handler just returns the outputDir so the renderer knows where to save.
          return { success: true, outputDir };
        }
        default:
          throw new Error(`Unknown conversion type: ${job.type}`);
      }
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('save-png-bytes', async (_event, filename, bytes) => {
    if (typeof filename !== 'string' || !filename.endsWith('.png')) {
      throw new Error('Invalid filename for PNG save.');
    }
    if (!(bytes instanceof ArrayBuffer) && !Buffer.isBuffer(bytes)) {
      throw new Error('Invalid PNG byte data.');
    }
    const settings = getSettings();
    const outputDir = ensureOutputDir(settings.outputFolder);
    const safeName = path.basename(filename);
    const outPath = path.join(outputDir, safeName);
    fs.writeFileSync(outPath, Buffer.from(bytes));
    return outPath;
  });

  ipcMain.handle('open-path-in-explorer', async (_event, targetPath) => {
    if (typeof targetPath !== 'string') {
      throw new Error('Invalid path.');
    }
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      shell.openPath(targetPath);
    } else if (fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
    } else {
      throw new Error('Path does not exist.');
    }
  });

  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  ipcMain.handle('set-settings', (_event, newSettings) => {
    if (typeof newSettings !== 'object' || newSettings === null) {
      throw new Error('Invalid settings object.');
    }
    setSettings(newSettings);
    return getSettings();
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-third-party-notices-text', () => {
    const possiblePaths = [
      path.join(process.resourcesPath || '', 'licenses', 'THIRD_PARTY_NOTICES.txt'),
      path.join(__dirname, '..', 'licenses', 'THIRD_PARTY_NOTICES.txt'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf-8');
      }
    }
    return 'Third-party notices file not found.';
  });
}

module.exports = { registerIpcHandlers };
