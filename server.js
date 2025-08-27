import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression
app.use(compression());

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
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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

// Handle SPA routing - serve index-dyn.html for all non-API routes
app.get('*', (req, res) => {
  // Check if requesting static version
  if (req.path.startsWith('/static')) {
    res.sendFile(path.join(__dirname, 'dist', 'index-ssg.html'));
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index-dyn.html'));
  }
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