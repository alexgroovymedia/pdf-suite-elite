export function initSettings() {
  const container = document.getElementById('view-settings');
  container.innerHTML = `
    <h2 class="view-title">Settings</h2>

    <div class="settings-group">
      <h3 style="font-size:14px;margin-bottom:12px">Output Folder</h3>
      <div class="setting-row">
        <span class="folder-path" id="settings-output-path">Loading...</span>
        <button class="btn btn-secondary btn-sm" id="settings-choose-folder">Choose Folder</button>
      </div>
    </div>

    <div class="settings-group">
      <label>
        <input type="checkbox" id="settings-open-folder" />
        Open output folder after batch completes
      </label>
      <label>
        <input type="checkbox" id="settings-timestamp" />
        Append timestamp to output filenames
      </label>
    </div>

    <div style="margin-top:20px">
      <button class="btn btn-danger btn-sm" id="settings-reset">Reset All Settings</button>
    </div>
  `;

  const outputPathEl = document.getElementById('settings-output-path');
  const openFolderCb = document.getElementById('settings-open-folder');
  const timestampCb = document.getElementById('settings-timestamp');

  async function loadSettings() {
    const settings = await window.api.getSettings();
    outputPathEl.textContent = settings.outputFolder || 'Not set';
    openFolderCb.checked = !!settings.openFolderAfterBatch;
    timestampCb.checked = !!settings.appendTimestamp;
  }

  document.getElementById('settings-choose-folder').addEventListener('click', async () => {
    const folder = await window.api.openFolderDialog();
    if (folder) {
      await window.api.setSettings({ outputFolder: folder });
      loadSettings();
    }
  });

  openFolderCb.addEventListener('change', async () => {
    await window.api.setSettings({ openFolderAfterBatch: openFolderCb.checked });
  });

  timestampCb.addEventListener('change', async () => {
    await window.api.setSettings({ appendTimestamp: timestampCb.checked });
  });

  document.getElementById('settings-reset').addEventListener('click', async () => {
    await window.api.setSettings({
      outputFolder: null,
      openFolderAfterBatch: true,
      appendTimestamp: false,
      recentFiles: [],
    });
    loadSettings();
  });

  loadSettings();
}
