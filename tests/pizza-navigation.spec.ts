import { test, expect } from '@playwright/test';

test('debug pizza-toppings navigation and hydration', async ({ page }) => {
  // Collect console messages
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.error('Browser ERROR:', text);
    } else {
      consoleLogs.push(text);
      console.log(`Browser ${msg.type().toUpperCase()}:`, text);
    }
  });

  // Catch any uncaught errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
    consoleErrors.push(error.message);
  });

  // Track failed network requests
  page.on('requestfailed', request => {
    const failure = `${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
    failedRequests.push(failure);
    console.error('Request failed:', failure);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      const msg = `${response.status()} ${response.url()}`;
      console.error('HTTP Error:', msg);
    }
  });

  // Start at home page
  console.log('1. Navigating to home page...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of home page
  await page.screenshot({ path: 'tests/screenshots/1-home.png' });
  
  // Check if app is hydrated
  const appElement = await page.$('#app');
  const homeHTML = await appElement?.innerHTML();
  console.log('Home page app element exists:', !!appElement);
  console.log('Home page has content:', homeHTML?.length > 100);

  // Click on Pizza menu item
  console.log('\n2. Clicking on Pizza menu item...');
  await page.click('#menu-item-pizza');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Give time for any async operations
  
  // Take screenshot of pizza menu
  await page.screenshot({ path: 'tests/screenshots/2-pizza-menu.png' });
  
  // Check URL changed
  const pizzaMenuUrl = page.url();
  console.log('Pizza menu URL:', pizzaMenuUrl);
  expect(pizzaMenuUrl).toContain('/pizza-menu');

  // Check if pizza menu is rendered
  const pizzaMenuContent = await page.$('.menu-content-container');
  console.log('Pizza menu container exists:', !!pizzaMenuContent);

  // Click on Margherita pizza (which should navigate to pizza-toppings)
  console.log('\n3. Clicking on Margherita pizza...');
  const margheritaExists = await page.$('#menu-item-margherita');
  console.log('Margherita menu item exists:', !!margheritaExists);
  
  if (margheritaExists) {
    await page.click('#menu-item-margherita');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  } else {
    console.error('Margherita menu item not found!');
    // Try to find any pizza item
    const firstPizza = await page.$('.menu-item');
    if (firstPizza) {
      console.log('Clicking first pizza item instead...');
      await firstPizza.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
  }
  
  // Take screenshot of pizza-toppings
  await page.screenshot({ path: 'tests/screenshots/3-pizza-toppings.png' });
  
  // Check URL changed to pizza-toppings
  const toppingsUrl = page.url();
  console.log('Pizza toppings URL:', toppingsUrl);
  expect(toppingsUrl).toContain('/pizza-toppings');

  // Check if page is interactive
  console.log('\n4. Checking if pizza-toppings page is interactive...');
  
  // Try to find variant selector
  const variantButtons = await page.$$('.variant-button');
  console.log('Variant buttons found:', variantButtons.length);

  // Try to find menu items
  const menuItems = await page.$$('.menu-item');
  console.log('Menu items found:', menuItems.length);

  // Try clicking a topping
  if (menuItems.length > 0) {
    console.log('Attempting to click first menu item...');
    
    // Get item details before click
    const firstItemId = await menuItems[0].getAttribute('id');
    const firstItemSelected = await menuItems[0].getAttribute('data-selected');
    console.log(`First item: ${firstItemId}, selected: ${firstItemSelected}`);
    
    await menuItems[0].click();
    await page.waitForTimeout(500);
    
    // Check if item selection changed
    const selectedItems = await page.$$('[data-selected="true"]');
    console.log('Selected items after click:', selectedItems.length);
    
    // Check the specific item we clicked
    const firstItemNewSelected = await menuItems[0].getAttribute('data-selected');
    console.log(`First item after click, selected: ${firstItemNewSelected}`);
    
    // Check all selected item IDs
    for (const item of selectedItems) {
      const id = await item.getAttribute('id');
      console.log(`  Selected: ${id}`);
    }
  }

  // Check for any event handlers attached
  const hasClickHandlers = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-click-event]');
    return elements.length;
  });
  console.log('Elements with data-click-event:', hasClickHandlers);

  // Check if bottom bar is updated
  const bottomBarValues = await page.$$('.app-bottom-bar-info-value');
  console.log('Bottom bar values found:', bottomBarValues.length);
  for (let i = 0; i < bottomBarValues.length; i++) {
    const text = await bottomBarValues[i].textContent();
    console.log(`  Bottom bar value ${i}: ${text}`);
  }
  
  // Check bottom bar button
  const bottomBarButton = await page.$('[data-bottom-bar-button]');
  const buttonText = await bottomBarButton?.textContent();
  console.log('Bottom bar button text:', buttonText?.trim());

  // Log any console errors
  if (consoleErrors.length > 0) {
    console.error('\n=== CONSOLE ERRORS ===');
    consoleErrors.forEach(err => console.error(err));
  }

  if (failedRequests.length > 0) {
    console.error('\n=== FAILED REQUESTS ===');
    failedRequests.forEach(req => console.error(req));
  }

  // Final assertions - commenting out for now to see full output
  // expect(consoleErrors).toHaveLength(0);
});