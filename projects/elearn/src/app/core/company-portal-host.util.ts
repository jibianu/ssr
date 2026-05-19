import { environment } from 'src/environments/environment';

/**
 * Host labels that are not company-tenant portals when under {@link environment.companyPortalHost}
 * (consumer / infra hosts on the same registrable domain).
 */
const RESERVED_COMPANY_PORTAL_LABELS = new Set([
  'www',
  'api',
  'app',
  'mail',
  'admin',
  'cdn',
  'static',
  'login',
  'register',
  'elearn',
  'dev',
  'test',
  'staging',
  'prod',
  'coursebackend',
  'courses',
  'support',
  'help',
  'status',
  'blog',
  'docs'
]);

/**
 * True when the app is served on a company tenant host (custom subdomain), e.g.
 * `http://anu.localhost:4200` or `https://acme-corp.oilandgasclub.com`.
 * Plain `localhost` / apex marketing hosts are false.
 */
export function isCompanyTenantLoginHost(hostname: string): boolean {
  const h = (hostname || '').trim().toLowerCase();
  if (!h) {
    return false;
  }

  // Chrome / dev: {tenant}.localhost
  if (h.endsWith('.localhost')) {
    const label = h.slice(0, -'.localhost'.length);
    return label.length > 0;
  }

  const portal = (environment.companyPortalHost || '').trim().toLowerCase();
  if (!portal) {
    return false;
  }

  const suffix = '.' + portal;
  if (!h.endsWith(suffix) || h.length <= suffix.length) {
    return false;
  }

  const label = h.slice(0, -suffix.length);
  if (!label || label.includes('.')) {
    return false;
  }

  return !RESERVED_COMPANY_PORTAL_LABELS.has(label);
}

/**
 * Returns the tenant subdomain label when {@link isCompanyTenantLoginHost} is true (e.g. `anu` for `anu.localhost`).
 */
export function getTenantSubdomainFromHostname(hostname: string): string | null {
  if (!isCompanyTenantLoginHost(hostname)) {
    return null;
  }
  const h = (hostname || '').trim().toLowerCase();
  if (h.endsWith('.localhost')) {
    const label = h.slice(0, -'.localhost'.length);
    return label.length > 0 ? label : null;
  }
  const portal = (environment.companyPortalHost || '').trim().toLowerCase();
  if (!portal) {
    return null;
  }
  const suffix = '.' + portal;
  const label = h.slice(0, -suffix.length);
  return label.length > 0 ? label : null;
}
