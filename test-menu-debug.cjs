const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const page = await browser.newPage();

  // Listen to console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[menu-content]') || 
        text.includes('[DataCellRenderer]') || 
        text.includes('[processLayoutCells]')) {
      console.log('CONSOLE:', msg.type(), '-', text);
      // Log arguments if any
      for (let i = 0; i < msg.args().length; i++) {
        msg.args()[i].jsonValue().then(val => {
          if (typeof val === 'object') {
            console.log('  ARG', i, ':', JSON.stringify(val, null, 2));
          }
        }).catch(() => {});
      }
    }
  });

  // Navigate to the menu page
  console.log('Navigating to menu page...');
  await page.goto('http://localhost:5173/espresso-menu.html');
  
  // Wait for the menu content to render
  await page.waitForSelector('.menu-content', { timeout: 5000 }).catch(() => {
    console.log('Menu content not found');
  });

  // Check what's actually rendered
  const menuContent = await page.$('.menu-content');
  if (menuContent) {
    const innerHTML = await menuContent.innerHTML();
    console.log('\nRendered menu-content HTML:');
    console.log(innerHTML.substring(0, 500));
    
    // Check for menu items
    const itemCount = await page.$$eval('.menu-item', items => items.length);
    console.log('\nFound', itemCount, 'menu items');
    
    // Check for groups
    const groupCount = await page.$$eval('.menu-group', groups => groups.length);
    console.log('Found', groupCount, 'menu groups');
  }

  // Get the page data from window
  const pageData = await page.evaluate(() => {
    return window.__PAGE_DATA__;
  });
  
  if (pageData) {
    console.log('\nPage data found:');
    console.log('Menu ID:', pageData.data?.id);
    console.log('Items count:', Object.keys(pageData.data?.items || {}).length);
    console.log('ItemGroups count:', Object.keys(pageData.data?.itemGroups || {}).length);
    console.log('Layout type:', typeof pageData.data?.layout);
    
    // Log first few items
    const items = Object.entries(pageData.data?.items || {}).slice(0, 2);
    console.log('\nFirst 2 items:', items);
  }

  // Keep browser open for inspection
  console.log('\nPress Ctrl+C to close browser...');
  await new Promise(() => {});
})();