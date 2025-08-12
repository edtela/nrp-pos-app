import { test, expect } from '@playwright/test';

test.describe('Navigation with Included Items', () => {
  test('should show included items correctly when navigating from pizza menu', async ({ page }) => {
    // Start at home
    await page.goto('http://localhost:4175/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Pizza menu
    await page.click('[data-id="pizza"]');
    await page.waitForURL('**/pizza-menu');
    
    // Click on a pizza that has included toppings (e.g., Margherita)
    const margherita = page.locator('[data-id="margherita"]');
    if (await margherita.count() > 0) {
      await margherita.click();
      await page.waitForURL('**/pizza-toppings');
      
      // Check if there are any included items
      const includedSection = page.locator('[data-included="true"]').first();
      if (await includedSection.count() > 0) {
        console.log('Found included section');
        
        // Check if included items are displayed correctly
        const includedItems = page.locator('.menu-item[data-included="true"]');
        const count = await includedItems.count();
        console.log(`Found ${count} included items`);
        
        if (count > 0) {
          // Check the first included item
          const firstIncluded = includedItems.first();
          const control = firstIncluded.locator('.menu-item-control');
          const icon = firstIncluded.locator('.menu-item-icon');
          
          // For included checkboxes that are not selected, should show red minus
          const isSelected = await firstIncluded.getAttribute('data-selected');
          const controlType = await firstIncluded.getAttribute('data-control-type');
          
          console.log(`First included item - type: ${controlType}, selected: ${isSelected}`);
          
          if (controlType === 'check' && isSelected !== 'true') {
            await expect(control).toBeVisible();
            await expect(icon).toBeHidden();
            
            // Verify red minus icon
            const pseudoStyles = await control.evaluate(el => {
              const after = window.getComputedStyle(el, '::after');
              return {
                content: after.content,
                color: after.color
              };
            });
            
            console.log('Included checkbox pseudo-styles:', pseudoStyles);
            expect(pseudoStyles.content).toBe('"remove"');
            expect(pseudoStyles.color).toContain('179'); // Error color
          }
        }
      }
    } else {
      // If no Margherita, try any pizza
      const firstPizza = page.locator('.menu-item').first();
      await firstPizza.click();
      await page.waitForURL('**/pizza-toppings');
    }
    
    // Take a screenshot of the final state
    await page.screenshot({ path: 'tests/screenshots/navigation-included-state.png', fullPage: true });
  });
  
  test('manual test - set pepperoni as included and verify display', async ({ page }) => {
    await page.goto('http://localhost:4175/pizza-toppings');
    await page.waitForLoadState('networkidle');
    
    // Manually set pepperoni as included
    const pepperoni = page.locator('[data-id="pepperoni"]');
    
    // Initial state - should show icon
    let control = pepperoni.locator('.menu-item-control');
    let icon = pepperoni.locator('.menu-item-icon');
    
    await expect(icon).toBeVisible();
    await expect(control).toBeHidden();
    
    // Set as included
    await pepperoni.evaluate(el => {
      el.setAttribute('data-included', 'true');
    });
    
    // Should now show control with red minus, hide icon
    await expect(control).toBeVisible();
    await expect(icon).toBeHidden();
    
    // Verify the minus icon
    const pseudoStyles = await control.evaluate(el => {
      const after = window.getComputedStyle(el, '::after');
      const computed = window.getComputedStyle(el);
      return {
        content: after.content,
        color: after.color,
        display: computed.display,
        controlDisplay: after.display
      };
    });
    
    console.log('After setting included:', pseudoStyles);
    expect(pseudoStyles.content).toBe('"remove"');
    expect(pseudoStyles.color).toContain('179');
    
    // Click to select it - should now show checkmark
    await pepperoni.click();
    
    const selectedStyles = await control.evaluate(el => {
      const after = window.getComputedStyle(el, '::after');
      return {
        content: after.content,
        color: after.color
      };
    });
    
    console.log('After selecting:', selectedStyles);
    expect(selectedStyles.content).toBe('"check"');
    expect(selectedStyles.color).toContain('27'); // Primary color
  });
});