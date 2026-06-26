
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  private readonly loginRoute = '/login';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuthentication(state.url);
  }

  private checkAuthentication(returnUrl: string): boolean | UrlTree {
    this.authenticationService.ensureTokensLoaded();

    const hasValidToken = this.authenticationService.hasValidAccessToken();
    const idToken = this.authenticationService.getIdToken();

    if (hasValidToken || idToken) {
      return true;
    }

    this.authenticationService.logout();
    return this.createLoginUrlTree(returnUrl);
  }

  private createLoginUrlTree(returnUrl: string): UrlTree {
    return this.router.createUrlTree([this.loginRoute], {
      queryParams: { returnUrl }
    });
  }
}
