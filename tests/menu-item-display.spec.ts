import { test, expect } from '@playwright/test';

test.describe('Menu Item Display Logic', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the pizza toppings page which has various control types
    await page.goto('http://localhost:4175/pizza-toppings');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Radio Button Items', () => {
    test('should never show icon for radio items', async ({ page }) => {
      // Check cheese options (radio buttons)
      const radioItem = page.locator('[data-control-type="radio"]').first();
      const icon = radioItem.locator('.menu-item-icon');
      const control = radioItem.locator('.menu-item-control');
      
      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();
    });

    test('should show red circle for required but unselected radio', async ({ page }) => {
      // Set a radio item as included but not selected
      await page.evaluate(() => {
        const item = document.querySelector('[data-id="regular-mozzarella"]');
        if (item) {
          item.setAttribute('data-included', 'true');
          item.setAttribute('data-selected', 'false');
        }
      });

      const radioControl = page.locator('[data-id="regular-mozzarella"] .menu-item-control');
      
      // Check that the border color is error color (red)
      const borderColor = await radioControl.evaluate(el => {
        const before = window.getComputedStyle(el, '::before');
        return before.borderColor;
      });
      
      // The error color should be applied
      expect(borderColor).toContain('rgb(179, 38, 30)'); // --md-sys-color-error: #B3261E
    });

    test('should show primary color for selected radio', async ({ page }) => {
      // Click a radio item to select it
      await page.click('[data-id="regular-mozzarella"]');
      
      const radioControl = page.locator('[data-id="regular-mozzarella"] .menu-item-control');
      
      // Check that the border color is primary color
      const borderColor = await radioControl.evaluate(el => {
        const before = window.getComputedStyle(el, '::before');
        return before.borderColor;
      });
      
      // The primary color should be applied
      expect(borderColor).toContain('rgb(27, 108, 63)'); // --md-sys-color-primary: #1B6C3F
    });
  });

  test.describe('Checkbox Items', () => {
    test('should show icon and hide control by default', async ({ page }) => {
      // Check meat toppings (checkboxes)
      const checkItem = page.locator('[data-id="pepperoni"]');
      const icon = checkItem.locator('.menu-item-icon');
      const control = checkItem.locator('.menu-item-control');
      
      await expect(icon).toBeVisible();
      await expect(control).toBeHidden();
      
      // Verify icon content
      const iconText = await icon.textContent();
      expect(iconText).toBe('🍕');
    });

    test('should show checkmark and hide icon when selected', async ({ page }) => {
      // Click to select a checkbox item
      await page.click('[data-id="pepperoni"]');
      
      const checkItem = page.locator('[data-id="pepperoni"]');
      const icon = checkItem.locator('.menu-item-icon');
      const control = checkItem.locator('.menu-item-control');
      
      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();
      
      // Verify checkmark is shown
      const checkmark = await control.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return after.content;
      });
      
      expect(checkmark).toBe('"check"');
    });

    test('should show red minus and hide icon when included but not selected', async ({ page }) => {
      // Set a checkbox item as included but not selected
      await page.evaluate(() => {
        const item = document.querySelector('[data-id="pepperoni"]');
        if (item) {
          item.setAttribute('data-included', 'true');
          item.setAttribute('data-selected', 'false');
        }
      });

      const checkItem = page.locator('[data-id="pepperoni"]');
      const icon = checkItem.locator('.menu-item-icon');
      const control = checkItem.locator('.menu-item-control');
      
      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();
      
      // Verify minus icon is shown in red
      const minusIcon = await control.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return {
          content: after.content,
          color: after.color
        };
      });
      
      expect(minusIcon.content).toBe('"remove"');
      expect(minusIcon.color).toContain('rgb(179, 38, 30)'); // Error color
    });
  });

  test.describe('Navigation Items', () => {
    test('should show icon and hide control for nav items', async ({ page }) => {
      // Go to main menu which has nav items
      await page.goto('http://localhost:4175/');
      await page.waitForLoadState('networkidle');
      
      const navItem = page.locator('[data-control-type="nav"]').first();
      const icon = navItem.locator('.menu-item-icon');
      const control = navItem.locator('.menu-item-control');
      
      await expect(icon).toBeVisible();
      await expect(control).toBeHidden();
      
      // Verify icon content
      const iconText = await icon.textContent();
      expect(iconText).toBe('🍕'); // Pizza category icon
    });
  });

  test.describe('State Transitions', () => {
    test('checkbox should transition correctly between states', async ({ page }) => {
      const item = page.locator('[data-id="mushrooms"]');
      const icon = item.locator('.menu-item-icon');
      const control = item.locator('.menu-item-control');
      
      // Initial state: icon visible, control hidden
      await expect(icon).toBeVisible();
      await expect(control).toBeHidden();
      
      // Click to select: icon hidden, control visible with checkmark
      await item.click();
      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();
      
      // Click to deselect: back to initial state
      await item.click();
      await expect(icon).toBeVisible();
      await expect(control).toBeHidden();
      
      // Set as included: icon hidden, control visible with minus
      await page.evaluate(() => {
        const el = document.querySelector('[data-id="mushrooms"]');
        if (el) {
          el.setAttribute('data-included', 'true');
        }
      });
      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();
      
      // Click while included to select: should show checkmark
      await item.click();
      const checkmark = await control.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return after.content;
      });
      expect(checkmark).toBe('"check"');
    });
  });
});