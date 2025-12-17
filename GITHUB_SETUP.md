# Budget App - GitHub Setup Guide

## Setup Instructions for GitHub Pages Hosting

### Step 1: Initialize Git Repository (if not already done)
```bash
cd /workspaces/budget-app
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Step 2: Add all files
```bash
git add .
git commit -m "Initial commit: Budget app with PWA support"
```

### Step 3: Create GitHub Repository
1. Go to https://github.com/new
2. Create a repository named `budget-app`
3. Copy the HTTPS URL

### Step 4: Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/budget-app.git
git branch -M main
git push -u origin main
```

### Step 5: Enable GitHub Pages
1. Go to your repository on GitHub
2. Go to **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose **main** branch and **/root** folder
5. Click **Save**
6. Wait a few minutes for deployment
7. Your app will be available at: `https://YOUR_USERNAME.github.io/budget-app/`

### Step 6: Update Firebase Configuration (Optional)
If you get CORS or authentication errors:
1. Go to Firebase Console (https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add `YOUR_USERNAME.github.io`

## Features Enabled

✅ **Progressive Web App (PWA)**
- Install as native app on phones
- Works offline with cached data
- Fast loading with service worker
- Add to home screen on mobile

✅ **Mobile Optimized**
- Touch-friendly buttons
- Responsive design
- Full-screen mode
- iOS support (Apple Touch Icon)

✅ **Offline Support**
- Firebase will still work when online
- Cached assets load even offline
- Real-time sync when connection returns

## Installation on Mobile

### Android
1. Open the app in Chrome browser
2. Tap menu (⋮) → "Install app" or "Add to Home screen"
3. App will appear on home screen

### iOS
1. Open app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Choose a name and add

## Troubleshooting

**App not appearing in install prompt?**
- Ensure you're using HTTPS (GitHub Pages is HTTPS)
- Check browser console for errors
- Clear browser cache and reload

**Firebase not working after hosting?**
- Update authorized domains in Firebase Console
- Check CORS settings if needed

**Offline not working?**
- Service worker needs HTTPS
- Check browser support (most modern browsers support it)

## Deploy Updates

After making changes:
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Changes will deploy automatically within a few minutes!

## More Info
- PWA Docs: https://web.dev/progressive-web-apps/
- GitHub Pages Docs: https://pages.github.com/
- Service Workers: https://developers.google.com/web/tools/chrome-devtools/progressive-web-apps
