import * as pdfjsLib from 'pdfjs-dist';

export function initConvertFromPdf() {
  const container = document.getElementById('view-convert-from-pdf');
  container.innerHTML = `
    <h2 class="view-title">Convert from PDF</h2>
    <div class="error-banner" id="from-pdf-error"></div>

    <div class="drop-zone" id="from-pdf-drop">
      <div class="drop-icon">+</div>
      <p>Drop a PDF file here or click to select</p>
    </div>

    <div id="from-pdf-file-info" style="margin-top:12px;display:none">
      <strong id="from-pdf-filename"></strong>
      <span id="from-pdf-pages" style="color:var(--text-secondary);margin-left:8px"></span>
    </div>

    <div class="output-options" id="from-pdf-options" style="display:none">
      <div class="output-option selected" data-format="docx">Word (.docx)</div>
      <div class="output-option" data-format="png">Images (.png)</div>
    </div>

    <div class="png-options" id="png-options-panel" style="display:none">
      <label>Pages:
        <select id="png-page-mode">
          <option value="all">All pages</option>
          <option value="range">Page range</option>
        </select>
      </label>
      <label id="png-range-label" style="display:none">Range (e.g. 1-5):
        <input type="text" id="png-range-input" placeholder="1-5" style="width:80px" />
      </label>
      <label>Scale:
        <select id="png-scale">
          <option value="1.0">1.0x</option>
          <option value="1.5" selected>1.5x</option>
          <option value="2.0">2.0x</option>
          <option value="3.0">3.0x</option>
        </select>
      </label>
    </div>

    <div style="margin-top:12px" id="from-pdf-convert-section" style="display:none">
      <button class="btn btn-primary" id="from-pdf-convert" style="display:none">Convert</button>
    </div>

    <div class="queue-list" id="from-pdf-queue"></div>

    <div class="queue-actions" id="from-pdf-done-actions" style="display:none">
      <button class="btn btn-primary" id="from-pdf-open-folder">Open Output Folder</button>
    </div>
  `;

  const errorBanner = document.getElementById('from-pdf-error');
  const dropZone = document.getElementById('from-pdf-drop');
  const fileInfoEl = document.getElementById('from-pdf-file-info');
  const filenameEl = document.getElementById('from-pdf-filename');
  const pagesEl = document.getElementById('from-pdf-pages');
  const optionsEl = document.getElementById('from-pdf-options');
  const pngOptionsPanel = document.getElementById('png-options-panel');
  const convertBtn = document.getElementById('from-pdf-convert');
  const queueEl = document.getElementById('from-pdf-queue');
  const doneActionsEl = document.getElementById('from-pdf-done-actions');

  let selectedFile = null; // { path, name, totalPages }
  let selectedFormat = 'docx';

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.add('visible');
    setTimeout(() => errorBanner.classList.remove('visible'), 6000);
  }

  async function selectPdf(filePath) {
    try {
      const bytes = await window.api.readFileBytes(filePath);
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
      const name = filePath.split(/[\\/]/).pop();
      selectedFile = { path: filePath, name, totalPages: pdf.numPages };
      filenameEl.textContent = name;
      pagesEl.textContent = `(${pdf.numPages} pages)`;
      fileInfoEl.style.display = '';
      optionsEl.style.display = 'flex';
      convertBtn.style.display = '';
      updateFormatUI();
    } catch (err) {
      showError(`Failed to open PDF: ${err.message}`);
    }
  }

  function updateFormatUI() {
    pngOptionsPanel.style.display = selectedFormat === 'png' ? '' : 'none';
    optionsEl.querySelectorAll('.output-option').forEach((el) => {
      el.classList.toggle('selected', el.dataset.format === selectedFormat);
    });
  }

  // Drop zone click
  dropZone.addEventListener('click', async () => {
    const paths = await window.api.openFileDialog([
      { name: 'PDF Files', extensions: ['pdf'] },
    ]);
    if (paths.length > 0) {
      await selectPdf(paths[0]);
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
    if (files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showError('Please select a PDF file.');
        return;
      }
      if (file.path) {
        await selectPdf(file.path);
      } else {
        showError('Could not determine file path.');
      }
    }
  });

  // Format selection
  optionsEl.querySelectorAll('.output-option').forEach((el) => {
    el.addEventListener('click', () => {
      selectedFormat = el.dataset.format;
      updateFormatUI();
    });
  });

  // PNG page mode toggle
  document.getElementById('png-page-mode').addEventListener('change', (e) => {
    document.getElementById('png-range-label').style.display = e.target.value === 'range' ? '' : 'none';
  });

  // Convert button
  convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    if (selectedFormat === 'docx') {
      await convertToDocx();
    } else {
      await convertToPng();
    }
  });

  async function convertToDocx() {
    queueEl.innerHTML = '';
    doneActionsEl.style.display = 'none';

    const item = createQueueItem(selectedFile.name, 'converting');
    queueEl.appendChild(item.el);

    const result = await window.api.convertFromPdf({ type: 'docx', inputPath: selectedFile.path });
    if (result.success) {
      updateQueueItem(item, 'done', result.outputPath);
    } else {
      updateQueueItem(item, 'failed', null, result.error);
    }

    doneActionsEl.style.display = 'flex';
    autoOpenFolder();
  }

  async function convertToPng() {
    queueEl.innerHTML = '';
    doneActionsEl.style.display = 'none';

    const scale = parseFloat(document.getElementById('png-scale').value) || 1.5;
    const pageMode = document.getElementById('png-page-mode').value;

    let startPage = 1;
    let endPage = selectedFile.totalPages;

    if (pageMode === 'range') {
      const rangeStr = document.getElementById('png-range-input').value.trim();
      const match = rangeStr.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!match) {
        showError('Invalid page range. Use format like "1-5".');
        return;
      }
      startPage = parseInt(match[1], 10);
      endPage = parseInt(match[2], 10);
      if (startPage < 1 || endPage > selectedFile.totalPages || startPage > endPage) {
        showError(`Page range must be between 1 and ${selectedFile.totalPages}.`);
        return;
      }
    }

    // Get output dir from main
    const dirResult = await window.api.convertFromPdf({ type: 'png' });
    if (!dirResult.success) {
      showError(dirResult.error || 'Failed to determine output directory.');
      return;
    }

    // Load PDF in renderer for canvas rendering
    const bytes = await window.api.readFileBytes(selectedFile.path);
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;

    const baseName = selectedFile.name.replace(/\.pdf$/i, '');

    for (let i = startPage; i <= endPage; i++) {
      const itemName = `${baseName}_page_${i}.png`;
      const item = createQueueItem(itemName, 'converting');
      queueEl.appendChild(item.el);

      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const offCanvas = document.createElement('canvas');
        offCanvas.width = viewport.width;
        offCanvas.height = viewport.height;
        const offCtx = offCanvas.getContext('2d');

        await page.render({ canvasContext: offCtx, viewport }).promise;

        // Get PNG bytes
        const blob = await new Promise((resolve) => offCanvas.toBlob(resolve, 'image/png'));
        const arrayBuffer = await blob.arrayBuffer();

        const savedPath = await window.api.savePngBytes(itemName, arrayBuffer);
        updateQueueItem(item, 'done', savedPath);
      } catch (err) {
        updateQueueItem(item, 'failed', null, err.message);
      }
    }

    doneActionsEl.style.display = 'flex';
    autoOpenFolder();
  }

  function createQueueItem(name, status) {
    const el = document.createElement('div');
    el.className = 'queue-item';
    el.innerHTML = `
      <span class="filename">${name}</span>
      <span class="status status-${status}">${status}</span>
    `;
    return { el, name };
  }

  function updateQueueItem(item, status, outputPath, error) {
    const statusEl = item.el.querySelector('.status');
    statusEl.className = `status status-${status}`;
    statusEl.textContent = status;
    if (status === 'done' && outputPath) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-secondary open-file-btn';
      btn.textContent = 'Open';
      btn.addEventListener('click', () => window.api.openPathInExplorer(outputPath));
      item.el.appendChild(btn);
    }
    if (status === 'failed' && error) {
      const span = document.createElement('span');
      span.style.cssText = 'font-size:11px;color:var(--error);margin-left:8px';
      span.textContent = error.length > 40 ? error.slice(0, 40) + '...' : error;
      span.title = error;
      item.el.appendChild(span);
    }
  }

  async function autoOpenFolder() {
    const settings = await window.api.getSettings();
    if (settings.openFolderAfterBatch) {
      window.api.openPathInExplorer(settings.outputFolder);
    }
  }

  // Open output folder
  document.getElementById('from-pdf-open-folder').addEventListener('click', async () => {
    const settings = await window.api.getSettings();
    window.api.openPathInExplorer(settings.outputFolder);
  });
}
