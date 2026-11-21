/**
 * Tests whether backdrop-filter composites against a fixed canvas
 * by injecting a fully transparent panel and screenshotting a pixel
 * that should show the canvas colour if compositing works.
 */
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/shauryasaxena/Desktop/workflow-engine/.screenshots';

// Try two launch configs — with and without GPU flags
for (const [label, args] of [
  ['no-gpu', ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']],
  ['with-gpu', ['--no-sandbox', '--disable-setuid-sandbox',
    '--enable-gpu-rasterization',
    '--enable-accelerated-compositing',
    '--enable-accelerated-2d-canvas',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ]],
]) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args,
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('pst_ad_165_demo_mode', 'true');
  });
  await page.setViewport({ width: 800, height: 400, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.glass-panel');
  await new Promise(r => setTimeout(r, 2000));

  // Inject a 0% opacity background panel to test canvas compositing
  const result = await page.evaluate(() => {
    // Create a transparent test div
    const div = document.createElement('div');
    div.id = 'composite-test';
    div.style.cssText = `
      position: fixed;
      top: 100px; left: 100px;
      width: 200px; height: 200px;
      background: rgba(255,255,255,0.01);
      backdrop-filter: blur(0px);
      z-index: 9999;
    `;
    document.body.appendChild(div);
    return 'injected';
  });

  await page.screenshot({ path: `${OUT}/composite-test-${label}.png` });

  // Sample pixel at the CENTRE of the first .glass-panel from the screenshot
  const pixel = await page.evaluate(() => {
    const panel = document.querySelector('.glass-panel');
    const rect = panel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Create a 1px canvas to read the screen at that position
    // We can't directly read screen pixels from JS, but we can compare
    // what the ACTUAL rendered background color of the glass panel element is
    const cs = window.getComputedStyle(panel);
    return {
      bg: cs.backgroundColor,
      backdrop: cs.backdropFilter,
      pos_x: cx|0,
      pos_y: cy|0,
    };
  });

  console.log(`[${label}]`, JSON.stringify(pixel));
  await browser.close();
}
console.log('Screenshots saved. Check composite-test-no-gpu.png vs composite-test-with-gpu.png');
