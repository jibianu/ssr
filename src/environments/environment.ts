/**
 * Development Environment Configuration
 * 
 * This file is used when running: ng serve or ng build (without --configuration production)
 * For production builds, see: environment.prod.ts
 */
export const environment = {
  production: false,
  // Local backend URL - matches backend launchSettings.json
  // Backend exposes: HTTP on port 7080
  // Using HTTP to avoid SSL certificate issues in development
 apiUrl: 'http://localhost:5001/',
//  apiUrl: 'https://coursebackend.oilandgasclub.com/',
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300',
  logoUrl: 'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/logo/oilandgas_club.svg'
};