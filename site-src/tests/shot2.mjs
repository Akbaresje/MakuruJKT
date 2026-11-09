import { chromium } from 'playwright-core';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errs = [];

// desktop
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => errs.push('desktop: ' + e.message));
await page.goto('file:///home/user/index.html');
await page.waitForTimeout(800);
await page.screenshot({ path: 'shots/10-hero.png' });
// cart flow
await page.click('[data-add="siomay"]');
await page.click('[data-add="hargow"]');
await page.click('#openCart');
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/11-cart.png' });
await page.click('#checkoutBtn');
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/12-checkout.png' });
// fill & submit
await page.fill('input[name="name"]', 'Akbar Satrio');
await page.fill('input[name="phone"]', '0412 555 018');
await page.fill('input[name="email"]', 'akbar@mail.com');
await page.click('[data-co-outlet="syd"]');
await page.click('#coForm button[type="submit"]');
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/13-success.png' });
await page.click('#closeSuccess');
await page.waitForTimeout(300);
// dashboard chart after refresh
await page.evaluate(() => document.querySelector('#openDashBtn').click());
await page.waitForTimeout(700);
await page.screenshot({ path: 'shots/14-dash.png' });
await page.evaluate(() => document.querySelector('.dash-nav button[data-view="batch"]').click());
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/15-batch.png' });
await page.evaluate(() => document.querySelector('.dash-nav button[data-view="outlets"]').click());
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/16-outlets.png' });
await page.evaluate(() => document.querySelector('.dash-nav button[data-view="settings"]').click());
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/17-settings.png' });

// mobile
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', e => errs.push('mobile: ' + e.message));
await m.goto('file:///home/user/index.html');
await m.waitForTimeout(700);
await m.screenshot({ path: 'shots/20-m-hero.png' });
await m.evaluate(() => document.querySelector('#katalog').scrollIntoView());
await m.waitForTimeout(500);
await m.screenshot({ path: 'shots/21-m-menu.png' });
await m.evaluate(() => document.querySelector('#openDashBtn').click());
await m.waitForTimeout(600);
await m.screenshot({ path: 'shots/22-m-dash.png' });
console.log('errors:', errs.length, errs.slice(0,4));
await browser.close();
