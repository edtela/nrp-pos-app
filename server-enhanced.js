import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============ ERP Integration Setup ============
let erpAdapter = null;
let erpEnabled = false;
let menuItemMapping = {}; // Maps NRP menu IDs to ERP product codes

// Initialize ERP connection if configured
async function initializeERP() {
  // Check if ERP integration is enabled
  if (process.env.ERP_ENABLED !== 'true') {
    console.log('ℹ️  ERP integration disabled');
    return;
  }

  try {
    // Dynamically import nrp-next only if ERP is enabled
    const { ERPNextAdapter } = await import('nrp-next');
    
    const erpConfig = {
      url: process.env.ERPNEXT_URL,
      apiKey: process.env.ERPNEXT_API_KEY,
      apiSecret: process.env.ERPNEXT_API_SECRET,
      company: process.env.ERPNEXT_COMPANY || 'Your Company',
      warehouse: process.env.ERPNEXT_WAREHOUSE || 'Stores - TC',
      priceList: process.env.ERPNEXT_PRICE_LIST || 'Standard Selling',
      cache: {
        enabled: true,
        ttl: parseInt(process.env.ERP_CACHE_TTL || '3600')
      },
      retry: {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000
      },
      debug: process.env.NODE_ENV === 'development'
    };

    erpAdapter = new ERPNextAdapter(erpConfig);
    const connected = await erpAdapter.connect();
    
    if (connected) {
      erpEnabled = true;
      console.log('✅ ERP integration initialized successfully');
      
      // Load menu item to ERP mapping
      await loadMenuItemMapping();
    } else {
      console.error('❌ Failed to connect to ERP system');
    }
  } catch (error) {
    console.error('❌ ERP initialization error:', error.message);
    // Continue without ERP integration
  }
}

// Load mapping between NRP menu items and ERP product codes
async function loadMenuItemMapping() {
  try {
    // Try to load from file first
    const mappingPath = path.join(__dirname, 'menu-erp-mapping.json');
    if (fs.existsSync(mappingPath)) {
      menuItemMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
      console.log(`  ✓ Loaded ${Object.keys(menuItemMapping).length} menu-ERP mappings`);
    } else {
      // Create default mapping based on item IDs
      // This can be enhanced to fetch from ERP or use a naming convention
      console.log('  ℹ️  No mapping file found, using default mapping');
    }
  } catch (error) {
    console.error('Failed to load menu-ERP mapping:', error);
  }
}

// Helper function to get ERP product code from menu item ID
function getERPProductCode(menuItemId) {
  // First check explicit mapping
  if (menuItemMapping[menuItemId]) {
    return menuItemMapping[menuItemId];
  }
  
  // Fallback: use menu item ID as product code
  // You might want to transform it (e.g., uppercase, add prefix)
  return menuItemId.toUpperCase().replace(/-/g, '_');
}

// Helper function to transform NRP order to ERP format
function transformOrderForERP(nrpOrder, nrpItems) {
  const orderItems = [];
  
  // Convert NRP items to ERP format
  for (const [itemId, displayItem] of Object.entries(nrpItems)) {
    const orderItem = displayItem.item;
    const erpProductCode = getERPProductCode(orderItem.menuItem.id);
    
    const erpItem = {
      productId: erpProductCode,
      quantity: orderItem.quantity,
      price: orderItem.price,
      productName: orderItem.menuItem.name,
      modifiers: []
    };
    
    // Handle modifiers if present
    if (orderItem.modifiers && orderItem.modifiers.length > 0) {
      erpItem.modifiers = orderItem.modifiers.map(mod => ({
        id: getERPProductCode(mod.menuItemId),
        name: mod.name,
        price: mod.price,
        quantity: mod.quantity || 1
      }));
    }
    
    orderItems.push(erpItem);
  }
  
  return {
    customerId: nrpOrder.customerId,
    customerName: nrpOrder.customerName || 'Walk-in Customer',
    customerEmail: nrpOrder.customerEmail,
    customerPhone: nrpOrder.customerPhone,
    items: orderItems,
    paymentMethod: nrpOrder.paymentMethod || 'cash',
    notes: nrpOrder.notes || `POS Order ${new Date().toISOString()}`,
    metadata: {
      posTerminal: nrpOrder.terminal || 'web',
      orderSource: 'nrp-pos'
    }
  };
}

