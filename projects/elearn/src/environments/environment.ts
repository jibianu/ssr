// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'https://localhost:52287/',
  /** Base URL of the site app (public course landing). When localhost, Elearn uses native course page (no iframe). */
  publicCourseSiteUrl: 'http://localhost:4200',
  /** Dev only: if true, embed public site (4200) inside Elearn; uses course slug in URL (needs `npm run start:site`). */
  forcePublicCourseIframe: true,
  /**
   * If true, Explore “View course” / Enroll opens the marketing app in this tab (URL = /{slug} on publicCourseSiteUrl).
   * If false (default), stay on Elearn and embed or native page; slug still comes from API for correct course.
   */
  exploreOpenMarketingSiteInSameTab: false,
  oauthKey: '9001690783-2at0k49u0nkoe8qb3ucn8d76qv9ls073.apps.googleusercontent.com',
  seoUrl: 'https://elearn.oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300',
  /** Certificate/brand logo (e.g. S3 public URL: https://your-bucket.s3.region.amazonaws.com/certificate/logo.png) */
  logoUrl: '',
  /** Brand name for certificate page */
  certificateBrandName: 'Oil and Gas Club',
  stripeKey: 'pk_live_N0CVrqPSTq9ECjQxRSODpGUE00Jg3I2H71',
  /** Cognito Hosted UI (Google federation). Must match AWS Cognito domain. */
  cognitoHostedUiDomain: 'https://your-domain.auth.us-east-1.amazoncognito.com',
  cognitoClientId: '',
  /** Redirect URI registered in Cognito app client. Elearn dev runs on 4201. */
  cognitoRedirectUri: 'http://localhost:4201/auth/callback',
  /** Google OAuth redirect URI for code flow (response_type=code). Must match Google Cloud Console. Elearn dev runs on 4201. */
  googleRedirectUri: 'http://localhost:4201/auth/google-callback'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.


