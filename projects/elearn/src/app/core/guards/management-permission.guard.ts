import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';
import { Role } from '../../shared/models/role';

/** Path segment to required permission. Null = always allow for Management. */
const PATH_TO_PERMISSION: Record<string, string | null> = {
  students: 'StudentList',
  trainers: null,
  companies: 'CompanyList',
  management: 'ManagementList',
  category: 'CategoryList',
  course: 'CourseList',
  profile: null,
  dashboard: null,
};

@Injectable({ providedIn: 'root' })
export class ManagementPermissionGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private appService: AdminAppService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const roleId = this.authService.getRoleId();
    if (roleId !== Role.Manager) {
      return of(true); // Only applies to Management users
    }

    const url = state.url || '';
    if (!url.includes('/management')) {
      return of(true);
    }

    const segments = url.split('/').filter(Boolean);
    const managementIdx = segments.indexOf('management');
    const pathSegment = segments[managementIdx + 1] || '';

    const requiredPerm = PATH_TO_PERMISSION[pathSegment];
    if (requiredPerm === null || requiredPerm === undefined) {
      return of(true); // profile, dashboard, or unknown - allow
    }

    return this.appService.getMyManagementPermissions().pipe(
      map((perms: string[]) => {
        const allowed = new Set(perms || []);
        if (allowed.has(requiredPerm)) {
          return true;
        }
        this.router.navigate(['/app/management/dashboard']);
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/app/management/dashboard']);
        return of(false);
      })
    );
  }
}
