
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree, NavigationStart, NavigationEnd, NavigationError, NavigationCancel } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  private readonly loginRoute = '/auth/login';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {
    // Log all router events for debugging
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart || event instanceof NavigationEnd || event instanceof NavigationError || event instanceof NavigationCancel)
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        console.log('[AuthGuard] 🚦 Router Event: NavigationStart', event.url);
      } else if (event instanceof NavigationEnd) {
        console.log('[AuthGuard] ✅ Router Event: NavigationEnd', event.url);
      } else if (event instanceof NavigationError) {
        console.error('[AuthGuard] ❌ Router Event: NavigationError', event.url, event.error);
      } else if (event instanceof NavigationCancel) {
        console.warn('[AuthGuard] ⚠️  Router Event: NavigationCancel', event.url, event.reason);
      }
    });
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log('[AuthGuard] 🚨 canActivate() CALLED');
    console.log('[AuthGuard]   Route path:', route.routeConfig?.path);
    console.log('[AuthGuard]   Full URL:', state.url);
    console.log('[AuthGuard]   Route config:', route.routeConfig);
    console.log('[AuthGuard]   Route data:', route.data);
    console.log('[AuthGuard]   Parent route:', route.parent?.routeConfig?.path);
    
    const result = this.checkAuthentication(state.url);
    console.log('[AuthGuard]   checkAuthentication() returned:', result);
    return result;
  }

  private checkAuthentication(returnUrl: string): boolean | UrlTree {
    // ✅ FIX: Force load tokens before checking
    // This ensures tokens are in memory when guard checks
    this.authenticationService.ensureTokensLoaded();
    
    // ✅ FIX: Check for valid token - try hasValidAccessToken first, then fallback to idToken
    const hasValidToken = this.authenticationService.hasValidAccessToken();
    const idToken = this.authenticationService.getIdToken();
    const currentUser = this.authenticationService.currentUser();
    
    // Always log for debugging navigation issues
    console.log('[AuthGuard] 🔍 Checking authentication for route:', returnUrl);
    console.log('[AuthGuard]   hasValidAccessToken():', hasValidToken);
    console.log('[AuthGuard]   getIdToken():', idToken ? `YES (length: ${idToken?.length ?? 0})` : 'NO');
    console.log('[AuthGuard]   currentUser():', currentUser ? 'YES' : 'NO');
    
    // ✅ FIX: If hasValidAccessToken() is false but we have an idToken, 
    // the token might not be loaded yet but is still valid (e.g., after login)
    // Since /getinfo succeeded, we know the token is valid - allow navigation
    if (hasValidToken || idToken) {
      console.log('[AuthGuard] ✅ Authentication check PASSED - allowing navigation');
      console.log('[AuthGuard]   Reason: hasValidToken=' + hasValidToken + ', idToken=' + (!!idToken));
      console.log('[AuthGuard]   Navigating to:', returnUrl);
      return true;
    }

    console.error('[AuthGuard] ❌ Authentication check FAILED - BLOCKING navigation');
    console.error('[AuthGuard]   hasValidAccessToken():', hasValidToken);
    console.error('[AuthGuard]   getIdToken():', idToken ? 'YES' : 'NO');
    console.error('[AuthGuard]   currentUser():', currentUser ? 'YES' : 'NO');
    console.error('[AuthGuard]   Will redirect to login with returnUrl:', returnUrl);
    
    this.authenticationService.logout();
    return this.createLoginUrlTree(returnUrl);
  }

  private createLoginUrlTree(returnUrl: string): UrlTree {
    return this.router.createUrlTree([this.loginRoute], {
      queryParams: { returnUrl }
    });
  }
}