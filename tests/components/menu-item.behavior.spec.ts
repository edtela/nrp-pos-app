import { test, expect } from '@playwright/test';

test.describe('Menu Item Component Behavior', () => {
  // Set up the test harness
  test.beforeEach(async ({ page }) => {
    // Use the dev server which serves modules properly
    await page.goto('http://localhost:5174/tests/harness/menu-item.html');
    
    // Wait for the test harness to be ready
    await page.waitForFunction(() => window.menuItemTestReady === true, { timeout: 10000 });
    
    // Load the component CSS
    await page.evaluate(() => {
      // Use the latest built CSS
      const cssPath = 'http://localhost:4175/assets/index-BSXaKesc.css';
      window.menuItemTest.loadStyles(cssPath);
    });
  });

  test.describe('Checkbox Behavior', () => {
    test('shows icon by default, hides control', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { id: 'pepperoni', name: 'Pepperoni', icon: '🍕', price: 1.50 },
          selected: false,
          included: false
        });
      });

      const icon = page.locator('.menu-item-icon');
      const control = page.locator('.menu-item-control');

      await expect(icon).toBeVisible();
      await expect(icon).toHaveText('🍕');
      await expect(control).toBeHidden();
    });

    test('shows checkmark when selected, hides icon', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { id: 'pepperoni', name: 'Pepperoni', icon: '🍕' },
          selected: true
        });
      });

      const icon = page.locator('.menu-item-icon');
      const control = page.locator('.menu-item-control');

      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();

      // Verify checkmark pseudo-element
      const checkmark = await control.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return {
          content: after.content,
          color: after.color
        };
      });

      expect(checkmark.content).toBe('"check"');
      expect(checkmark.color).toContain('27'); // Primary color rgb(27, 108, 63)
    });

    test('shows red minus when included but not selected', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { id: 'pepperoni', name: 'Pepperoni', icon: '🍕' },
          included: true,
          selected: false
        });
      });

      const icon = page.locator('.menu-item-icon');
      const control = page.locator('.menu-item-control');

      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();

      // Verify red minus pseudo-element
      const minus = await control.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return {
          content: after.content,
          color: after.color
        };
      });

      expect(minus.content).toBe('"remove"');
      expect(minus.color).toContain('179'); // Error color rgb(179, 38, 30)
    });

    test('shows checkmark when included and selected', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { id: 'pepperoni', name: 'Pepperoni', icon: '🍕' },
          included: true,
          selected: true
        });
      });

      const control = page.locator('.menu-item-control');
      await expect(control).toBeVisible();

      const checkmark = await control.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return after.content;
      });

      expect(checkmark).toBe('"check"');
    });
  });

  test.describe('Radio Button Behavior', () => {
    test('never shows icon, always shows control', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { 
            id: 'mozzarella', 
            name: 'Mozzarella', 
            icon: '🧀',
            constraints: { choice: { single: true } }
          },
          selected: false
        });
      });

      const icon = page.locator('.menu-item-icon');
      const control = page.locator('.menu-item-control');

      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();
    });

    test('shows normal border when not required', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { 
            id: 'mozzarella', 
            name: 'Mozzarella',
            constraints: { choice: { single: true } }
          },
          selected: false
        });
      });

      const control = page.locator('.menu-item-control');
      const borderColor = await control.evaluate(el => {
        const before = window.getComputedStyle(el, '::before');
        return before.borderColor;
      });

      expect(borderColor).toContain('121'); // Outline color rgb(121, 116, 126)
    });

    test('shows red border when required but not selected', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { 
            id: 'mozzarella', 
            name: 'Mozzarella',
            constraints: { choice: { single: true } }
          },
          included: true,
          selected: false
        });
      });

      const control = page.locator('.menu-item-control');
      const borderColor = await control.evaluate(el => {
        const before = window.getComputedStyle(el, '::before');
        return before.borderColor;
      });

      expect(borderColor).toContain('179'); // Error color
    });

    test('shows filled circle when selected', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { 
            id: 'mozzarella', 
            name: 'Mozzarella',
            constraints: { choice: { single: true } }
          },
          selected: true
        });
      });

      const control = page.locator('.menu-item-control');
      
      // Check border is primary color
      const borderColor = await control.evaluate(el => {
        const before = window.getComputedStyle(el, '::before');
        return before.borderColor;
      });
      expect(borderColor).toContain('27'); // Primary color

      // Check inner dot exists
      const innerDot = await control.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return {
          width: after.width,
          background: after.backgroundColor
        };
      });
      expect(innerDot.width).toBe('8px');
      expect(innerDot.background).toContain('27'); // Primary color
    });
  });

  test.describe('Navigation Behavior', () => {
    test('shows icon, hides control', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { 
            id: 'pizza-menu', 
            name: 'Pizza Menu', 
            icon: '🍕',
            subMenu: { menuId: 'pizza-menu' }
          }
        });
      });

      const icon = page.locator('.menu-item-icon');
      const control = page.locator('.menu-item-control');

      await expect(icon).toBeVisible();
      await expect(icon).toHaveText('🍕');
      await expect(control).toBeHidden();
    });

    test('shows chevron for navigation items', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { 
            id: 'pizza-menu', 
            name: 'Pizza Menu',
            subMenu: { menuId: 'pizza-menu' }
          }
        });
      });

      const chevron = page.locator('.menu-item-price.material-icons');
      await expect(chevron).toBeVisible();
      await expect(chevron).toHaveText('chevron_right');
    });
  });

  test.describe('Update Function Behavior', () => {
    test('updates selected state without re-rendering', async ({ page }) => {
      // Render initial state
      await page.evaluate(() => {
        const item = window.menuItemTest.render({
          data: { id: 'test', name: 'Test Item', icon: '🍕' },
          selected: false
        });
        // Add a marker to verify element wasn't replaced
        item.dataset.testMarker = 'original';
      });

      // Verify initial state
      await expect(page.locator('[data-selected="false"]')).toBeVisible();
      
      // Update using the update function
      await page.evaluate(() => {
        const element = window.menuItemTest.getElement();
        window.menuItemTest.update(element, { selected: true });
      });

      // Verify state changed
      await expect(page.locator('[data-selected="true"]')).toBeVisible();
      
      // Verify element wasn't replaced (marker still exists)
      const marker = await page.locator('.menu-item').getAttribute('data-test-marker');
      expect(marker).toBe('original');
    });

    test('updates included state without re-rendering', async ({ page }) => {
      await page.evaluate(() => {
        const item = window.menuItemTest.render({
          data: { id: 'test', name: 'Test Item', icon: '🍕' },
          included: false
        });
        item.dataset.testMarker = 'original';
      });

      // Update included state
      await page.evaluate(() => {
        const element = window.menuItemTest.getElement();
        window.menuItemTest.update(element, { included: true });
      });

      // Verify state changed
      await expect(page.locator('[data-included="true"]')).toBeVisible();
      
      // For checkbox, control should now be visible
      const control = page.locator('.menu-item-control');
      await expect(control).toBeVisible();
      
      // Verify element wasn't replaced
      const marker = await page.locator('.menu-item').getAttribute('data-test-marker');
      expect(marker).toBe('original');
    });

    test('updates price without re-rendering', async ({ page }) => {
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { id: 'test', name: 'Test Item', price: 1.00 }
        });
      });

      // Verify initial price
      await expect(page.locator('.menu-item-price')).toHaveText('$1.00');

      // Update price
      await page.evaluate(() => {
        const element = window.menuItemTest.getElement();
        window.menuItemTest.update(element, { 
          data: { price: 2.50 }
        });
      });

      // Verify price updated
      await expect(page.locator('.menu-item-price')).toHaveText('$2.50');
    });
  });

  test.describe('State Transitions', () => {
    test('checkbox transitions from default to selected to included', async ({ page }) => {
      // Start with default state
      await page.evaluate(() => {
        window.menuItemTest.render({
          data: { id: 'test', name: 'Test', icon: '🍕' }
        });
      });

      const icon = page.locator('.menu-item-icon');
      const control = page.locator('.menu-item-control');
      const element = page.locator('.menu-item');

      // Default: icon visible
      await expect(icon).toBeVisible();
      await expect(control).toBeHidden();

      // Click to select
      await element.click();
      await page.evaluate(() => {
        const el = window.menuItemTest.getElement();
        window.menuItemTest.update(el, { selected: true });
      });

      // Selected: checkmark visible
      await expect(icon).toBeHidden();
      await expect(control).toBeVisible();

      // Set as included
      await page.evaluate(() => {
        const el = window.menuItemTest.getElement();
        window.menuItemTest.update(el, { selected: false, included: true });
      });

      // Included: red minus visible
      await expect(control).toBeVisible();
      const minus = await control.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return after.content;
      });
      expect(minus).toBe('"remove"');
    });
  });
});