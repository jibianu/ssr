export const environment = {
  production: true,
  apiUrl: 'https://coursebackend.oilandgasclub.com/',
  /** Base URL of the site app (SSR). All public course URLs are /courses/:slug on the site. Redirect from old Elearn route uses this. */
  publicCourseSiteUrl: 'https://www.oilandgasclub.com',
  forcePublicCourseIframe: false,
  exploreOpenMarketingSiteInSameTab: false,
  oauthKey: '9001690783-2at0k49u0nkoe8qb3ucn8d76qv9ls073.apps.googleusercontent.com',
  seoUrl: 'https://elearn.oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300',
  logoUrl: '',
  certificateBrandName: 'Oil and Gas Club',
  stripeKey: 'pk_live_N0CVrqPSTq9ECjQxRSODpGUE00Jg3I2H71',
  cognitoHostedUiDomain: 'https://your-domain.auth.us-east-1.amazoncognito.com',
  cognitoClientId: '',
  cognitoRedirectUri: 'https://elearn.oilandgasclub.com/Elearn/callback',
  /** Tenant apex for company portals. With companyPortalLoginPath=/login → https://{subdomain}.oilandgasclub.com/login after register. */
  companyPortalHost: 'oilandgasclub.com' as string | undefined,
  companyPortalLoginPath: '/login',
  googleRedirectUri: 'https://elearn.oilandgasclub.com/Elearn/google-callback'
};
