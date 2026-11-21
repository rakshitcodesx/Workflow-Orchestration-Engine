import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('pst_ad_165_demo_mode', 'true');
});
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.dashboard-header');
await new Promise(r => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  const header = document.querySelector('.dashboard-header');
  const titleEl = header.querySelector('span[style*="fontWeight: 800"], span[style*="font-weight: 800"]');
  const badgeEl = header.querySelectorAll('span')[1]; // PST_AD_165 badge
  
  // Get all spans in the header left section
  const leftDiv = header.firstElementChild;
  const allSpans = leftDiv ? Array.from(leftDiv.querySelectorAll('span')).map(s => ({
    text: s.textContent.trim().substring(0, 40),
    width: s.getBoundingClientRect().width,
    offsetWidth: s.offsetWidth,
    visible: s.getBoundingClientRect().width > 0,
  })) : [];

  const headerRect = header.getBoundingClientRect();
  const leftRect = leftDiv?.getBoundingClientRect();
  const rightDiv = header.lastElementChild;
  const rightRect = rightDiv?.getBoundingClientRect();

  return {
    headerWidth: headerRect.width,
    leftWidth: leftRect?.width,
    rightWidth: rightRect?.width,
    allSpans,
    windowInnerWidth: window.innerWidth,
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
