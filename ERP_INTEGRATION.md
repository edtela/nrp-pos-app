# ERPNext Integration Guide for NRP POS

This guide explains how to integrate NRP POS with ERPNext using the `nrp-next` library.

## Architecture Overview

```
NRP POS (Railway)
    ↓
ERP Service Layer (ERP-agnostic)
    ↓
nrp-next Library (IERPAdapter Interface)
    ↓
ERPNext Adapter Implementation
    ↓
ERPNext API (External Server)
```

## Installation

### 1. Install nrp-next as a dependency

```bash
# In your NRP project directory
npm install ../nrp-next

# Or if published to npm
npm install nrp-next
```

### 2. Set up environment variables

Create or update `.env` file in NRP root:

```env
# ERPNext Configuration
ERPNEXT_URL=https://your-instance.erpnext.com
ERPNEXT_API_KEY=your-api-key
ERPNEXT_API_SECRET=your-api-secret
ERPNEXT_COMPANY=Your Company Name
ERPNEXT_WAREHOUSE=Stores - TC
```

### 3. Add TypeScript configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## Integration Steps

### Step 1: Create ERP Service

The ERP service (`src/services/erp-service.ts`) provides an abstraction layer between NRP and any ERP system. It uses the `IERPAdapter` interface, making it easy to swap ERPNext for another ERP in the future.

Key features:
- Singleton pattern for single ERP connection
- Automatic initialization on first use
- Error handling and retry logic
- Data transformation between NRP and ERP formats

### Step 2: Add ERP API Endpoints

Include the ERP integration endpoints in your `server.js`:

```javascript
import { setupERPRoutes } from './server-erp-integration.js';

// After creating Express app
const app = express();

// ... other middleware ...

// Add ERP routes
setupERPRoutes(app);
```

### Step 3: Update Frontend to Use ERP Data

#### Sync Products on Demand

```javascript
// In your menu loading code
async function syncProductsFromERP() {
  try {
    const response = await fetch('/api/erp/sync/products', {
      method: 'POST'
    });
    const result = await response.json();
    
    if (result.success) {
      console.log('Products synced:', result.message);
      // Reload menu data
      await loadMenuData();
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
```

#### Submit Orders to ERP

```javascript
// After order is completed in POS
async function submitOrderToERP(order, items) {
  try {
    const response = await fetch('/api/erp/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, items })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Order submitted to ERP:', result.erpOrderId);
      // Show success message
    }
  } catch (error) {
    console.error('Failed to submit order:', error);
    // Handle error - maybe queue for later
  }
}
```

#### Check Stock Before Adding to Cart

```javascript
async function checkStockBeforeAdd(productId) {
  try {
    const response = await fetch(`/api/erp/stock/${productId}`);
    const result = await response.json();
    
    if (result.success) {
      const stock = result.stock;
      if (stock.availableQuantity > 0) {
        // Add to cart
        return true;
      } else {
        // Show out of stock message
        alert('Product is out of stock');
        return false;
      }
    }
  } catch (error) {
    // If ERP is unavailable, allow adding to cart anyway
    console.warn('Stock check failed, allowing add to cart');
    return true;
  }
}
```

## Available API Endpoints

### Product Management
- `POST /api/erp/sync/products` - Sync all products from ERPNext
- `GET /api/erp/products?category=X&search=Y` - Get filtered products

### Order Management
- `POST /api/erp/order` - Submit order to ERPNext

### Inventory
- `GET /api/erp/stock/:productId` - Check single product stock
- `POST /api/erp/stock/check` - Check multiple products stock

### Customer Management
- `GET /api/erp/customers/search?query=X` - Search customers
- `POST /api/erp/customers` - Create/update customer

### Reporting
- `GET /api/erp/reports/sales?fromDate=X&toDate=Y` - Sales report
- `GET /api/erp/dashboard` - Dashboard metrics

### System
- `GET /api/erp/health` - Check ERP connection status

