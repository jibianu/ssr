import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class InternalAuthGuard {
  private readonly adminRestrictedRoutes = ['user', 'category', 'location'];
  private readonly loginUrl = '/login';
  private readonly defaultAdminUrl = '/app/course';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authenticationService.hasValidAccessToken()) {
      this.authenticationService.logout();
      this.redirectToLogin(state.url);
      return false;
    }

    const currentUser = this.authenticationService.currentUser();

    if (!currentUser) {
      this.redirectToLogin(state.url);
      return false;
    }

    if (!this.isAdminUser(currentUser) && this.isRestrictedRoute(state.url)) {
      this.redirectToDefault();
      return false;
    }

    return true;
  }

  private isAdminUser(user: any): boolean {
    return !!user && user.isAdmin === true;
  }

  private isRestrictedRoute(url: string): boolean {
    return this.adminRestrictedRoutes.some(route => url.includes(route));
  }

  private redirectToLogin(returnUrl: string): void {
    this.router.navigate([this.loginUrl], { queryParams: { returnUrl } });
  }

  private redirectToDefault(): void {
    this.router.navigate([this.defaultAdminUrl]);
  }
}