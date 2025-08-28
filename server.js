import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Menu cache to store all menus in memory
const menuCache = {
  languages: [], // Available languages
  menus: {},     // Structure: { [lang]: { [menuId]: menuData } }
  itemIndex: {}  // Structure: { [lang]: { [itemId]: { item, menuId } } }
};

// Load all menu files at startup
function loadMenus() {
  console.log('Loading menu files...');
  
  try {
    // Load configuration
    const configPath = path.join(__dirname, 'menu-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    menuCache.languages = config.languages;
    
    // Load menus for each language
    for (const lang of config.languages) {
      menuCache.menus[lang] = {};
      menuCache.itemIndex[lang] = {};
      
      const langDir = path.join(__dirname, 'public/data/menu', lang);
      
      if (!fs.existsSync(langDir)) {
        console.log(`  ⚠️  Language directory ${lang} not found`);
        continue;
      }
      
      const files = fs.readdirSync(langDir);
      
      for (const file of files) {
        if (!file.endsWith('.json') || file.includes('.backup')) continue;
        
        const menuId = file.replace('.json', '');
        const menuPath = path.join(langDir, file);
        
        try {
          const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf-8'));
          menuCache.menus[lang][menuId] = menuData;
          
          // Index all items for quick lookup
          if (menuData.items) {
            for (const [itemId, item] of Object.entries(menuData.items)) {
              menuCache.itemIndex[lang][itemId] = {
                item,
                menuId,
                menuName: menuData.name
              };
            }
          }
          
          console.log(`  ✓ Loaded ${lang}/${menuId}`);
        } catch (err) {
          console.error(`  ✗ Failed to load ${lang}/${menuId}:`, err.message);
        }
      }
    }
    
    console.log('Menu loading complete!');
    console.log(`  Languages: ${menuCache.languages.join(', ')}`);
    console.log(`  Total menus: ${Object.values(menuCache.menus).reduce((sum, langMenus) => sum + Object.keys(langMenus).length, 0)}`);
  } catch (error) {
    console.error('Failed to load menus:', error);
    // Continue running even if menu loading fails
  }
}

// Load menus at startup
loadMenus();

// Enable gzip compression
app.use(compression());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from dist with proper caching
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, path) => {
    // Don't cache HTML files
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Serve data files from public directory
app.use('/data', express.static(path.join(__dirname, 'public/data'), {
  maxAge: '1h',  // Cache data files for 1 hour
  etag: true
}));

// API routes (add your server-side features here)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    menuCacheStatus: {
      languages: menuCache.languages,
      menuCount: Object.values(menuCache.menus).reduce((sum, langMenus) => sum + Object.keys(langMenus).length, 0)
    }
  });
});

// Translate order items to different language
app.post('/api/translateOrder', (req, res) => {
  try {
    const { order, items, targetLanguage } = req.body;
    
    if (!order || !items || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Missing required fields: order, items, targetLanguage' 
      });
    }
    
    if (!menuCache.languages.includes(targetLanguage)) {
      return res.status(400).json({ 
        error: `Language '${targetLanguage}' not available. Available: ${menuCache.languages.join(', ')}` 
      });
    }
    
    // Translate each order item
    const translatedItems = {};
    const notFound = [];
    
    for (const [itemId, displayItem] of Object.entries(items)) {
      const orderItem = displayItem.item;
      const baseItemId = orderItem.menuItem.id;
      
      // Look up translated item in target language
      const translatedInfo = menuCache.itemIndex[targetLanguage]?.[baseItemId];
      
      if (translatedInfo) {
        // Create translated order item
        const translatedOrderItem = {
          ...orderItem,
          menuItem: {
            ...orderItem.menuItem,
            name: translatedInfo.item.name,
            description: translatedInfo.item.description || orderItem.menuItem.description
          }
        };
        
        // Translate modifiers if present
        if (orderItem.modifiers && orderItem.modifiers.length > 0) {
          translatedOrderItem.modifiers = orderItem.modifiers.map(mod => {
            const modInfo = menuCache.itemIndex[targetLanguage]?.[mod.menuItemId];
            if (modInfo) {
              return {
                ...mod,
                name: modInfo.item.name
              };
            }
            return mod; // Keep original if translation not found
          });
        }
        
        translatedItems[itemId] = {
          ...displayItem,
          item: translatedOrderItem
        };
      } else {
        // Keep original if translation not found
        translatedItems[itemId] = displayItem;
        notFound.push(baseItemId);
      }
    }
    
    res.json({
      success: true,
      order,
      items: translatedItems,
      targetLanguage,
      untranslated: notFound.length > 0 ? notFound : undefined
    });
    
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Failed to translate order',
      message: error.message 
    });
  }
});

