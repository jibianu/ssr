/**
 * Production build default (`ng build site --configuration production`).
 * `apiUrl` is baked into the bundle and used as fallback when `config.json` is missing
 * or when it points to localhost while the site runs on a public hostname (see sanitizeApiUrlForRuntime).
 */
export const environment = {
  production: true,
  apiUrl: 'https://coursebackend.oilandgasclub.com/',
  // Elearn app (merged e-learning) – same origin, base path /Elearn/
  elearnAppUrl: '/course',
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300',
  logoUrl: 'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/logo/oilandgas_club.svg'
};
