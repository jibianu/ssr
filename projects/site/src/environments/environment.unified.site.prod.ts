/**
 * Unified domain: public site at https://oilandgasclub.com/ and Elearn at https://oilandgasclub.com/course/
 * Build: ng build site --configuration unified
 */
export const environment = {
  production: true,
  apiUrl: 'https://coursebackend.oilandgasclub.com/',
  elearnAppUrl: '/course',
  seoUrl: 'https://oilandgasclub.com/',
  imgUrl: 'https://via.placeholder.com/468x300',
  logoUrl: 'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/logo/oilandgas_club.svg',
  mediaCdnUrl: '' as string | undefined,
  mediaCdnWebpSuffix: '' as string | undefined,
};
