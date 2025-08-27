# Railway Deployment Instructions

## ✅ Already Completed (Local Setup)
- Express server created with API routes
- Dockerfile configured for Node.js production deployment
- Dependencies installed and tested locally
- Production build tested successfully
- Server tested at http://localhost:3000
- All deployment files committed to git

## 📋 Steps You Need to Complete

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Sign Up/Login to Railway
- Go to [railway.app](https://railway.app)
- Sign up or login with GitHub

### 3. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Authorize Railway to access your GitHub account
- Select your `nrp` repository

### 4. Configure Deployment (Optional)
Railway will auto-detect the Dockerfile, but you can configure:

**Environment Variables (if needed):**
- Click on your service
- Go to "Variables" tab
- Add any required variables:
  ```
  NODE_ENV=production
  # Add any API keys or database URLs here
  ```

### 5. Deploy
- Railway will automatically:
  1. Build the Docker image
  2. Run `npm install`
  3. Run `npm run build`
  4. Start server with `npm start`
  5. Provide you with a URL like: `https://nrp-pos-production.up.railway.app`

### 6. Custom Domain (Optional)
- In Railway dashboard → Settings → Domains
- Add your custom domain
- Update DNS records as instructed

## 🔧 Server Features Available

Your Express server includes:
- `/api/health` - Health check endpoint
- `/api/menu` - Menu data endpoint
- `/api/orders` - Orders data endpoint
- Static file serving with caching
- SPA routing for both `/index-dyn.html` and `/index-ssg.html`
- Compression and security headers

## 🚀 Testing Your Deployment

Once deployed, test:
```bash
# Health check
curl https://your-app.railway.app/api/health

# Menu API
curl https://your-app.railway.app/api/menu

# Main app
open https://your-app.railway.app
```

## 📊 Monitoring
- Railway provides logs in the dashboard
- Click on your service → "Deployments" → View logs
- Monitor usage in the "Usage" tab

## 🔄 Future Updates
To deploy updates:
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Railway will auto-deploy on push to main branch.

## ⚠️ Important Notes
- Railway's free tier includes 500 hours/month + $5 credit
- The app uses ~25MB RAM in production
- Dockerfile creates optimized image (~150MB)
- Server runs as non-root user for security

## 🆘 Troubleshooting
If deployment fails:
1. Check Railway deployment logs
2. Ensure all dependencies are in package.json
3. Verify Dockerfile builds locally: `docker build -t nrp-pos .`
4. Check for any hardcoded localhost URLs in code