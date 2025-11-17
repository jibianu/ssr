# Troubleshooting: localhost:4200 Not Loading

## Problem
Empty HAR log (no network requests) when accessing `http://localhost:4200/`

## Solution Steps

### 1. Restart the Angular Dev Server

The server is currently running but may need to be restarted with the new configuration.

**Stop the current server:**
- Press `Ctrl+C` in the terminal where `ng serve` is running
- Or kill the process: `taskkill /PID 12336 /F`

**Start the server again:**
```powershell
cd ssr
pnpm start
```

Or with explicit host binding:
```powershell
cd ssr
pnpm start -- --host 0.0.0.0
```

### 2. Check Browser Console

Open `http://localhost:4200/` in your browser and check the **Developer Console** (F12) for:
- JavaScript errors
- Network errors
- Failed resource loads

### 3. Verify Backend is Running

The Angular app needs the backend API at `http://localhost:52056/`:
- Ensure the .NET backend is running
- Test: `http://localhost:52056/api/health` (or similar endpoint)

### 4. Clear Browser Cache

Sometimes cached errors can prevent loading:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

### 5. Check Firewall/Antivirus

Windows Firewall or antivirus might be blocking Node.js:
- Allow Node.js through Windows Firewall
- Check antivirus logs for blocked connections

### 6. Try Different Browser/Incognito

Test in:
- Incognito/Private mode
- Different browser (Chrome, Firefox, Edge)

### 7. Check Angular Build Errors

If the server starts but shows errors:
```powershell
cd ssr
pnpm run build:dev
```

Look for TypeScript compilation errors.

## Common Issues

### Issue: "Cannot GET /"
- **Cause**: Server not serving index.html correctly
- **Fix**: Check `angular.json` serve configuration

### Issue: Blank white page
- **Cause**: JavaScript error preventing bootstrap
- **Fix**: Check browser console for errors

### Issue: "ERR_CONNECTION_REFUSED"
- **Cause**: Server not running or wrong port
- **Fix**: Verify server is running on port 4200

### Issue: APP_INITIALIZER hanging
- **Cause**: `config.json` fetch failing or timeout
- **Fix**: Check network tab for failed `/assets/config.json` request

## Verification

After restarting, you should see:
1. Server logs: "✔ Compiled successfully"
2. Browser console: No red errors
3. Network tab: Requests to `localhost:4200` with 200 status
4. Page loads: Home page or login page appears

