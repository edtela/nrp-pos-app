import { test, expect } from '@playwright/test';

test.describe('Included State Visual Test', () => {
  test('checkbox with included state should show red minus', async ({ page }) => {
    // Navigate to pizza toppings
    await page.goto('http://localhost:4175/pizza-toppings');
    await page.waitForLoadState('networkidle');
    
    // Find a checkbox item and set it as included but not selected
    const pepperoniItem = page.locator('[data-id="pepperoni"]');
    
    // Set the included attribute
    await pepperoniItem.evaluate(el => {
      el.setAttribute('data-included', 'true');
      el.setAttribute('data-selected', 'false');
    });
    
    // Check visibility
    const control = pepperoniItem.locator('.menu-item-control');
    const icon = pepperoniItem.locator('.menu-item-icon');
    
    // Control should be visible, icon should be hidden
    await expect(control).toBeVisible();
    await expect(icon).toBeHidden();
    
    // Check the pseudo-element content and color
    const pseudoStyles = await control.evaluate(el => {
      const after = window.getComputedStyle(el, '::after');
      return {
        content: after.content,
        color: after.color,
        display: after.display
      };
    });
    
    console.log('Pseudo-element styles:', pseudoStyles);
    
    // Should show "remove" (minus icon) in error color
    expect(pseudoStyles.content).toBe('"remove"');
    expect(pseudoStyles.color).toContain('179'); // Part of rgb(179, 38, 30) - error color
    
    // Take a screenshot for visual verification
    await pepperoniItem.screenshot({ path: 'tests/screenshots/included-not-selected-checkbox.png' });
  });

  test('radio with included state should show red border', async ({ page }) => {
    // Navigate to pizza toppings
    await page.goto('http://localhost:4175/pizza-toppings');
    await page.waitForLoadState('networkidle');
    
    // Find a radio item and set it as included but not selected
    const mozzarellaItem = page.locator('[data-id="regular-mozzarella"]');
    
    // Set the included attribute
    await mozzarellaItem.evaluate(el => {
      el.setAttribute('data-included', 'true');
      el.setAttribute('data-selected', 'false');
    });
    
    // Check the pseudo-element border color
    const control = mozzarellaItem.locator('.menu-item-control');
    const pseudoStyles = await control.evaluate(el => {
      const before = window.getComputedStyle(el, '::before');
      return {
        borderColor: before.borderColor,
        display: before.display
      };
    });
    
    console.log('Radio pseudo-element styles:', pseudoStyles);
    
    // Should show red border
    expect(pseudoStyles.borderColor).toContain('179'); // Part of rgb(179, 38, 30) - error color
    
    // Take a screenshot for visual verification
    await mozzarellaItem.screenshot({ path: 'tests/screenshots/included-not-selected-radio.png' });
  });

  test('visual comparison of all states', async ({ page }) => {
    // Create a test page with all states
    await page.goto('data:text/html,' + encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
        <link rel="stylesheet" href="http://localhost:4175/assets/index-BSXaKesc.css">
        <style>
          body { padding: 20px; background: white; }
          .test-group { margin: 20px 0; }
          h3 { margin: 10px 0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="test-group">
          <h3>Checkbox - Default</h3>
          <div class="menu-item" data-control-type="check">
            <div class="menu-item-content">
              <span class="menu-item-control"></span>
              <span class="menu-item-icon">🍕</span>
              <span class="menu-item-name">Default (icon visible)</span>
            </div>
          </div>
          
          <h3>Checkbox - Selected</h3>
          <div class="menu-item" data-control-type="check" data-selected="true">
            <div class="menu-item-content">
              <span class="menu-item-control"></span>
              <span class="menu-item-icon">🍕</span>
              <span class="menu-item-name">Selected (checkmark visible)</span>
            </div>
          </div>
          
          <h3>Checkbox - Included Not Selected</h3>
          <div class="menu-item" data-control-type="check" data-included="true">
            <div class="menu-item-content">
              <span class="menu-item-control"></span>
              <span class="menu-item-icon">🍕</span>
              <span class="menu-item-name">Included (red minus visible)</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `));
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/all-checkbox-states.png', fullPage: true });
  });
});