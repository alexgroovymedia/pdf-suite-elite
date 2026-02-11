const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Locate the soffice executable.
 * Priority:
 *   1. Bundled under resources/lo/program/soffice.exe
 *   2. System install at standard Windows paths
 *   3. null (not found)
 */
function findSofficePath() {
  // 1. Bundled path (production)
  const bundledPaths = [
    path.join(process.resourcesPath || '', 'lo', 'program', 'soffice.exe'),
    path.join(process.resourcesPath || '', 'lo', 'program', 'soffice'),
    // Dev fallback
    path.join(__dirname, '..', '..', 'vendor', 'libreoffice', 'program', 'soffice.exe'),
    path.join(__dirname, '..', '..', 'vendor', 'libreoffice', 'program', 'soffice'),
  ];

  for (const p of bundledPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // 2. System install (Windows)
  if (process.platform === 'win32') {
    const systemPaths = [
      path.join('C:', 'Program Files', 'LibreOffice', 'program', 'soffice.exe'),
      path.join('C:', 'Program Files (x86)', 'LibreOffice', 'program', 'soffice.exe'),
    ];
    for (const p of systemPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  // 3. macOS / Linux system fallback for dev
  if (process.platform === 'darwin') {
    const macPath = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    if (fs.existsSync(macPath)) return macPath;
  }
  if (process.platform === 'linux') {
    const linuxPath = '/usr/bin/soffice';
    if (fs.existsSync(linuxPath)) return linuxPath;
  }

  return null;
}

/**
 * Return the default documents output directory.
 */
function getDefaultOutputDir() {
  const docs = path.join(os.homedir(), 'Documents', 'PDF Suite Elite', 'Exports');
  return docs;
}

module.exports = { findSofficePath, getDefaultOutputDir };
