import { AuthenticationService } from './../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { first, map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService
    ) { }

    canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> {
        const currentUrl = this.router.url?.split('?')[0] ?? '';
        const isAuthShellRoute =
            /^\/(login|register|callback|google-callback|forget-password|verification|fg-code|change-password|user-unavailable)(?:\/|$|\?)/.test(currentUrl) ||
            /^\/register\//.test(currentUrl) ||
            /^\/register-/.test(currentUrl);
        const currentUser = this.authenticationService.currentUser();
        if (currentUser) {
            return true;
        }
        const token = this.authenticationService.currentToken();
        if (!token) {
            // Avoid navigation loops if guard runs while already on login route.
            if (isAuthShellRoute) return false;
            this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
            return false;
        }
        // Restore session on refresh: we have token but no currentUser cookie – fetch user and set cookie
        return this.authenticationService.getUserInfo().pipe(
            first(),
            map(() => !!this.authenticationService.currentUser()),
            catchError(() => {
                if (isAuthShellRoute) return of(false);
                this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
                return of(false);
            })
        );
    }
}