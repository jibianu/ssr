/**
 * Development Environment Configuration
 * 
 * This file is used when running: ng serve or ng build (without --configuration production)
 * For production builds, see: environment.prod.ts
 */
export const environment = {
  production: false,
  // Local backend URL - matches backend launchSettings.json
  // Backend exposes: HTTP on port 52056, HTTPS on port 52055
  // Using HTTP to avoid SSL certificate issues in development
  // To use HTTPS: change to 'https://localhost:52055/'
  apiUrl: 'http://localhost:52056/',
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300'
};