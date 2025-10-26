import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Initialize ERPNext POS integration
 * This module is only loaded server-side, so it won't affect client bundle
 */
export async function initializeErpPos() {
  // Check required environment variables for ERPNext
  const requiredVars = ['ERP_BASE_URL', 'ERP_API_KEY', 'ERP_API_SECRET'];
  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.log('ℹ️  ERPNext environment variables not configured, using mock ERP');

    try {
      // Use mock ERP adapter for development
      const { MockERPAdapter } = await import('nrp-next');
      const mockAdapter = new MockERPAdapter();
      await mockAdapter.connect();

      console.log('✅ Mock ERP adapter initialized (development mode)');
      console.log('   ⚠️  Using in-memory data - resets on server restart');
      console.log('   💡 Configure ERP_BASE_URL, ERP_API_KEY, and ERP_API_SECRET for production');

      return mockAdapter;
    } catch (mockError) {
      console.error('❌ Failed to initialize mock ERP:', mockError.message);
      console.error('   Install nrp-next package to enable mock ERP: npm install nrp-next');
      return null;
    }
  }

  try {
    // Try to load real ERPNext implementation first
    const { createRestaurantPos } = await import('erp-next');

    const pos = createRestaurantPos({
      erpBaseUrl: process.env.ERP_BASE_URL,
      erpApiKey: process.env.ERP_API_KEY,
      erpApiSecret: process.env.ERP_API_SECRET,
      defaultCustomer: process.env.ERP_DEFAULT_CUSTOMER || 'Walk-in Customer',
      warehouse: process.env.ERP_WAREHOUSE || 'Stores - AR',
      posProfile: process.env.ERP_POS_PROFILE || 'Restaurant POS',
      currency: process.env.ERP_CURRENCY || 'ALL'
    });

    console.log('✅ ERPNext POS integration initialized (production mode)');
    console.log(`   Base URL: ${process.env.ERP_BASE_URL}`);
    console.log(`   Warehouse: ${process.env.ERP_WAREHOUSE || 'Stores - AR'}`);
    console.log(`   Currency: ${process.env.ERP_CURRENCY || 'ALL'}`);

    return pos;
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('ℹ️  ERPNext package not found, falling back to mock ERP');

      try {
        // Fall back to mock ERP adapter for development
        const { MockERPAdapter } = await import('nrp-next');
        const mockAdapter = new MockERPAdapter();
        await mockAdapter.connect();

        console.log('✅ Mock ERP adapter initialized (development mode)');
        console.log('   ⚠️  Using in-memory data - resets on server restart');
        console.log('   💡 Configure ERP_BASE_URL, ERP_API_KEY, and ERP_API_SECRET for production');

        return mockAdapter;
      } catch (mockError) {
        console.error('❌ Failed to initialize mock ERP:', mockError.message);
        return null;
      }
    }
    console.error('❌ Failed to initialize ERPNext POS:', error.message);
    return null;
  }
}

/**
 * Map NRP order items to ERPNext format
 * Returns an array of items to be added as line items in the Sales Order
 */
export function mapOrderItemsToErp(items) {
  const erpItems = [];
  
  for (const [itemId, displayItem] of Object.entries(items)) {
    const orderItem = displayItem.item;
    
    // Add the main item
    const mainItem = {
      itemCode: orderItem.menuItem.id,
      quantity: orderItem.quantity,
      specialInstructions: orderItem.notes
    };
    
    // Handle variant selection (e.g., size)
    if (orderItem.menuItem.variant) {
      mainItem.variantCode = orderItem.menuItem.variant;
    }
    
    erpItems.push(mainItem);
    
    // Add modifiers as separate line items
    // Each modifier becomes its own line item for accurate inventory tracking
    if (orderItem.modifiers && orderItem.modifiers.length > 0) {
      for (const mod of orderItem.modifiers) {
        // Only send modifiers that need inventory tracking
        // (UI determines which modifiers to send based on add/remove/replace logic)
        erpItems.push({
          itemCode: mod.menuItemId,
          quantity: orderItem.quantity, // Multiply by main item quantity
          specialInstructions: `For ${orderItem.menuItem.name}`
        });
      }
    }
  }
  
  return erpItems;
}

/**
 * Get payment method from order
 */
export function getPaymentMethod(order) {
  // Check if payment method is specified in order
  if (order.paymentMethod) {
    return order.paymentMethod.toLowerCase();
  }
  
  // Default to cash
  return 'cash';
}

/**
 * Create session metadata
 */
export function createSessionMetadata(order, tableNumber) {
  return {
    tableNumber: tableNumber || 'Takeaway',
    waiter: order.waiter || 'POS User',
    customerCount: order.customerCount || 1,
    notes: order.notes || ''
  };
}