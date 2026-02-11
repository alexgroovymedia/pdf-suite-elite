const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findSofficePath } = require('../util/paths');

/**
 * Convert a file using LibreOffice headless.
 * @param {string} inputPath  – absolute path to input file
 * @param {string} outputDir  – absolute path to output directory
 * @param {string} outputType – desired output format: 'pdf' | 'docx'
 * @returns {Promise<string>}  absolute path to converted file
 */
function convertWithLibreOffice(inputPath, outputDir, outputType) {
  return new Promise((resolve, reject) => {
    const sofficePath = findSofficePath();
    if (!sofficePath) {
      return reject(
        new Error(
          'LibreOffice not found. Please ensure the bundled LibreOffice runtime is present ' +
            'under vendor/libreoffice/ (dev) or that LibreOffice is installed on the system.'
        )
      );
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const convertTo = outputType === 'docx' ? 'docx' : 'pdf';

    const args = [
      '--headless',
      '--nologo',
      '--nofirststartwizard',
      '--nodefault',
      `--convert-to`,
      convertTo,
      '--outdir',
      outputDir,
      inputPath,
    ];

    const proc = spawn(sofficePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start LibreOffice: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(
          new Error(
            `LibreOffice exited with code ${code}.\nstdout: ${stdout}\nstderr: ${stderr}`
          )
        );
      }

      // Determine expected output filename
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const expectedOutput = path.join(outputDir, `${baseName}.${convertTo}`);

      if (fs.existsSync(expectedOutput)) {
        return resolve(expectedOutput);
      }

      // Sometimes LO adds slightly different names; scan directory
      const files = fs.readdirSync(outputDir);
      const match = files.find(
        (f) => f.startsWith(baseName) && f.endsWith(`.${convertTo}`)
      );
      if (match) {
        return resolve(path.join(outputDir, match));
      }

      reject(
        new Error(
          `Conversion appeared to succeed but output file not found.\nExpected: ${expectedOutput}\nstdout: ${stdout}`
        )
      );
    });
  });
}

module.exports = { convertWithLibreOffice };
