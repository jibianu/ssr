import { SeoData } from '../service/seo.service';

/**
 * Interface for route data that includes SEO information
 * This can be used in route configurations to define SEO data
 */
export interface RouteSeoData {
  seo?: SeoData;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoImage?: string;
  seoCanonicalUrl?: string;
  seoRobots?: string;
}

/**
 * Extended route data interface that includes SEO
 */
export interface RouteData extends RouteSeoData {
  [key: string]: any;
}