// Validate and send order
app.post('/api/sendOrder', (req, res) => {
  try {
    const { order, items, language = 'en' } = req.body;
    
    if (!order || !items) {
      return res.status(400).json({ 
        error: 'Missing required fields: order, items' 
      });
    }
    
    // Validation results
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      totalCalculated: 0
    };
    
    // Check if language exists in cache
    if (!menuCache.menus[language]) {
      validation.warnings.push(`Language '${language}' not in cache, using default validation`);
    }
    
    // Validate each order item
    for (const [itemId, displayItem] of Object.entries(items)) {
      const orderItem = displayItem.item;
      const baseItemId = orderItem.menuItem.id;
      
      // Look up item in menu cache
      const menuInfo = menuCache.itemIndex[language]?.[baseItemId];
      
      if (!menuInfo) {
        validation.errors.push(`Item '${baseItemId}' not found in menu`);
        validation.valid = false;
        continue;
      }
      
      const menuItem = menuInfo.item;
      
      // Validate price (if item has fixed price)
      if (typeof menuItem.price === 'number') {
        const expectedPrice = menuItem.price * orderItem.quantity;
        const actualBasePrice = orderItem.price;
        
        if (Math.abs(expectedPrice - actualBasePrice) > 0.01) {
          validation.errors.push(
            `Price mismatch for '${orderItem.menuItem.name}': expected ${expectedPrice}, got ${actualBasePrice}`
          );
          validation.valid = false;
        }
      }
      
      // Validate modifiers
      if (orderItem.modifiers && orderItem.modifiers.length > 0) {
        for (const modifier of orderItem.modifiers) {
          const modInfo = menuCache.itemIndex[language]?.[modifier.menuItemId];
          
          if (!modInfo) {
            validation.warnings.push(
              `Modifier '${modifier.menuItemId}' not found for validation`
            );
          } else if (typeof modInfo.item.price === 'number') {
            // Validate modifier price
            const expectedModPrice = modInfo.item.price;
            if (Math.abs(expectedModPrice - modifier.price) > 0.01 && modifier.modType === 'add') {
              validation.warnings.push(
                `Modifier price mismatch for '${modifier.name}': expected ${expectedModPrice}, got ${modifier.price}`
              );
            }
          }
        }
      }
      
      // Add to calculated total
      validation.totalCalculated += orderItem.total;
    }
    
    // Validate order total
    if (Math.abs(validation.totalCalculated - order.total) > 0.01) {
      validation.errors.push(
        `Total mismatch: calculated ${validation.totalCalculated}, order says ${order.total}`
      );
      validation.valid = false;
    }
    
    if (validation.valid) {
      // Here you would normally:
      // 1. Save order to database
      // 2. Send to kitchen/POS system
      // 3. Generate order number
      // 4. Process payment
      
      const orderNumber = `ORD-${Date.now()}`;
      
      console.log(`Order ${orderNumber} validated successfully:`, {
        items: Object.keys(items).length,
        total: order.total,
        currency: order.currency
      });
      
      res.json({
        success: true,
        orderNumber,
        message: 'Order validated successfully',
        validation,
        order,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Order validation failed',
        validation
      });
    }
    
  } catch (error) {
    console.error('Order processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process order',
      message: error.message 
    });
  }
});

// API route for menu data (example)
app.get('/api/menu', async (req, res) => {
  try {
    // You can fetch from database or external API here
    const menuData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'dist/data/menu.json'), 'utf-8')
    );
    res.json(menuData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load menu data' });
  }
});

// API route for orders (example)
app.get('/api/orders', async (req, res) => {
  try {
    const orderData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'dist/data/order.json'), 'utf-8')
    );
    res.json(orderData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load order data' });
  }
});

// Handle routing - serve static HTML files first, fallback to dynamic
app.get('*', (req, res) => {
  // Clean the path and map to HTML file
  let htmlPath = req.path;
  
  // Add .html extension if not present and not a directory
  if (!htmlPath.endsWith('/') && !htmlPath.endsWith('.html')) {
    htmlPath = htmlPath + '.html';
  }
  
  // Map directory paths to index.html
  if (htmlPath.endsWith('/')) {
    htmlPath = htmlPath + 'index.html';
  }
  
  // Try to serve the static HTML file
  const staticFilePath = path.join(__dirname, 'dist', htmlPath);
  
  fs.access(staticFilePath, fs.constants.F_OK, (err) => {
    if (!err) {
      // Static file exists, serve it
      res.sendFile(staticFilePath);
    } else {
      // No static file, serve dynamic SPA version
      res.sendFile(path.join(__dirname, 'dist', 'index-dyn.html'));
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});