// Menu cache to store all menus in memory
const menuCache = {
  languages: [],
  menus: {},
  itemIndex: {}
};

// Load all menu files at startup
function loadMenus() {
  console.log('Loading menu files...');
  
  try {
    const configPath = path.join(__dirname, 'menu-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    menuCache.languages = config.languages;
    
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
  }
}

// Initialize on startup
async function initialize() {
  loadMenus();
  await initializeERP();
}

initialize();

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

// Serve static files
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Serve data files
app.use('/data', express.static(path.join(__dirname, 'public/data'), {
  maxAge: '1h',
  etag: true
}));

// ============ API Routes ============

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const erpStatus = erpEnabled ? 
    (await erpAdapter?.healthCheck() ? 'connected' : 'disconnected') : 
    'disabled';
  
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    menuCacheStatus: {
      languages: menuCache.languages,
      menuCount: Object.values(menuCache.menus).reduce((sum, langMenus) => sum + Object.keys(langMenus).length, 0)
    },
    erpIntegration: {
      enabled: erpEnabled,
      status: erpStatus
    }
  });
});

// Enhanced order submission with ERP integration
app.post('/api/sendOrder', async (req, res) => {
  try {
    const { order, items } = req.body;
    
    if (!order || !items) {
      return res.status(400).json({ 
        error: 'Missing required fields: order, items' 
      });
    }
    
    // First, validate the order locally (existing logic)
    const validation = validateOrder(order, items);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Order validation failed',
        validation
      });
    }
    
    // Generate local order number
    const orderNumber = `ORD-${Date.now()}`;
    
    // Submit to ERP if enabled
    let erpOrderId = null;
    let erpSubmissionError = null;
    
    if (erpEnabled && erpAdapter) {
      try {
        const erpOrderData = transformOrderForERP(order, items);
        const erpOrder = await erpAdapter.createOrder(erpOrderData);
        erpOrderId = erpOrder.id;
        console.log(`Order ${orderNumber} submitted to ERP as ${erpOrderId}`);
      } catch (error) {
        // Log error but don't fail the order
        console.error('Failed to submit order to ERP:', error);
        erpSubmissionError = error.message;
        // Continue with local order processing
      }
    }
    
    // Return success response
    res.json({
      success: true,
      orderNumber,
      erpOrderId,
      message: 'Order processed successfully',
      validation,
      order,
      timestamp: new Date().toISOString(),
      erpStatus: erpOrderId ? 'submitted' : (erpSubmissionError ? 'failed' : 'not_configured')
    });
    
  } catch (error) {
    console.error('Order processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process order',
      message: error.message 
    });
  }
});

// Stock validation endpoint
app.post('/api/validateStock', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'Items array required' 
      });
    }
    
    // If ERP is not enabled, always return available
    if (!erpEnabled || !erpAdapter) {
      return res.json({
        success: true,
        available: true,
        message: 'Stock validation skipped (ERP not configured)'
      });
    }
    
    // Check stock for each item
    const stockResults = [];
    let allAvailable = true;
    
    for (const item of items) {
      const erpProductCode = getERPProductCode(item.menuItemId);
      
      try {
        const stockLevel = await erpAdapter.checkStock(erpProductCode);
        const isAvailable = stockLevel.availableQuantity >= item.quantity;
        
        stockResults.push({
          menuItemId: item.menuItemId,
          erpProductCode,
          requested: item.quantity,
          available: stockLevel.availableQuantity,
          isAvailable
        });
        
        if (!isAvailable) {
          allAvailable = false;
        }
      } catch (error) {
        // If stock check fails, assume available
        console.error(`Stock check failed for ${erpProductCode}:`, error);
        stockResults.push({
          menuItemId: item.menuItemId,
          erpProductCode,
          requested: item.quantity,
          isAvailable: true,
          error: 'Stock check failed'
        });
      }
    }
    
    res.json({
      success: true,
      available: allAvailable,
      items: stockResults
    });
    
  } catch (error) {
    console.error('Stock validation error:', error);
    // On error, allow the sale to proceed
    res.json({
      success: true,
      available: true,
      message: 'Stock validation failed, proceeding with sale',
      error: error.message
    });
  }
});

