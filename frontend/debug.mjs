/**
 * Debug script — checks:
 * 1. Is the canvas element present and sized?
 * 2. What is the computed background-color of body / #root / .app-container?
 * 3. What pixel colour is at canvas centre?
 * 4. Is AquaMeshBackground actually rendering pixels (not all white)?
 * 5. What does the canvas look like in isolation (screenshot just the canvas area)?
 */
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:3000/';
const OUT = '/Users/shauryasaxena/Desktop/workflow-engine/.screenshots';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--enable-gpu-rasterization',
    '--enable-accelerated-2d-canvas',
  ],
});

const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('pst_ad_165_demo_mode', 'true');
  } catch (e) {}
});
await page.setViewport({ width: 1648, height: 928, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.waitForSelector('.dashboard-main', { timeout: 15000 });
await new Promise(r => setTimeout(r, 2500));

const info = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const body = document.body;
  const root = document.getElementById('root');
  const app  = document.querySelector('.app-container');

  const cs = (el) => el ? window.getComputedStyle(el) : null;
  const bodyCs = cs(body);
  const rootCs = cs(root);
  const appCs  = cs(app);

  let canvasInfo = null;
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    const ctx  = canvas.getContext('2d');
    // Sample pixel at centre
    const px = ctx.getImageData(canvas.width/2|0, canvas.height/2|0, 1, 1).data;
    // Sample pixel at top-right accent
    const tr = ctx.getImageData(canvas.width*0.86|0, canvas.height*0.04|0, 1, 1).data;
    canvasInfo = {
      width:  canvas.width,
      height: canvas.height,
      style_position: canvas.style.position,
      style_zIndex:   canvas.style.zIndex,
      rect_top:  rect.top,
      rect_left: rect.left,
      centre_pixel:    Array.from(px),
      top_right_pixel: Array.from(tr),
    };
  }

  return {
    canvas: canvasInfo,
    body_bg:   bodyCs?.backgroundColor,
    root_bg:   rootCs?.backgroundColor,
    app_bg:    appCs?.backgroundColor,
    app_zIndex: appCs?.zIndex,
    body_zIndex: bodyCs?.zIndex,
  };
});

console.log('=== Debug Info ===');
console.log(JSON.stringify(info, null, 2));

// Screenshot with canvas isolated (hide all non-canvas children)
await page.evaluate(() => {
  document.querySelectorAll('.app-container > *:not(canvas)').forEach(el => {
    el.style.visibility = 'hidden';
  });
  document.querySelector('.dashboard-header').style.visibility = 'hidden';
});
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}/canvas-only.png` });
console.log('saved canvas-only.png');

await browser.close();
