import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from '../../modules/auth/auth.service';

/**
 * Validates roleId before route activation. Redirects unauthorized access to /unauthorized.
 * Works on page refresh: roleId from memory or from currentUser cookie.
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    const allowedRoles = route.data['roles'] as number[] | undefined;
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }
    const roleId = this.authService.getRoleId();
    if (roleId == null) {
      this.router.navigate(['/unauthorized']);
      return false;
    }
    if (allowedRoles.includes(roleId)) {
      return true;
    }
    this.router.navigate(['/unauthorized']);
    return false;
  }
}
