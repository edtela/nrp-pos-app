import { Page } from '@playwright/test';

/**
 * Component test helper utilities
 */

/**
 * Load a component test harness
 */
export async function loadHarness(page: Page, componentName: string) {
  const harnessUrl = `http://localhost:4175/tests/harness/${componentName}.html`;
  await page.goto(harnessUrl);
  
  // Wait for harness to be ready
  await page.waitForFunction(() => {
    return (window as any)[`${componentName}TestReady`] === true;
  });
  
  // Load CSS
  await page.evaluate((name) => {
    const testObj = (window as any)[`${name}Test`];
    if (testObj && testObj.loadStyles) {
      // Try to find the current CSS file
      const cssPath = '/assets/index-BSXaKesc.css'; // This would need to be dynamic
      testObj.loadStyles(cssPath);
    }
  }, componentName.replace('-', ''));
}

/**
 * Verify pseudo-element styles
 */
export async function getPseudoElementStyles(
  page: Page,
  selector: string,
  pseudo: '::before' | '::after'
) {
  return await page.locator(selector).evaluate((el, pseudoElement) => {
    const styles = window.getComputedStyle(el, pseudoElement);
    return {
      content: styles.content,
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      display: styles.display,
      width: styles.width,
      height: styles.height
    };
  }, pseudo);
}

/**
 * Create test data for menu items
 */
export function createMenuItem(overrides: any = {}) {
  return {
    data: {
      id: 'test-item',
      name: 'Test Item',
      icon: '🍕',
      ...overrides.data
    },
    selected: false,
    included: false,
    quantity: 0,
    total: 0,
    ...overrides
  };
}

/**
 * Create checkbox menu item
 */
export function createCheckboxItem(overrides: any = {}) {
  return createMenuItem({
    data: {
      id: 'checkbox-item',
      name: 'Checkbox Item',
      icon: '✓',
      ...overrides.data
    },
    ...overrides
  });
}

/**
 * Create radio menu item
 */
export function createRadioItem(overrides: any = {}) {
  return createMenuItem({
    data: {
      id: 'radio-item',
      name: 'Radio Item',
      icon: '○',
      constraints: { choiceId: 'single-choice' },
      ...overrides.data
    },
    isSingleChoice: true,
    ...overrides
  });
}

/**
 * Create navigation menu item
 */
export function createNavItem(overrides: any = {}) {
  return createMenuItem({
    data: {
      id: 'nav-item',
      name: 'Navigation Item',
      icon: '→',
      subMenu: { menuId: 'sub-menu' },
      ...overrides.data
    },
    ...overrides
  });
}

/**
 * Wait for CSS to be loaded
 */
export async function waitForStyles(page: Page) {
  await page.waitForFunction(() => {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    return Array.from(links).every(link => {
      const sheet = (link as HTMLLinkElement).sheet;
      return sheet && sheet.cssRules && sheet.cssRules.length > 0;
    });
  });
}

/**
 * Take a screenshot of a component state
 */
export async function captureComponentState(
  page: Page,
  selector: string,
  stateName: string
) {
  const element = page.locator(selector);
  await element.screenshot({
    path: `tests/screenshots/component-${stateName}.png`
  });
}

/**
 * Verify component visibility rules
 */
export async function verifyVisibility(
  page: Page,
  expectations: { selector: string; visible: boolean }[]
) {
  for (const { selector, visible } of expectations) {
    const element = page.locator(selector);
    if (visible) {
      await element.waitFor({ state: 'visible' });
    } else {
      await element.waitFor({ state: 'hidden' });
    }
  }
}

/**
 * Get computed styles for an element
 */
export async function getComputedStyles(page: Page, selector: string) {
  return await page.locator(selector).evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      display: styles.display,
      visibility: styles.visibility,
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      width: styles.width,
      height: styles.height
    };
  });
}

/**
 * Simulate state changes
 */
export async function updateComponentState(
  page: Page,
  componentName: string,
  changes: any
) {
  await page.evaluate(({ name, updates }) => {
    const testObj = (window as any)[`${name}Test`];
    if (testObj && testObj.update) {
      const element = testObj.getElement();
      testObj.update(element, updates);
    }
  }, { name: componentName.replace('-', ''), updates: changes });
}