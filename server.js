import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import fs from 'fs';
import { initializeErpPos, mapOrderItemsToErp, createSessionMetadata, getPaymentMethod } from './server/erp-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Track active table sessions
const tableSessions = new Map();

// ERP POS instance (initialized on startup)
let erpPos = null;

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
app.post('/api/sendOrder', async (req, res) => {
  try {
    const { order, items, language = 'en', tableNumber } = req.body;
    
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
      // Process with ERPNext if configured
      let erpResult = null;
      
      if (erpPos) {
        try {
          // Check if we have an active session for this table
          let sessionId = order.sessionId;
          
          // If no session, create one
          if (!sessionId) {
            // Check if table already has an active session
            const existingSession = Array.from(tableSessions.values())
              .find(s => s.tableNumber === tableNumber && s.status === 'active');
            
            if (existingSession) {
              sessionId = existingSession.sessionId;
            } else {
              // Create new session
              const session = await erpPos.tables.openTable({
                tableNumber: tableNumber || 'Takeaway',
                waiter: order.waiter || 'POS User',
                customerCount: order.customerCount || 1,
                notes: order.notes
              });
              
              sessionId = session.sessionId;
              tableSessions.set(sessionId, session);
              console.log(`Created new ERP session: ${sessionId} for table ${tableNumber}`);
            }
          }
          
          // Map NRP items to ERP format
          const erpItems = mapOrderItemsToErp(items);
          
          // Create order in ERPNext
          const erpOrder = await erpPos.orders.createOrder({
            sessionId,
            items: erpItems,
            notes: order.notes
          });
          
          // Submit to kitchen if configured
          if (process.env.ERP_AUTO_SUBMIT === 'true') {
            await erpPos.orders.submitToKitchen(erpOrder.orderId);
          }
          
          erpResult = {
            orderId: erpOrder.orderId,
            sessionId: erpOrder.sessionId,
            orderNumber: erpOrder.orderNumber,
            status: erpOrder.status
          };
          
          console.log(`Order sent to ERPNext: ${erpOrder.orderId}`);
        } catch (erpError) {
          console.error('ERPNext integration error:', erpError);
          validation.warnings.push(`ERP sync failed: ${erpError.message}`);
        }
      }
      
      const orderNumber = erpResult?.orderId || `ORD-${Date.now()}`;
      
      console.log(`Order ${orderNumber} validated successfully:`, {
        items: Object.keys(items).length,
        total: order.total,
        currency: order.currency,
        erpSynced: !!erpResult
      });
      
      res.json({
        success: true,
        orderNumber,
        message: 'Order validated successfully',
        validation,
        order,
        erp: erpResult,
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

// ==========================================
// ERPNext Integration API Routes
// ==========================================

// Get available tables
app.get('/api/erp/tables', async (req, res) => {
  if (!erpPos) {
    return res.status(503).json({ error: 'ERP integration not configured' });
  }
  
  try {
    const tables = await erpPos.tables.getAllTables();
    res.json({
      success: true,
      tables: tables.map(t => ({
        id: t.id,
        number: t.number,
        status: t.status,
        capacity: t.capacity,
        currentSession: t.currentSession?.sessionId
      }))
    });
  } catch (error) {
    console.error('Failed to get tables:', error);
    res.status(500).json({ error: 'Failed to get tables', message: error.message });
  }
});

// Open table session
app.post('/api/erp/tables/open', async (req, res) => {
  if (!erpPos) {
    return res.status(503).json({ error: 'ERP integration not configured' });
  }
  
  try {
    const { tableNumber, waiter, customerCount, notes } = req.body;
    
    const session = await erpPos.tables.openTable({
      tableNumber: tableNumber || 'Takeaway',
      waiter: waiter || 'POS User',
      customerCount: customerCount || 1,
      notes
    });
    
    // Store session locally for quick lookup
    tableSessions.set(session.sessionId, session);
    
    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        tableNumber: session.tableNumber,
        startTime: session.startTime,
        status: session.status
      }
    });
  } catch (error) {
    console.error('Failed to open table:', error);
    res.status(500).json({ error: 'Failed to open table', message: error.message });
  }
});

// Create order for session
app.post('/api/erp/orders/create', async (req, res) => {
  if (!erpPos) {
    return res.status(503).json({ error: 'ERP integration not configured' });
  }
  
  try {
    const { sessionId, items, notes } = req.body;
    
    // Map NRP items to ERP format
    const erpItems = mapOrderItemsToErp(items);
    
    const order = await erpPos.orders.createOrder({
      sessionId,
      items: erpItems,
      notes
    });
    
    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        sessionId: order.sessionId,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

// Submit order to kitchen
app.post('/api/erp/orders/:orderId/submit', async (req, res) => {
  if (!erpPos) {
    return res.status(503).json({ error: 'ERP integration not configured' });
  }
  
  try {
    const { orderId } = req.params;
    await erpPos.orders.submitToKitchen(orderId);
    
    res.json({
      success: true,
      message: 'Order submitted to kitchen'
    });
  } catch (error) {
    console.error('Failed to submit order:', error);
    res.status(500).json({ error: 'Failed to submit order', message: error.message });
  }
});

// Get bill for session
app.get('/api/erp/bill/:sessionId', async (req, res) => {
  if (!erpPos) {
    return res.status(503).json({ error: 'ERP integration not configured' });
  }
  
  try {
    const { sessionId } = req.params;
    const bill = await erpPos.payments.getTableBill(sessionId);
    
    res.json({
      success: true,
      bill
    });
  } catch (error) {
    console.error('Failed to get bill:', error);
    res.status(500).json({ error: 'Failed to get bill', message: error.message });
  }
});

// Process payment
app.post('/api/erp/payments/process', async (req, res) => {
  if (!erpPos) {
    return res.status(503).json({ error: 'ERP integration not configured' });
  }
  
  try {
    const { sessionId, amount, paymentMethod, tip } = req.body;
    
    const result = await erpPos.payments.processPayment({
      sessionId,
      amount,
      paymentMethod: paymentMethod || 'cash',
      tip
    });
    
    // Clear local session if payment successful
    if (result.success) {
      tableSessions.delete(sessionId);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Failed to process payment:', error);
    res.status(500).json({ error: 'Failed to process payment', message: error.message });
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

// Async startup function
async function startServer() {
  // Initialize ERPNext POS integration (if configured)
  erpPos = await initializeErpPos();

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});