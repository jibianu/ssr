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
        const currentUser = this.authenticationService.currentUser();
        if (currentUser) {
            return true;
        }
        const token = this.authenticationService.currentToken();
        if (!token) {
            this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
            return false;
        }
        // Restore session on refresh: we have token but no currentUser cookie – fetch user and set cookie
        return this.authenticationService.getUserInfo().pipe(
            first(),
            map(() => !!this.authenticationService.currentUser()),
            catchError(() => {
                this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
                return of(false);
            })
        );
    }
}