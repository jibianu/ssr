import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { Role } from '../../shared/models/role';

/**
 * Blocks Trainer from accessing certificate (and categories) in shared module.
 * Redirects to the same area's dashboard (e.g. /app/trainer/dashboard).
 */
@Injectable({ providedIn: 'root' })
export class TrainerBlockCertificateGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const roleId = this.authService.getRoleId();
    if (roleId !== Role.Trainer) {
      return true;
    }
    const url = state.url;
    const dashboardUrl = url.replace(/\/(certificate|categories)(\/.*)?$/i, '/dashboard');
    return this.router.parseUrl(dashboardUrl);
  }
}
