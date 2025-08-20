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
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of home page
  await page.screenshot({ path: 'tests/screenshots/1-home.png' });
  
  // Check if app is hydrated
  const appElement = await page.$('#app');
  const homeHTML = await appElement?.innerHTML();

  // Click on Pizza menu item
  await page.click('#menu-item-pizza');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Give time for any async operations
  
  // Take screenshot of pizza menu
  await page.screenshot({ path: 'tests/screenshots/2-pizza-menu.png' });
  
  // Check URL changed
  const pizzaMenuUrl = page.url();
  expect(pizzaMenuUrl).toContain('/pizza-menu');

  // Check if pizza menu is rendered
  const pizzaMenuContent = await page.$('.menu-content-container');

  // Click on Margherita pizza (which should navigate to pizza-toppings)
  const margheritaExists = await page.$('#menu-item-margherita');
  
  if (margheritaExists) {
    await page.click('#menu-item-margherita');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  } else {
    console.error('Margherita menu item not found!');
    // Try to find any pizza item
    const firstPizza = await page.$('.menu-item');
    if (firstPizza) {
      await firstPizza.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
  }
  
  // Take screenshot of pizza-toppings
  await page.screenshot({ path: 'tests/screenshots/3-pizza-toppings.png' });
  
  // Check URL changed to pizza-toppings
  const toppingsUrl = page.url();
  expect(toppingsUrl).toContain('/pizza-toppings');

  // Check if page is interactive
  
  // Try to find variant selector
  const variantButtons = await page.$$('.variant-button');

  // Try to find menu items
  const menuItems = await page.$$('.menu-item');

  // Try clicking a topping
  if (menuItems.length > 0) {
    
    // Get item details before click
    const firstItemId = await menuItems[0].getAttribute('id');
    const firstItemSelected = await menuItems[0].getAttribute('data-selected');
    
    await menuItems[0].click();
    await page.waitForTimeout(500);
    
    // Check if item selection changed
    const selectedItems = await page.$$('[data-selected="true"]');
    
    // Check the specific item we clicked
    const firstItemNewSelected = await menuItems[0].getAttribute('data-selected');
    
    // Check all selected item IDs
    for (const item of selectedItems) {
      const id = await item.getAttribute('id');
    }
  }

  // Check for any event handlers attached
  const hasClickHandlers = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-click-event]');
    return elements.length;
  });

  // Check if bottom bar is updated
  const bottomBarValues = await page.$$('.app-bottom-bar-info-value');
  for (let i = 0; i < bottomBarValues.length; i++) {
    const text = await bottomBarValues[i].textContent();
  }
  
  // Check bottom bar button
  const bottomBarButton = await page.$('[data-bottom-bar-button]');
  const buttonText = await bottomBarButton?.textContent();

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