
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
  // The proxy.conf.json forwards /api/* requests to http://localhost:52045/* (removes /api prefix)
  // This avoids CORS issues - no CORS configuration needed in .NET backend
  // Production uses full URL (see environment.prod.ts)
  
  // ✅ LOCAL DEVELOPMENT: Use proxy to connect to local .NET backend on port 52045
  // The proxy handles CORS automatically - frontend calls /api/*, proxy forwards to backend
  // Make sure to run: ng serve (not ng serve --no-proxy)
  apiUrl: '/api/',
  
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};


// function (browser or server?) => enviroment
// function (dev or prod) => enviroment

// function (browser or server?, dev or prod)  => final enviroment