import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { isCompanyTenantLoginHost } from 'src/app/core/company-portal-host.util';
import { Role } from 'src/app/shared/models/role';

/**
 * Tenant company admin id for the current user (cookie or getinfo), or null.
 * Company admins: tenant id is their user id (matches backend ResolveViewerTenantCompanyIdAsync).
 */
export function resolveViewerTenantCompanyId$(auth: AuthenticationService): Observable<string | null> {
  const u = auth.currentUser();
  const fromCookie = u?.companyId ?? u?.CompanyId;
  if (fromCookie != null && String(fromCookie).trim() !== '') {
    return of(String(fromCookie));
  }
  const roleId = auth.getRoleId() ?? u?.roleId ?? u?.RoleId;
  if (roleId === Role.Company) {
    const selfId = u?.id ?? u?.Id ?? u?.userId ?? u?.UserId;
    if (selfId != null && String(selfId).trim() !== '') {
      return of(String(selfId));
    }
  }
  if (typeof window === 'undefined' || !isCompanyTenantLoginHost(window.location.hostname)) {
    return of(null);
  }
  if (!auth.currentToken()) {
    return of(null);
  }
  return auth.getUserInfo().pipe(
    map((user: any) => {
      const cid = user?.companyId ?? user?.CompanyId;
      if (cid != null && String(cid).trim() !== '') {
        return String(cid);
      }
      const r = user?.roleId ?? user?.RoleId;
      if (r === Role.Company) {
        const uid = user?.id ?? user?.Id ?? user?.userId ?? user?.UserId;
        return uid != null && String(uid).trim() !== '' ? String(uid) : null;
      }
      return null;
    }),
    catchError(() => of(null))
  );
}

/**
 * On company Explore: org-private courses for this tenant first, then others (title order within each group).
 */
export function sortExploreCoursesTenantFirst(courses: any[], tenantCompanyId: string | null): any[] {
  if (!courses?.length) {
    return [];
  }
  if (!tenantCompanyId) {
    return [...courses];
  }
  const tid = tenantCompanyId.toLowerCase();
  const isTenantCourse = (c: any): boolean => {
    const cid = c?.companyId ?? c?.CompanyId;
    return cid != null && String(cid).trim() !== '' && String(cid).toLowerCase() === tid;
  };
  return [...courses].sort((a, b) => {
    const ao = isTenantCourse(a);
    const bo = isTenantCourse(b);
    if (ao !== bo) {
      return ao ? -1 : 1;
    }
    const ta = (a?.title ?? a?.Title ?? '').toString().toLowerCase();
    const tb = (b?.title ?? b?.Title ?? '').toString().toLowerCase();
    return ta.localeCompare(tb);
  });
}
