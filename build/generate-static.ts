/**
 * Static Site Generation Script
 * Generates static HTML pages at build time with embedded data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
import type { Menu } from '../src/types/menu';
import type { DisplayMenu } from '../src/model/menu-model';
import type { OrderPageData } from '../src/model/order-model';
import type { PageStaticData } from '../src/types/page-data';

// Import the actual page templates
import * as MenuPage from '../src/pages/menu-page';
import * as OrderPage from '../src/pages/order-page';
import { buildHTML } from '../src/lib/template';

// Helper to transform Menu to DisplayMenu
function transformToDisplayMenu(menu: Menu): DisplayMenu {
  // Three-layer structure: map items directly
  const mappedItems: Record<string, any> = {};
  if (menu.items) {
    for (const [id, item] of Object.entries(menu.items)) {
      mappedItems[id] = {
        data: item,
        quantity: 0,
        total: 0
      };
    }
  }
  
  return {
    ...menu,
    items: mappedItems,
    itemGroups: menu.itemGroups || {},
    layout: menu.layout || []
  } as DisplayMenu;
}

// Read the Vite-generated assets from dist/assets
async function getViteAssets(): Promise<{ js: string; css?: string }> {
  const assetsDir = path.join(__dirname, '../dist/assets');
  
  const files = await fs.readdir(assetsDir);
  
  // Find JS and CSS files for SSG mode
  const jsFile = files.find(f => f.startsWith('ssg-') && f.endsWith('.js'));
  const cssFile = files.find(f => f.startsWith('app-init-') && f.endsWith('.css'));
  
  if (!jsFile) {
    throw new Error('No SSG JS file found in dist/assets');
  }
  
  return {
    js: `/assets/${jsFile}`,
    css: cssFile ? `/assets/${cssFile}` : undefined
  };
}

// Generate full HTML document
async function generateHTMLDocument(
  content: string,
  preloadData: PageStaticData | null,
  title: string = 'NRP POS'
): Promise<string> {
  const assets = await getViteAssets();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  ${assets.css ? `<link rel="stylesheet" href="${assets.css}">` : ''}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overscroll-behavior: none;
      touch-action: pan-x pan-y;
      background: #f5f5f5;
    }
    
    #app {
      width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
    }
  </style>
  ${preloadData ? `
  <script>
    window.__PRELOADED_DATA__ = ${JSON.stringify(preloadData)};
  </script>` : ''}
</head>
<body>
  <div id="app">${content}</div>
  <script type="module" src="${assets.js}"></script>
</body>
</html>`;
}

// Load configuration
async function loadConfig() {
  const configPath = path.join(__dirname, '../menu-config.json');
  const configContent = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(configContent);
}

// Main generation function
async function generateStaticPages() {
  console.log('🚀 Starting static page generation...');
  
  const config = await loadConfig();
  const languages = config.languages;
  const defaultLang = config.defaultLanguage;
  
  const distDir = path.join(__dirname, '../dist');
  const menuDir = path.join(__dirname, '../public/data/menu');
  
  // Ensure dist directory exists
  await fs.mkdir(distDir, { recursive: true });
  
  // Process each language
  for (const lang of languages) {
    console.log(`\n  Processing ${lang}...`);
    
    const langMenuDir = path.join(menuDir, lang);
    
    // Check if language directory exists
    try {
      await fs.access(langMenuDir);
    } catch {
      console.log(`  ⚠️  Language directory ${lang} not found, skipping...`);
      continue;
    }
    
    // Copy menu data to dist
    const distDataDir = path.join(distDir, 'data/menu', lang);
    await fs.mkdir(distDataDir, { recursive: true });
    
    // Read all menu files for this language
    const menuFiles = await fs.readdir(langMenuDir);
    
    for (const file of menuFiles) {
      if (!file.endsWith('.json')) continue;
      
      // Copy menu data file
      await fs.copyFile(
        path.join(langMenuDir, file),
        path.join(distDataDir, file)
      );
      
      // Read and parse menu data
      const menuData = JSON.parse(
        await fs.readFile(path.join(langMenuDir, file), 'utf-8')
      ) as Menu;
      
      // Transform to DisplayMenu
      const displayMenu = transformToDisplayMenu(menuData);
      
      // Generate page data
      const pageData: PageStaticData = {
        type: 'menu',
        data: displayMenu
      };
      
      // Create context for the language and currency
      const context = {
        translations: {},
        lang: lang as any,
        currency: {
          code: displayMenu.currency || 'ALL',
          symbol: displayMenu.currency === 'USD' ? '$' : displayMenu.currency === 'EUR' ? '€' : 'L',
          position: 'after' as const,
          decimals: 0
        }
      };
      
      // Generate HTML content using the actual template
      const templateResult = MenuPage.template(displayMenu, context);
      // Convert Template object to HTML string
      const content = buildHTML(templateResult);
      
      // Generate full HTML document
      const html = await generateHTMLDocument(
        content,
        pageData,
        `${displayMenu.name} - NRP POS`
      );
      
      // Determine output file name with language prefix
      const baseName = file === 'index.json' ? 'index' : file.replace('.json', '');
      const pageName = lang === defaultLang ? 
        `${baseName}.html` : 
        `${baseName}.${lang}.html`;
      
      // Write HTML file
      await fs.writeFile(path.join(distDir, pageName), html);
      console.log(`    ✓ Generated ${pageName}`);
    }
    
    // Generate order page for this language
    // Load order configuration
    let orderConfig = { currency: 'ALL', taxRate: 0, serviceFee: 0 };
    try {
      const orderConfigPath = path.join(__dirname, '../public/data/order.json');
      const orderConfigContent = await fs.readFile(orderConfigPath, 'utf-8');
      orderConfig = JSON.parse(orderConfigContent);
    } catch (err) {
      console.log(`    ⚠️  Using default order config (order.json not found)`);
    }
    
    const emptyOrderData: OrderPageData = {
      order: { itemIds: [], total: 0, currency: orderConfig.currency },
      items: {},
      currency: orderConfig.currency
    };
    
    const orderPageData: PageStaticData = {
      type: 'order',
      data: emptyOrderData
    };
    
    // Create context for order page with currency
    const orderContext = {
      translations: {},
      lang: lang as any,
      currency: {
        code: orderConfig.currency || 'ALL',
        symbol: orderConfig.currency === 'USD' ? '$' : orderConfig.currency === 'EUR' ? '€' : 'L',
        position: orderConfig.currency === 'USD' ? 'before' as const : 'after' as const,
        decimals: orderConfig.currency === 'ALL' ? 0 : 2,
        separator: orderConfig.currency === 'USD' ? '.' : ',',
        thousands: orderConfig.currency === 'USD' ? ',' : '.'
      }
    };
    
    const orderTemplateResult = OrderPage.template(emptyOrderData, orderContext);
    const orderContent = buildHTML(orderTemplateResult);
    
    const orderHtml = await generateHTMLDocument(
      orderContent,
      orderPageData,
      'Your Order - NRP POS'
    );
    
    const orderPageName = lang === defaultLang ? 'order.html' : `order.${lang}.html`;
    await fs.writeFile(path.join(distDir, orderPageName), orderHtml);
    console.log(`    ✓ Generated ${orderPageName}`);
  }
  
  // Also copy default language menu data to root for backward compatibility
  console.log(`\n  Creating backward compatibility files...`);
  const defaultLangDir = path.join(menuDir, defaultLang);
  const rootDataDir = path.join(distDir, 'data/menu');
  
  if (await fs.access(defaultLangDir).then(() => true).catch(() => false)) {
    const files = await fs.readdir(defaultLangDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.copyFile(
          path.join(defaultLangDir, file),
          path.join(rootDataDir, file)
        );
        console.log(`    ✓ Copied ${file} to root`);
      }
    }
  }
  
  console.log('\n✨ Static generation complete!');
}

// Run if called directly
if (process.argv[1] === __filename) {
  generateStaticPages().catch(error => {
    console.error('Error generating static pages:', error);
    process.exit(1);
  });
}

export { generateStaticPages };