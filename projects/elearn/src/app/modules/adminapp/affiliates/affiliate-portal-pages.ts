/** Public site pages affiliates can promote (must match backend AffiliatePortalPages catalog). */
export interface AffiliatePortalPageOption {
  pageKey: string;
  title: string;
  pathSlug: string;
}

export const AFFILIATE_PORTAL_PAGES: AffiliatePortalPageOption[] = [
  { pageKey: 'corporate-training', title: 'Corporate Training', pathSlug: 'corporate-training' },
];
