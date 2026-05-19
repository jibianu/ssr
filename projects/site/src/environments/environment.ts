/**
 * Development environment (ng serve / non-production build).
 *
 * API URL: only this `apiUrl` is used in dev — `assets/config.json` is not fetched
 * (`loadApiUrl` in api-url.config.ts skips the fetch when `!environment.production`).
 *
 * Production builds use `environment.prod.ts` (or unified) and may load `config.json`;
 * localhost in `config.json` is ignored on non-localhost hosts in favor of the prod `apiUrl`.
 */
export const environment = {
  production: false,
  // Backend origin (trailing slash). Routes are absolute from this root: api/..., page/course/..., not only /api.
    apiUrl: 'http://localhost:52288/',
  // Elearn app URL (merged e-learning) – dev runs on port 4201
  elearnAppUrl: 'http://localhost:4201',
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300',
  logoUrl: 'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/logo/oilandgas_club.svg'
};