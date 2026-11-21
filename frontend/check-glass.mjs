import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:3000/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1'],
});

const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('pst_ad_165_demo_mode', 'true');
});
await page.setViewport({ width: 1648, height: 928, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('.glass-panel');
await new Promise(r => setTimeout(r, 2000));

const info = await page.evaluate(() => {
  const panels = document.querySelectorAll('.glass-panel');
  const first = panels[0];
  if (!first) return { error: 'no glass-panel found' };
  const cs = window.getComputedStyle(first);
  const rect = first.getBoundingClientRect();

  // Sample pixel directly in the middle of the first glass panel
  // from the CANVAS (what's behind it)
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const canvasPx = ctx.getImageData(cx|0, cy|0, 1, 1).data;

  return {
    panel_count: panels.length,
    first_panel_bg: cs.backgroundColor,
    first_panel_backdrop: cs.backdropFilter,
    first_panel_webkitBackdrop: cs.webkitBackdropFilter,
    first_panel_rect: { x: rect.left|0, y: rect.top|0, w: rect.width|0, h: rect.height|0 },
    canvas_pixel_at_panel_centre: Array.from(canvasPx),
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
