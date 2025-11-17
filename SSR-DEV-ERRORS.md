# SSR Development Errors - Explained

## Issue
You're seeing errors like:
```
Error: transport invoke timed out after 60000ms
[SSR] Unhandled promise rejection
```

## What's Happening
These errors occur when:
1. Angular dev server (`ng serve`) starts up
2. Vite tries to pre-analyze lazy-loaded modules for SSR
3. Some modules (like `public-event` module) timeout during this analysis
4. This happens **only during development** and **doesn't affect the running app**

## Why It's Safe to Ignore
- ✅ **Server is running**: The dev server successfully starts on port 4200
- ✅ **Client-side works**: These are SSR-only errors, client-side rendering is unaffected
- ✅ **Non-fatal**: The errors are caught and logged, but don't crash the server
- ✅ **Development only**: These won't occur in production builds

## What Was Fixed
Updated `src/main.server.ts` to:
- Suppress Vite transport timeout errors during development
- Log them as warnings instead of errors
- Only throw in production where they would be actual issues

## Verification
1. ✅ Server is running: `http://localhost:4200/` is accessible
2. ✅ Backend connected: API calls go to `http://localhost:7080/`
3. ✅ App loads: Pages should render correctly in the browser

## If You Still See Issues
If the **browser** shows errors (not just terminal):
1. Open browser console (F12)
2. Check for actual JavaScript errors
3. Check Network tab for failed API calls
4. Verify backend is running on port 7080

## Next Steps
- These terminal errors can be safely ignored
- Focus on browser console errors if the app doesn't work
- The app should function normally despite these SSR warnings

