# NRP Server with ERP Integration

This document explains how to use the enhanced server with ERPNext integration while keeping the frontend ERP-agnostic.

## Architecture

```
Frontend (Browser)
    ↓ [Regular NRP API calls]
server-enhanced.js
    ↓ [Transforms data]
nrp-next library
    ↓ [ERPNext API calls]
ERPNext Server
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Install required dependencies
npm install dotenv

# Build and link nrp-next library
cd ../nrp-next
npm install
npm run build
cd ../nrp
npm link ../nrp-next
```

### 2. Configure Environment

Copy the example environment file and configure:

```bash
cp env.example .env
```

Edit `.env` with your ERPNext credentials:

```env
# Enable ERP integration
ERP_ENABLED=true

# ERPNext connection details
ERPNEXT_URL=https://your-instance.erpnext.com
ERPNEXT_API_KEY=your-api-key
ERPNEXT_API_SECRET=your-api-secret

# Business settings
ERPNEXT_COMPANY=Your Company Name
ERPNEXT_WAREHOUSE=Stores - TC

# Admin token for protected endpoints
ADMIN_TOKEN=generate-secure-token-here
```

### 3. Set Up Menu-ERP Mapping

Create mapping between NRP menu IDs and ERPNext product codes:

```bash
cp menu-erp-mapping.example.json menu-erp-mapping.json
```

Edit `menu-erp-mapping.json` to match your ERPNext product codes.

### 4. Use Enhanced Server

Replace the default server with the enhanced version:

```bash
# Backup original server
cp server.js server-original.js

# Use enhanced server
cp server-enhanced.js server.js

# Or run directly
node server-enhanced.js
```

## API Endpoints

### Order Submission (Enhanced)

The existing `/api/sendOrder` endpoint now automatically submits to ERPNext when enabled:

```javascript
// Frontend code (unchanged)
const response = await fetch('/api/sendOrder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ order, items })
});

// Response includes ERP status
{
  success: true,
  orderNumber: "ORD-1234567890",
  erpOrderId: "SO-2024-00001",  // If ERP enabled
  erpStatus: "submitted"         // or "failed" or "not_configured"
}
```

### Stock Validation (New)

Check stock availability before checkout:

```javascript
// Frontend: Check stock for cart items
const response = await fetch('/api/validateStock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [
      { menuItemId: 'espresso-single', quantity: 2 },
      { menuItemId: 'yogurt-strawberry', quantity: 1 }
    ]
  })
});

// Response
{
  success: true,
  available: true,  // or false if any item is out of stock
  items: [
    {
      menuItemId: 'espresso-single',
      erpProductCode: 'PROD-ESP-001',
      requested: 2,
      available: 50,
      isAvailable: true
    }
  ]
}
```

### Admin Endpoints

#### Sync Menu from ERP

```bash
curl -X POST http://localhost:3000/api/admin/syncMenu \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Update Menu-ERP Mapping

```bash
curl -X POST http://localhost:3000/api/admin/updateMapping \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mapping": {
      "new-menu-item": "PROD-NEW-001"
    }
  }'
```

## Frontend Integration Examples

### 1. Stock Check Before Add to Cart

```javascript
// In your cart service or component
async function addToCart(menuItem, quantity) {
  // Check stock first
  const stockResponse = await fetch('/api/validateStock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ menuItemId: menuItem.id, quantity }]
    })
  });
  
  const stockResult = await stockResponse.json();
  
  if (!stockResult.available) {
    // Show out of stock message
    alert(`Sorry, ${menuItem.name} is out of stock`);
    return false;
  }
  
  // Proceed with adding to cart
  return cartStore.addItem(menuItem, quantity);
}
```

### 2. Order Submission with ERP Status

```javascript
// In your checkout handler
async function submitOrder(order, items) {
  const response = await fetch('/api/sendOrder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order, items })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Order successful
    console.log('Order number:', result.orderNumber);
    
    // Check if ERP submission succeeded
    if (result.erpOrderId) {
      console.log('Synced to ERP:', result.erpOrderId);
    } else if (result.erpStatus === 'failed') {
      console.warn('ERP sync failed, but order saved locally');
    }
    
    // Show success to user
    showSuccessMessage(`Order ${result.orderNumber} placed successfully!`);
  }
}
```

### 3. Real-time Stock Display (Optional)

```javascript
// In menu display component
async function loadMenuWithStock(menuItems) {
  // Get stock for all menu items
  const itemIds = menuItems.map(item => ({ 
    menuItemId: item.id, 
    quantity: 1 
  }));
  
  const stockResponse = await fetch('/api/validateStock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: itemIds })
  });
  
  const stockData = await stockResponse.json();
  
  // Create stock lookup
  const stockMap = {};
  stockData.items?.forEach(item => {
    stockMap[item.menuItemId] = item.available;
  });
  
  // Update menu items with stock info
  menuItems.forEach(item => {
    item.stockAvailable = stockMap[item.id] || 0;
    item.inStock = item.stockAvailable > 0;
  });
  
  return menuItems;
}
```

## Features

### Graceful Degradation

The system continues to work even when ERPNext is unavailable:

1. **Orders**: Saved locally and queued for later sync
2. **Stock**: Assumes available if check fails
3. **Menu**: Uses cached local data

### Automatic Features

When ERP is enabled, the server automatically:

- Submits orders to ERPNext on checkout
- Validates order totals and items
- Tracks which orders synced successfully
- Logs all ERP interactions for debugging

### Manual Sync

Admins can manually trigger sync operations:

- Sync products from ERPNext to local menu
- Update menu-ERP mapping
- Retry failed order submissions

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/health
```

Returns:
```json
{
  "status": "healthy",
  "menuCacheStatus": { ... },
  "erpIntegration": {
    "enabled": true,
    "status": "connected"
  }
}
```

### Logs

The server logs all ERP operations:

```
✅ ERP integration initialized successfully
Order ORD-123 submitted to ERP as SO-2024-00001
Failed to submit order to ERP: Connection timeout
Stock check failed for PROD-ESP-001: Network error
```

## Deployment

### Environment Variables for Production

Set these in your deployment platform (Railway, etc.):

```env
NODE_ENV=production
ERP_ENABLED=true
ERPNEXT_URL=https://erp.yourcompany.com
ERPNEXT_API_KEY=production-key
ERPNEXT_API_SECRET=production-secret
ADMIN_TOKEN=secure-admin-token
```

### Railway Deployment

Since ERPNext can't run on Railway, deploy it separately:

1. **NRP POS**: Deploy on Railway with enhanced server
2. **ERPNext**: Deploy on VPS or Frappe Cloud
3. **Connection**: Configure ERPNext URL in Railway environment

## Troubleshooting

### ERP Connection Failed

1. Check `.env` configuration
2. Verify ERPNext URL is accessible
3. Confirm API credentials are correct
4. Check firewall/network settings

### Orders Not Syncing

1. Check server logs for errors
2. Verify menu-ERP mapping exists
3. Ensure products exist in ERPNext
4. Check ERPNext permissions

### Stock Always Shows Available

1. Verify ERP_ENABLED=true
2. Check product codes in mapping
3. Confirm stock tracking enabled in ERPNext
4. Review warehouse configuration

## Security Notes

1. **Admin Token**: Generate secure random token
2. **API Keys**: Never commit to git
3. **HTTPS**: Always use HTTPS for ERPNext
4. **Validation**: Server validates all data before sending to ERP
5. **Fallback**: System works without ERP access