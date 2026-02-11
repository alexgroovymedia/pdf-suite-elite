# PDF Suite Elite

An offline-first, all-in-one PDF desktop application for Windows. Read, convert to, and convert from PDF — no internet required.

## Features

- **PDF Reader** — Open and view PDFs with zoom, navigation, fit-width/fit-page, and drag-and-drop support.
- **Convert to PDF** — DOCX, XLSX, PPTX (via bundled LibreOffice), JPG/PNG (via pdf-lib), and HTML (via Chromium printToPDF).
- **Convert from PDF** — PDF → DOCX (via LibreOffice), PDF → PNG images (via PDF.js canvas rendering).
- **Batch processing** with per-item status tracking.
- **Fully offline** — all conversion engines are bundled.

## Development

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm

### Install & Run (dev mode)

```bash
npm install
npm run electron:dev
```

This starts the Vite dev server and launches Electron. Works on macOS and Windows for development, though the app is packaged for Windows only.

### Vite-only (renderer development)

```bash
npm run dev
```

Opens the renderer at `http://localhost:5173` for UI iteration (IPC calls will not work outside Electron).

## Preparing LibreOffice Runtime

The app bundles a portable LibreOffice runtime for Office-format conversions. You must manually populate the `vendor/libreoffice/` directory before building the installer.

### Steps

1. Download **LibreOffice Portable** (or the standard LibreOffice installer for Windows) from [libreoffice.org](https://www.libreoffice.org/download/).
2. Extract/install it so that `soffice.exe` is located at:
   ```
   vendor/libreoffice/program/soffice.exe
   ```
3. The full directory should look like:
   ```
   vendor/
     libreoffice/
       program/
         soffice.exe
         soffice.bin
         ... (other LibreOffice runtime files)
       share/
         ... (optional, but may be needed for filters)
   ```

> **Tip:** You can use [LibreOffice Portable](https://www.libreoffice.org/download/portable-versions/) or extract from the official `.msi` installer using `msiexec /a`.

### Fallback

If the bundled runtime is missing at runtime, the app will attempt to locate a system-wide LibreOffice installation at the standard Windows paths (`C:\Program Files\LibreOffice\program\soffice.exe`).

## Building the Windows Installer

### Locally

```bash
npm run build    # Build Vite renderer
npm run dist     # Build NSIS installer via electron-builder
```

The installer will be output to `dist-electron/`.

### Via GitHub Actions

Push to the `main` branch or trigger the workflow manually. The `build-windows.yml` workflow:

1. Checks out the repo
2. Verifies `vendor/libreoffice/program/` exists
3. Installs dependencies, builds, and packages
4. Uploads the NSIS installer as an artifact

> **Note:** You must commit or otherwise provide the LibreOffice runtime in the repo (or use Git LFS / a download step in CI) for the build to succeed.

## Branding

To rebrand the app, edit **one file**: `src/brand.js`

```js
export const appName = 'Your App Name';
export const accentColor = '#FF5722';
export const accentColorHover = '#E64A19';
export const logoText = 'Y';
export const tagline = 'Your tagline here';
```

Also update:
- `package.json` → `build.productName`, `build.appId`
- `public/icons/` → Replace with your own icons (`.ico` for Windows, `.png` for dev)

## Project Structure

```
├── .github/workflows/build-windows.yml
├── electron/
│   ├── main.js              # Electron main process entry
│   ├── preload.js            # Preload script (contextBridge API)
│   ├── ipc.js                # IPC handler registration
│   ├── converters/
│   │   ├── libreoffice.js    # LibreOffice headless conversion
│   │   ├── imagesToPdf.js    # JPG/PNG → PDF via pdf-lib
│   │   ├── htmlToPdf.js      # HTML → PDF via Chromium printToPDF
│   │   └── pdfToImages.js    # (renderer-driven; placeholder)
│   └── util/
│       ├── paths.js          # soffice path resolution
│       └── settings.js       # User settings persistence
├── src/
│   ├── index.html
│   ├── style.css
│   ├── renderer.js           # Renderer entry point
│   ├── brand.js              # Branding constants
│   └── ui/
│       ├── reader.js
│       ├── convertToPdf.js
│       ├── convertFromPdf.js
│       ├── settings.js
│       └── about.js
├── public/icons/
├── licenses/THIRD_PARTY_NOTICES.txt
├── vendor/libreoffice/       # (not committed; populate manually)
├── package.json
└── vite.config.js
```

## Licensing & Compliance

This application bundles or uses the following third-party components:

| Component    | License          |
|-------------|------------------|
| LibreOffice | MPL 2.0 / LGPL 3 |
| PDF.js      | Apache 2.0       |
| pdf-lib     | MIT              |
| Electron    | MIT              |

See `licenses/THIRD_PARTY_NOTICES.txt` for full notices. The app includes an **About / Licenses** screen that displays these notices to end users.
