const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

/**
 * Convert a JPG or PNG image to a single-page PDF.
 * @param {string} imagePath – absolute path to image file
 * @param {string} outputPath – absolute path for the output PDF
 */
async function imagesToPdf(imagePath, outputPath) {
  const ext = path.extname(imagePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    throw new Error(`Unsupported image format: ${ext}. Only JPG and PNG are supported.`);
  }

  const imageBytes = fs.readFileSync(imagePath);
  const pdfDoc = await PDFDocument.create();

  let image;
  if (ext === '.png') {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    image = await pdfDoc.embedJpg(imageBytes);
  }

  const { width, height } = image.scale(1);
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

module.exports = { imagesToPdf };
