/**
 * Development Environment Configuration
 * 
 * This file is used when running: ng serve or ng build (without --configuration production)
 * For production builds, see: environment.prod.ts
 */
export const environment = {
  production: false,
  // Backend origin (trailing slash). Routes are absolute from this root: api/..., page/course/..., not only /api.
  apiUrl: 'https://localhost:52287/',
  // Elearn app URL (merged e-learning) – dev runs on port 4201
  elearnAppUrl: 'http://localhost:4201',
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300',
  logoUrl: 'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/logo/oilandgas_club.svg'
};