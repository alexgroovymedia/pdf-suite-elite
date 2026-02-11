import { appName, accentColor, accentColorHover, logoText } from './brand.js';
import { initReader } from './ui/reader.js';
import { initConvertToPdf } from './ui/convertToPdf.js';
import { initConvertFromPdf } from './ui/convertFromPdf.js';
import { initSettings } from './ui/settings.js';
import { initAbout } from './ui/about.js';

// Apply branding
document.title = appName;
document.documentElement.style.setProperty('--accent', accentColor);
document.documentElement.style.setProperty('--accent-hover', accentColorHover);

// Render sidebar logo
const sidebarLogo = document.getElementById('sidebar-logo');
sidebarLogo.innerHTML = `<div class="logo-icon">${logoText}</div><span>${appName}</span>`;

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

function switchView(viewName) {
  navItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  views.forEach((v) => {
    v.classList.toggle('active', v.id === `view-${viewName}`);
  });
}

navItems.forEach((item) => {
  item.addEventListener('click', () => switchView(item.dataset.view));
});

// Initialize all view modules
initReader();
initConvertToPdf();
initConvertFromPdf();
initSettings();
initAbout();
