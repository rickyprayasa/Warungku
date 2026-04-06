const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  console.log('Navigating to http://localhost:3000/warungku...');
  await page.goto('http://localhost:3000/warungku', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // give it time to fetch
  await browser.close();
})();
