import { appName, tagline } from '../brand.js';

export function initAbout() {
  const container = document.getElementById('view-about');
  container.innerHTML = `
    <h2 class="view-title">About / Licenses</h2>

    <div class="about-section">
      <h3>${appName}</h3>
      <p>${tagline}</p>
      <p style="margin-top:8px">Version: <strong id="about-version">loading...</strong></p>
    </div>

    <div class="about-section">
      <h3>Third-Party Licenses</h3>
      <p>This application uses the following open-source software:</p>
      <div class="notices-box" id="about-notices">Loading notices...</div>
    </div>
  `;

  async function load() {
    try {
      const version = await window.api.getAppVersion();
      document.getElementById('about-version').textContent = version;
    } catch {
      document.getElementById('about-version').textContent = 'unknown';
    }

    try {
      const text = await window.api.getThirdPartyNoticesText();
      document.getElementById('about-notices').textContent = text;
    } catch {
      document.getElementById('about-notices').textContent = 'Could not load third-party notices.';
    }
  }

  load();
}