## Error Handling

The integration is designed to be fault-tolerant:

1. **Connection Failures**: If ERPNext is unavailable, the POS continues to work with cached data
2. **Order Queue**: Failed order submissions can be queued and retried
3. **Stock Checks**: If stock check fails, the system allows the sale but logs a warning
4. **Sync Failures**: Product sync failures are logged but don't crash the system

## Data Flow Examples

### Product Sync Flow
```
1. Admin triggers sync from POS admin panel
2. NRP calls ERPNext to fetch all active products
3. Products are transformed to NRP format
4. Menu data files are updated
5. Frontend reloads menu data
```

### Order Submission Flow
```
1. Customer completes order in POS
2. NRP validates order locally
3. Order is sent to ERPNext via nrp-next
4. ERPNext creates Sales Order
5. Order ID is returned to POS
6. POS shows success confirmation
```

## Customization

### Using a Different ERP

To use a different ERP system:

1. Create a new adapter implementing `IERPAdapter`:

```typescript
import { IERPAdapter } from 'nrp-next';

export class MyERPAdapter implements IERPAdapter {
  // Implement all required methods
  async getProducts() { /* ... */ }
  async createOrder() { /* ... */ }
  // etc...
}
```

2. Update the ERP service to use your adapter:

```typescript
// In erp-service.ts
import { MyERPAdapter } from './my-erp-adapter';

// In initialize method
this.adapter = new MyERPAdapter(erpConfig);
```

### Adding Custom Fields

ERPNext custom fields can be accessed through the `metadata` property:

```typescript
// Product metadata
product.metadata?.custom_field_name

// Order metadata  
order.metadata?.custom_field_name
```

## Deployment Considerations

### Railway Deployment

Since ERPNext cannot be deployed on Railway (due to volume limitations), use this architecture:

1. **NRP POS**: Deploy on Railway
2. **ERPNext**: Deploy on separate VPS or cloud provider
3. **Connection**: Use HTTPS API calls with authentication

### Environment Variables

For production, set these in Railway dashboard:

```
ERPNEXT_URL=https://erp.yourdomain.com
ERPNEXT_API_KEY=production-key
ERPNEXT_API_SECRET=production-secret
```

### Security

1. **Use HTTPS**: Always use HTTPS for ERPNext API
2. **API Keys**: Keep API keys secure, never commit to git
3. **Rate Limiting**: Implement rate limiting on sync endpoints
4. **Validation**: Validate all data before sending to ERP

## Testing

### Manual Testing

1. Check ERP connection:
```bash
curl http://localhost:3000/api/erp/health
```

2. Test product sync:
```bash
curl -X POST http://localhost:3000/api/erp/sync/products
```

3. Test order submission:
```bash
curl -X POST http://localhost:3000/api/erp/order \
  -H "Content-Type: application/json" \
  -d '{"order": {...}, "items": {...}}'
```

### Automated Testing

The nrp-next library includes test utilities:

```typescript
import { ERPNextAdapter } from 'nrp-next';

// Use mock mode for testing
const testAdapter = new ERPNextAdapter({
  url: 'mock://erpnext',
  // ... config
});
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Check ERPNext URL and firewall settings
2. **Authentication failed**: Verify API keys are correct
3. **Timeout errors**: Increase timeout in config
4. **Data mismatch**: Check field mappings in data-mapper.ts

### Debug Mode

Enable debug logging:

```typescript
const erpConfig = {
  // ... other config
  debug: true
};
```

### Logs

Check logs for detailed error information:
- NRP logs: `server.log`
- Browser console for frontend errors
- ERPNext logs on the ERP server

## Support

For issues with:
- **nrp-next library**: Check `/home/edvin/dev/nrp-next/README.md`
- **ERPNext API**: See [ERPNext API docs](https://frappeframework.com/docs/user/en/api)
- **NRP POS**: Check existing NRP documentation