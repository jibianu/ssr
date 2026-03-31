/**
 * Local unified SSR (`npm start` / `dev:ssr`): same baseHref `/` as `unified`, but API points at the
 * local ASP.NET backend. Do not use for production — use `environment.unified.prod.ts` instead.
 */
export const environment = {
  production: true,
  apiUrl: 'https://localhost:52287/',
  publicCourseSiteUrl: 'http://localhost:4200',
  forcePublicCourseIframe: false,
  exploreOpenMarketingSiteInSameTab: false,
  oauthKey: '9001690783-2at0k49u0nkoe8qb3ucn8d76qv9ls073.apps.googleusercontent.com',
  seoUrl: 'http://localhost:4200/',
  imgUrl: 'https://via.placeholder.com/468x300',
  logoUrl: '',
  certificateBrandName: 'Oil and Gas Club',
  stripeKey: 'pk_live_N0CVrqPSTq9ECjQxRSODpGUE00Jg3I2H71',
  cognitoHostedUiDomain: 'https://your-domain.auth.us-east-1.amazoncognito.com',
  cognitoClientId: '',
  cognitoRedirectUri: 'http://localhost:4200/callback',
  googleRedirectUri: 'http://localhost:4200/google-callback'
};
