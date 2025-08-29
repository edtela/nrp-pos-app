/**
 * ERPNext Integration Endpoints for NRP POS
 * 
 * This file shows how to integrate nrp-next library with the existing NRP server.
 * Add these endpoints to your existing server.js file or include this as a module.
 */

import { erpService } from './dist/services/erp-service.js';

export function setupERPRoutes(app) {
  
  // Initialize ERP connection on server start
  async function initializeERP() {
    try {
      await erpService.initialize({
        url: process.env.ERPNEXT_URL,
        apiKey: process.env.ERPNEXT_API_KEY,
        apiSecret: process.env.ERPNEXT_API_SECRET,
        company: process.env.ERPNEXT_COMPANY || 'Your Company',
        warehouse: process.env.ERPNEXT_WAREHOUSE || 'Stores - TC'
      });
      console.log('✅ ERPNext integration initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ERPNext:', error);
      // Continue running even if ERP connection fails
    }
  }

  // Call this when server starts
  initializeERP();

  // ============ ERP API Endpoints ============

  /**
   * Sync products from ERPNext to local menu data
   */
  app.post('/api/erp/sync/products', async (req, res) => {
    try {
      const result = await erpService.syncProducts();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Get products from ERPNext with filtering
   */
  app.get('/api/erp/products', async (req, res) => {
    try {
      const { category, search, limit } = req.query;
      const products = await erpService.getProducts({
        category,
        search,
        limit: limit ? parseInt(limit) : 50
      });
      res.json({ success: true, products });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Submit an order to ERPNext
   */
  app.post('/api/erp/order', async (req, res) => {
    try {
      const { order, items } = req.body;
      
      if (!order || !items) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing order or items data' 
        });
      }

      // Transform NRP order format to ERP format
      const orderData = {
        customerId: order.customerId,
        customerName: order.customerName || 'Walk-in Customer',
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        items: Object.values(items).map(displayItem => ({
          menuItem: displayItem.item.menuItem,
          quantity: displayItem.item.quantity,
          price: displayItem.item.price,
          modifiers: displayItem.item.modifiers
        })),
        paymentMethod: order.paymentMethod || 'cash',
        notes: order.notes
      };

      const erpOrder = await erpService.submitOrder(orderData);
      
      res.json({
        success: true,
        erpOrderId: erpOrder.id,
        orderNumber: erpOrder.orderNumber,
        message: 'Order submitted to ERPNext successfully'
      });
    } catch (error) {
      console.error('Error submitting order to ERP:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Check stock levels for products
   */
  app.post('/api/erp/stock/check', async (req, res) => {
    try {
      const { productIds } = req.body;
      
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ 
          success: false, 
          error: 'productIds array required' 
        });
      }

      const stockLevels = await erpService.checkMultipleStock(productIds);
      
      res.json({
        success: true,
        stockLevels
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Get single product stock
   */
  app.get('/api/erp/stock/:productId', async (req, res) => {
    try {
      const { productId } = req.params;
      const stock = await erpService.checkStock(productId);
      
      res.json({
        success: true,
        stock
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Search customers in ERPNext
   */
  app.get('/api/erp/customers/search', async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({ 
          success: false, 
          error: 'Search query required' 
        });
      }

      const customers = await erpService.searchCustomers(query);
      
      res.json({
        success: true,
        customers
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Create or update customer
   */
  app.post('/api/erp/customers', async (req, res) => {
    try {
      const customerData = req.body;
      
      if (!customerData.name) {
        return res.status(400).json({ 
          success: false, 
          error: 'Customer name required' 
        });
      }

      const customer = await erpService.createOrUpdateCustomer(customerData);
      
      res.json({
        success: true,
        customer
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Get sales report
   */
  app.get('/api/erp/reports/sales', async (req, res) => {
    try {
      const { fromDate, toDate } = req.query;
      
      const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = toDate ? new Date(toDate) : new Date();
      
      const report = await erpService.getSalesReport(from, to);
      
      res.json({
        success: true,
        report
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Get dashboard metrics
   */
  app.get('/api/erp/dashboard', async (req, res) => {
    try {
      const metrics = await erpService.getDashboardMetrics();
      
      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * Health check for ERP connection
   */
  app.get('/api/erp/health', async (req, res) => {
    try {
      const isConnected = await erpService.adapter?.isConnected();
      const canConnect = isConnected ? true : await erpService.adapter?.healthCheck();
      
      res.json({
        success: true,
        connected: isConnected,
        healthy: canConnect,
        features: erpService.adapter?.getSupportedFeatures() || []
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        connected: false,
        healthy: false,
        error: error.message 
      });
    }
  });

  // Gracefully disconnect on server shutdown
  process.on('SIGINT', async () => {
    await erpService.disconnect();
    console.log('ERP connection closed');
  });
}

// Usage in server.js:
// import { setupERPRoutes } from './server-erp-integration.js';
// setupERPRoutes(app);