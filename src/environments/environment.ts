
/**
 * Development Environment Configuration
 * 
 * This file is used when running: ng serve or ng build (without --configuration production)
 * For production builds, see: environment.prod.ts
 * 
 * ✅ RECOMMENDED: Using production backend for development
 * Benefits:
 * - No local backend setup required
 * - Always available
 * - Matches production environment
 * - Works with SSR out of the box
 * - No SSL/CORS configuration needed
 */
export const environment = {
  production: false,
  
  // ✅ PROXY CONFIGURATION: Use /api prefix for proxy in development
  // The proxy.conf.json forwards /api/* requests to https://localhost:52045/*
  // Production uses full URL (see environment.prod.ts)
  
  // ⚠️ FIX: Using production backend to avoid ECONNREFUSED (local backend not running)
  // If you want to use local backend, start it on port 52045 and uncomment the line below
  apiUrl: 'https://coursebackend.oilandgasclub.com/',
  
  // Uncomment below if local backend is running:
  // apiUrl: '/api/',  // This requires backend running on https://localhost:52045
  
  // ⚠️ Alternative: Use local backend directly (requires CORS and SSL setup)
  // See BACKEND_CORS_CONFIGURATION.md for setup instructions
  // apiUrl: 'https://localhost:52045/',
  // apiUrl: 'http://localhost:52045/',  // Use HTTP if SSL certificate issues occur
  
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};


// function (browser or server?) => enviroment
// function (dev or prod) => enviroment

// function (browser or server?, dev or prod)  => final enviroment