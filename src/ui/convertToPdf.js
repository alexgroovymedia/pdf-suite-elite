const ALLOWED_EXTENSIONS = ['docx', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png', 'html', 'htm'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const OFFICE_EXTENSIONS = ['docx', 'xlsx', 'pptx'];

function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (OFFICE_EXTENSIONS.includes(ext)) return ext;
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (ext === 'html' || ext === 'htm') return 'html-file';
  return null;
}

export function initConvertToPdf() {
  const container = document.getElementById('view-convert-to-pdf');
  container.innerHTML = `
    <h2 class="view-title">Convert to PDF</h2>
    <div class="error-banner" id="to-pdf-error"></div>

    <div class="drop-zone" id="to-pdf-drop">
      <div class="drop-icon">+</div>
      <p>Drop files here or click to select</p>
      <p style="font-size:12px;margin-top:4px">Supported: DOCX, XLSX, PPTX, JPG, PNG, HTML</p>
    </div>

    <div style="margin-top:20px">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--text-secondary)">HTML Conversion</h3>
      <div class="html-tabs">
        <button class="html-tab active" data-tab="html-file-tab">HTML File</button>
        <button class="html-tab" data-tab="html-paste-tab">Paste HTML</button>
      </div>
      <div class="html-panel active" id="html-file-tab">
        <button class="btn btn-secondary btn-sm" id="html-file-pick" style="margin-top:8px">Select HTML file</button>
      </div>
      <div class="html-panel" id="html-paste-tab">
        <textarea class="html-textarea" id="html-paste-area" placeholder="Paste your HTML here..."></textarea>
        <button class="btn btn-primary btn-sm" id="html-paste-convert">Convert Pasted HTML</button>
      </div>
    </div>

    <div class="queue-list" id="to-pdf-queue"></div>

    <div class="queue-actions" id="to-pdf-actions" style="display:none">
      <button class="btn btn-primary" id="to-pdf-convert-all">Convert All</button>
      <button class="btn btn-secondary" id="to-pdf-clear">Clear Queue</button>
    </div>

    <div class="queue-actions" id="to-pdf-done-actions" style="display:none">
      <button class="btn btn-primary" id="to-pdf-open-folder">Open Output Folder</button>
    </div>
  `;

  const errorBanner = document.getElementById('to-pdf-error');
  const dropZone = document.getElementById('to-pdf-drop');
  const queueEl = document.getElementById('to-pdf-queue');
  const actionsEl = document.getElementById('to-pdf-actions');
  const doneActionsEl = document.getElementById('to-pdf-done-actions');

  let queue = []; // { id, name, path, type, status, outputPath, error }
  let idCounter = 0;

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.add('visible');
    setTimeout(() => errorBanner.classList.remove('visible'), 6000);
  }

  function renderQueue() {
    queueEl.innerHTML = '';
    if (queue.length === 0) {
      actionsEl.style.display = 'none';
      doneActionsEl.style.display = 'none';
      return;
    }

    const hasQueued = queue.some((i) => i.status === 'queued');
    const allDone = queue.every((i) => i.status === 'done' || i.status === 'failed');
    actionsEl.style.display = hasQueued ? 'flex' : 'none';
    doneActionsEl.style.display = allDone ? 'flex' : 'none';

    queue.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'queue-item';
      div.innerHTML = `
        <span class="filename" title="${item.path || item.name}">${item.name}</span>
        <span class="status status-${item.status}">${item.status}</span>
        ${item.status === 'done' ? `<button class="btn btn-sm btn-secondary open-file-btn" data-path="${item.outputPath}">Open</button>` : ''}
        ${item.status === 'failed' ? `<span style="font-size:11px;color:var(--error);margin-left:8px" title="${item.error}">${truncate(item.error, 40)}</span>` : ''}
      `;
      queueEl.appendChild(div);
    });

    // Open file buttons
    queueEl.querySelectorAll('.open-file-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.api.openPathInExplorer(btn.dataset.path);
      });
    });
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  function addToQueue(name, filePath, type) {
    queue.push({ id: idCounter++, name, path: filePath, type, status: 'queued', outputPath: null, error: null });
    renderQueue();
  }

  // Drop zone click
  dropZone.addEventListener('click', async () => {
    const paths = await window.api.openFileDialog([
      { name: 'Supported Files', extensions: ALLOWED_EXTENSIONS },
    ]);
    for (const p of paths) {
      const name = p.split(/[\\/]/).pop();
      const type = getFileType(name);
      if (!type) {
        showError(`Unsupported file type: ${name}`);
        continue;
      }
      addToQueue(name, p, type);
    }
  });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    for (const file of files) {
      const type = getFileType(file.name);
      if (!type) {
        showError(`Unsupported file type: ${file.name}`);
        continue;
      }
      // For drag-drop files, we need the path. dataTransfer gives us .path on Electron.
      const filePath = file.path;
      if (!filePath) {
        showError(`Cannot determine file path for: ${file.name}`);
        continue;
      }
      addToQueue(file.name, filePath, type);
    }
  });

  // HTML tabs
  container.querySelectorAll('.html-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.html-tab').forEach((t) => t.classList.remove('active'));
      container.querySelectorAll('.html-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // HTML file pick
  document.getElementById('html-file-pick').addEventListener('click', async () => {
    const paths = await window.api.openFileDialog([
      { name: 'HTML Files', extensions: ['html', 'htm'] },
    ]);
    if (paths.length > 0) {
      const name = paths[0].split(/[\\/]/).pop();
      addToQueue(name, paths[0], 'html-file');
    }
  });

  // HTML paste convert
  document.getElementById('html-paste-convert').addEventListener('click', async () => {
    const html = document.getElementById('html-paste-area').value.trim();
    if (!html) {
      showError('Please paste HTML content first.');
      return;
    }
    const item = { id: idCounter++, name: 'Pasted HTML', path: null, type: 'html-string', status: 'converting', outputPath: null, error: null, htmlContent: html };
    queue.push(item);
    renderQueue();

    const result = await window.api.convertToPdf({ type: 'html-string', htmlContent: html });
    if (result.success) {
      item.status = 'done';
      item.outputPath = result.outputPath;
    } else {
      item.status = 'failed';
      item.error = result.error;
    }
    renderQueue();
  });

  // Convert all
  document.getElementById('to-pdf-convert-all').addEventListener('click', async () => {
    const pending = queue.filter((i) => i.status === 'queued');
    for (const item of pending) {
      item.status = 'converting';
      renderQueue();

      const job = { type: item.type, inputPath: item.path };
      const result = await window.api.convertToPdf(job);

      if (result.success) {
        item.status = 'done';
        item.outputPath = result.outputPath;
      } else {
        item.status = 'failed';
        item.error = result.error;
      }
      renderQueue();
    }

    // Auto-open folder if setting enabled
    const settings = await window.api.getSettings();
    if (settings.openFolderAfterBatch) {
      const firstDone = queue.find((i) => i.status === 'done');
      if (firstDone && firstDone.outputPath) {
        const dir = firstDone.outputPath.replace(/[\\/][^\\/]+$/, '');
        window.api.openPathInExplorer(dir);
      }
    }
  });

  // Clear queue
  document.getElementById('to-pdf-clear').addEventListener('click', () => {
    queue = [];
    renderQueue();
  });

  // Open output folder
  document.getElementById('to-pdf-open-folder').addEventListener('click', async () => {
    const settings = await window.api.getSettings();
    window.api.openPathInExplorer(settings.outputFolder);
  });
}
