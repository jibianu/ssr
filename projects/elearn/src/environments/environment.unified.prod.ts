/**
 * Unified domain: Elearn served under https://oilandgasclub.com/course/ (baseHref /course/)
 * Build: ng build elearn --configuration unified
 * Update Cognito / Google OAuth redirect URIs to include .../course/auth/...
 */
export const environment = {
  production: true,
  apiUrl: 'https://coursebackend.oilandgasclub.com/',
  publicCourseSiteUrl: 'https://oilandgasclub.com',
  forcePublicCourseIframe: false,
  exploreOpenMarketingSiteInSameTab: false,
  oauthKey: '9001690783-2at0k49u0nkoe8qb3ucn8d76qv9ls073.apps.googleusercontent.com',
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300',
  logoUrl: '',
  certificateBrandName: 'Oil and Gas Club',
  stripeKey: 'pk_live_N0CVrqPSTq9ECjQxRSODpGUE00Jg3I2H71',
  cognitoHostedUiDomain: 'https://your-domain.auth.us-east-1.amazoncognito.com',
  cognitoClientId: '',
  cognitoRedirectUri: 'https://oilandgasclub.com/course/auth/callback',
  googleRedirectUri: 'https://oilandgasclub.com/course/auth/google-callback'
};
