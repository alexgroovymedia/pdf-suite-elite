import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let currentScale = 1.5;
let fitMode = null; // null, 'width', 'page'

const MIN_SCALE = 0.25;
const MAX_SCALE = 5.0;

export function initReader() {
  const container = document.getElementById('view-reader');
  container.innerHTML = `
    <h2 class="view-title">PDF Reader</h2>
    <div class="error-banner" id="reader-error"></div>
    <div class="reader-toolbar">
      <button class="btn btn-primary btn-sm" id="reader-open">Open PDF</button>
      <div style="width:1px;height:24px;background:var(--border);margin:0 4px"></div>
      <button class="btn btn-secondary btn-sm" id="reader-prev" disabled>Prev</button>
      <span class="page-info" id="reader-page-info">No file</span>
      <button class="btn btn-secondary btn-sm" id="reader-next" disabled>Next</button>
      <div style="width:1px;height:24px;background:var(--border);margin:0 4px"></div>
      <button class="btn btn-secondary btn-sm" id="reader-zoom-out">Zoom −</button>
      <button class="btn btn-secondary btn-sm" id="reader-zoom-in">Zoom +</button>
      <button class="btn btn-secondary btn-sm" id="reader-fit-width">Fit Width</button>
      <button class="btn btn-secondary btn-sm" id="reader-fit-page">Fit Page</button>
    </div>
    <div class="reader-canvas-wrapper" id="reader-canvas-wrapper">
      <canvas id="reader-canvas"></canvas>
    </div>
    <div class="recent-files" id="reader-recent">
      <h3>Recent Files</h3>
      <ul class="recent-files-list" id="recent-list"></ul>
      <button class="btn btn-sm btn-secondary" id="clear-recent" style="margin-top:8px;display:none">Clear Recent</button>
    </div>
  `;

  const canvas = document.getElementById('reader-canvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('reader-canvas-wrapper');
  const pageInfo = document.getElementById('reader-page-info');
  const errorBanner = document.getElementById('reader-error');

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.add('visible');
    setTimeout(() => errorBanner.classList.remove('visible'), 6000);
  }

  async function renderPage(num) {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: currentScale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      pageInfo.textContent = `Page ${num} / ${totalPages}`;
    } catch (err) {
      showError(`Failed to render page ${num}: ${err.message}`);
    }
  }

  function updateButtons() {
    document.getElementById('reader-prev').disabled = !pdfDoc || currentPage <= 1;
    document.getElementById('reader-next').disabled = !pdfDoc || currentPage >= totalPages;
  }

  async function loadPdf(arrayBuffer) {
    try {
      const typedArray = new Uint8Array(arrayBuffer);
      pdfDoc = await pdfjsLib.getDocument({ data: typedArray }).promise;
      totalPages = pdfDoc.numPages;
      currentPage = 1;
      fitMode = null;
      await renderPage(currentPage);
      updateButtons();
    } catch (err) {
      showError(`Failed to open PDF: ${err.message}. The file may be corrupted or not a valid PDF.`);
      pdfDoc = null;
      totalPages = 0;
      currentPage = 1;
      pageInfo.textContent = 'No file';
      updateButtons();
    }
  }

  async function openFromPath(filePath) {
    try {
      const bytes = await window.api.readFileBytes(filePath);
      await loadPdf(bytes);
      addToRecent(filePath);
    } catch (err) {
      showError(`Could not read file: ${err.message}`);
    }
  }

  // Open button
  document.getElementById('reader-open').addEventListener('click', async () => {
    const paths = await window.api.openFileDialog([
      { name: 'PDF Files', extensions: ['pdf'] },
    ]);
    if (paths.length > 0) {
      await openFromPath(paths[0]);
    }
  });

  // Prev / Next
  document.getElementById('reader-prev').addEventListener('click', async () => {
    if (currentPage > 1) {
      currentPage--;
      await renderPage(currentPage);
      updateButtons();
    }
  });

  document.getElementById('reader-next').addEventListener('click', async () => {
    if (currentPage < totalPages) {
      currentPage++;
      await renderPage(currentPage);
      updateButtons();
    }
  });

  // Zoom
  document.getElementById('reader-zoom-out').addEventListener('click', async () => {
    fitMode = null;
    currentScale = Math.max(MIN_SCALE, currentScale - 0.25);
    await renderPage(currentPage);
  });

  document.getElementById('reader-zoom-in').addEventListener('click', async () => {
    fitMode = null;
    currentScale = Math.min(MAX_SCALE, currentScale + 0.25);
    await renderPage(currentPage);
  });

  document.getElementById('reader-fit-width').addEventListener('click', async () => {
    if (!pdfDoc) return;
    fitMode = 'width';
    const page = await pdfDoc.getPage(currentPage);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const wrapperWidth = wrapper.clientWidth - 40;
    currentScale = wrapperWidth / unscaledViewport.width;
    await renderPage(currentPage);
  });

  document.getElementById('reader-fit-page').addEventListener('click', async () => {
    if (!pdfDoc) return;
    fitMode = 'page';
    const page = await pdfDoc.getPage(currentPage);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const wrapperWidth = wrapper.clientWidth - 40;
    const wrapperHeight = wrapper.clientHeight - 20;
    const scaleW = wrapperWidth / unscaledViewport.width;
    const scaleH = wrapperHeight / unscaledViewport.height;
    currentScale = Math.min(scaleW, scaleH);
    await renderPage(currentPage);
  });

  // Drag & drop
  wrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    wrapper.style.outline = '2px dashed var(--accent)';
  });

  wrapper.addEventListener('dragleave', () => {
    wrapper.style.outline = '';
  });

  wrapper.addEventListener('drop', async (e) => {
    e.preventDefault();
    wrapper.style.outline = '';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showError('Only PDF files can be opened in the reader.');
        return;
      }
      const arrayBuffer = await file.arrayBuffer();
      await loadPdf(arrayBuffer);
      // For drag-drop we don't have the real path, but still works for viewing
    }
  });

  // Recent files
  async function loadRecent() {
    const settings = await window.api.getSettings();
    const list = document.getElementById('recent-list');
    const clearBtn = document.getElementById('clear-recent');
    list.innerHTML = '';
    if (!settings.recentFiles || settings.recentFiles.length === 0) {
      list.innerHTML = '<li style="color:var(--text-secondary);cursor:default">No recent files</li>';
      clearBtn.style.display = 'none';
      return;
    }
    clearBtn.style.display = '';
    settings.recentFiles.forEach((fp) => {
      const li = document.createElement('li');
      li.textContent = fp;
      li.addEventListener('click', () => openFromPath(fp));
      list.appendChild(li);
    });
  }

  async function addToRecent(filePath) {
    const settings = await window.api.getSettings();
    let recents = settings.recentFiles || [];
    recents = recents.filter((f) => f !== filePath);
    recents.unshift(filePath);
    recents = recents.slice(0, 10);
    await window.api.setSettings({ recentFiles: recents });
    loadRecent();
  }

  document.getElementById('clear-recent').addEventListener('click', async () => {
    await window.api.setSettings({ recentFiles: [] });
    loadRecent();
  });

  loadRecent();
}
