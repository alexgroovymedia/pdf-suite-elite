const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDefaultOutputDir } = require('./paths');

const SETTINGS_DIR = path.join(os.homedir(), '.pdf-suite-elite');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  outputFolder: getDefaultOutputDir(),
  openFolderAfterBatch: true,
  appendTimestamp: false,
  recentFiles: [],
};

function ensureSettingsDir() {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }
}

function getSettings() {
  ensureSettingsDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function setSettings(newSettings) {
  ensureSettingsDir();
  const current = getSettings();
  const merged = { ...current, ...newSettings };
  // Restore defaults for null values
  if (!merged.outputFolder) {
    merged.outputFolder = DEFAULT_SETTINGS.outputFolder;
  }
  // Validate recentFiles
  if (Array.isArray(merged.recentFiles)) {
    merged.recentFiles = merged.recentFiles.slice(0, 10);
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

function resetSettings() {
  ensureSettingsDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  return { ...DEFAULT_SETTINGS };
}

module.exports = { getSettings, setSettings, resetSettings, getDefaultOutputDir };
