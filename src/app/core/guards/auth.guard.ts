
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  private readonly loginRoute = '/auth/login';

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
    if (this.authenticationService.hasValidAccessToken()) {
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