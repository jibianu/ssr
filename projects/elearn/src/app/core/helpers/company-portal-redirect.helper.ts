import { environment } from 'src/environments/environment';
import { getTenantSubdomainFromHostname } from 'src/app/core/company-portal-host.util';
import { getLandingRoute, PostLoginResponse } from 'src/app/modules/auth/auth.service';
import { normalizeRoleLandingRoute } from 'src/app/core/helpers/app-url.helper';

/** Resolve portal subdomain from getinfo / currentUser payload. */
export function resolveCompanyPortalSubdomain(user: unknown): string | null {
  if (!user || typeof user !== 'object') {
    return null;
  }
  const u = user as Record<string, unknown>;
  const raw =
    u['companyPortalSubdomain'] ??
    u['CompanyPortalSubdomain'] ??
    (u['company'] as Record<string, unknown> | undefined)?.['subdomain'] ??
    (u['Company'] as Record<string, unknown> | undefined)?.['Subdomain'] ??
    '';
  const s = String(raw).trim().toLowerCase();
  return s.length > 0 ? s : null;
}

/**
 * Path on the tenant host after login.
 * Local unified SSR (`*.localhost:4200`) keeps `/app/...` (Elearn mount).
 * Production tenant portals use paths without the `/app` prefix.
 */
export function tenantPortalPathFromRoleRoute(route: string): string {
  const normalized = normalizeRoleLandingRoute(route);
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return normalized;
    }
  }
  const portalHost = environment.companyPortalHost?.trim();
  if (portalHost) {
    return normalized.replace(/^\/app\//, '/');
  }
  return normalized;
}

/** Main marketing / unified origin (no tenant subdomain). */
export function resolveMainPortalOrigin(): string {
  const fromEnv = (environment as { publicCourseSiteUrl?: string }).publicCourseSiteUrl?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

/**
 * Absolute URL for a company tenant portal.
 * Local: http://{sub}.localhost:4200/trainer/course/list
 * Prod: https://{sub}.oilandgasclub.com/...
 */
export function buildCompanyPortalAbsoluteUrl(subdomain: string, roleRoute: string): string | null {
  const sub = (subdomain || '').trim().toLowerCase();
  if (!sub) {
    return null;
  }
  const path = tenantPortalPathFromRoleRoute(roleRoute);
  const portalHost = environment.companyPortalHost?.trim();

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    const port = window.location.port || '4200';
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || !portalHost) {
      const portSuffix = port ? `:${port}` : '';
      return `http://${sub}.localhost${portSuffix}${path}`;
    }
  }

  if (portalHost) {
    return `https://${sub}.${portalHost}${path}`;
  }

  return null;
}

/**
 * After login: send user to their company subdomain when configured.
 * Users without a subdomain stay on the main portal (never forced onto a tenant host).
 */
export function tryRedirectToCompanyPortalAfterLogin(
  res: PostLoginResponse,
  user: unknown,
  returnUrl?: string
): boolean {
  if (typeof window === 'undefined' || !res?.isValidUser) {
    return false;
  }
  if (returnUrl?.trim()) {
    return false;
  }

  const route = getLandingRoute(res);
  if (!route) {
    return false;
  }

  const subdomain = resolveCompanyPortalSubdomain(user);
  const currentTenant = getTenantSubdomainFromHostname(window.location.hostname);
  const mainOrigin = resolveMainPortalOrigin();

  if (subdomain) {
    if (currentTenant && currentTenant.toLowerCase() === subdomain) {
      return false;
    }
    const tenantUrl = buildCompanyPortalAbsoluteUrl(subdomain, route);
    if (tenantUrl) {
      window.location.href = tenantUrl;
      return true;
    }
    return false;
  }

  // Logged in on a tenant host but user has no company subdomain → main site only
  if (currentTenant && mainOrigin) {
    window.location.href = `${mainOrigin}${tenantPortalPathFromRoleRoute(route)}`;
    return true;
  }

  return false;
}