// Admin endpoint to sync menu from ERP
app.post('/api/admin/syncMenu', async (req, res) => {
  try {
    // Check for admin authentication (implement your auth logic)
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!erpEnabled || !erpAdapter) {
      return res.status(400).json({ 
        error: 'ERP integration not configured' 
      });
    }
    
    // Sync products from ERP
    const syncResult = await erpAdapter.syncProducts();
    
    if (syncResult.success) {
      // Reload local menu cache
      loadMenus();
      
      res.json({
        success: true,
        message: 'Menu synced successfully',
        result: syncResult
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Sync failed',
        errors: syncResult.errors
      });
    }
    
  } catch (error) {
    console.error('Menu sync error:', error);
    res.status(500).json({ 
      error: 'Failed to sync menu',
      message: error.message 
    });
  }
});

// Admin endpoint to update menu-ERP mapping
app.post('/api/admin/updateMapping', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { mapping } = req.body;
    
    if (!mapping || typeof mapping !== 'object') {
      return res.status(400).json({ error: 'Invalid mapping data' });
    }
    
    // Update and save mapping
    menuItemMapping = { ...menuItemMapping, ...mapping };
    
    const mappingPath = path.join(__dirname, 'menu-erp-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(menuItemMapping, null, 2));
    
    res.json({
      success: true,
      message: 'Mapping updated successfully',
      totalMappings: Object.keys(menuItemMapping).length
    });
    
  } catch (error) {
    console.error('Mapping update error:', error);
    res.status(500).json({ 
      error: 'Failed to update mapping',
      message: error.message 
    });
  }
});

// Existing order validation logic
function validateOrder(order, items) {
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    totalCalculated: 0
  };
  
  for (const [itemId, displayItem] of Object.entries(items)) {
    const orderItem = displayItem.item;
    validation.totalCalculated += orderItem.total;
  }
  
  if (Math.abs(validation.totalCalculated - order.total) > 0.01) {
    validation.errors.push(
      `Total mismatch: calculated ${validation.totalCalculated}, order says ${order.total}`
    );
    validation.valid = false;
  }
  
  return validation;
}

// Translate order endpoint (existing)
app.post('/api/translateOrder', async (req, res) => {
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
    
    const translatedItems = {};
    const notFound = [];
    
    for (const [itemId, displayItem] of Object.entries(items)) {
      const orderItem = displayItem.item;
      const baseItemId = orderItem.menuItem.id;
      
      const translatedInfo = menuCache.itemIndex[targetLanguage]?.[baseItemId];
      
      if (translatedInfo) {
        const translatedOrderItem = {
          ...orderItem,
          menuItem: {
            ...orderItem.menuItem,
            name: translatedInfo.item.name,
            description: translatedInfo.item.description || orderItem.menuItem.description
          }
        };
        
        if (orderItem.modifiers && orderItem.modifiers.length > 0) {
          translatedOrderItem.modifiers = orderItem.modifiers.map(mod => {
            const modInfo = menuCache.itemIndex[targetLanguage]?.[mod.menuItemId];
            if (modInfo) {
              return {
                ...mod,
                name: modInfo.item.name
              };
            }
            return mod;
          });
        }
        
        translatedItems[itemId] = {
          ...displayItem,
          item: translatedOrderItem
        };
      } else {
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

// API route for menu data
app.get('/api/menu', async (req, res) => {
  try {
    const menuData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'dist/data/menu.json'), 'utf-8')
    );
    res.json(menuData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load menu data' });
  }
});

// API route for orders
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
  let htmlPath = req.path;
  
  if (!htmlPath.endsWith('/') && !htmlPath.endsWith('.html')) {
    htmlPath = htmlPath + '.html';
  }
  
  if (htmlPath.endsWith('/')) {
    htmlPath = htmlPath + 'index.html';
  }
  
  const staticFilePath = path.join(__dirname, 'dist', htmlPath);
  
  fs.access(staticFilePath, fs.constants.F_OK, (err) => {
    if (!err) {
      res.sendFile(staticFilePath);
    } else {
      res.sendFile(path.join(__dirname, 'dist', 'index-dyn.html'));
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  
  if (erpAdapter) {
    await erpAdapter.disconnect();
    console.log('ERP connection closed');
  }
  
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ERP Integration: ${process.env.ERP_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
});