import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:3000/';
const OUT = '/Users/shauryasaxena/Desktop/workflow-engine/.screenshots';

const views = [
  { name: 'desktop-1648x928', width: 1648, height: 928 },
  { name: 'tablet-1024x1366', width: 1024, height: 1366 },
  { name: 'mobile-390x844',   width: 390,  height: 844  },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
  ],
});

// Each viewport gets its OWN page so React mounts fresh at that width.
for (const v of views) {
  const page = await browser.newPage();

  // Set viewport BEFORE navigation so React's useState initializer sees correct width.
  await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: 1 });

  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('pst_ad_165_demo_mode', 'true');
      localStorage.removeItem('pst_ad_165_tracked_instances');
    } catch (e) {}
  });

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('.dashboard-main', { timeout: 15000 });
  // Wait for canvas frame + fonts
  await new Promise(r => setTimeout(r, 1800));

  const path = `${OUT}/${v.name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log('saved', path);
  await page.close();
}

// Full-page desktop
const desktopPage = await browser.newPage();
await desktopPage.setViewport({ width: 1648, height: 928, deviceScaleFactor: 1 });
await desktopPage.evaluateOnNewDocument(() => {
  localStorage.setItem('pst_ad_165_demo_mode', 'true');
});
await desktopPage.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await desktopPage.waitForSelector('.dashboard-main', { timeout: 15000 });
await new Promise(r => setTimeout(r, 1800));
await desktopPage.screenshot({ path: `${OUT}/desktop-fullpage.png`, fullPage: true });
console.log('saved fullpage');
await desktopPage.close();

await browser.close();
console.log('done');
