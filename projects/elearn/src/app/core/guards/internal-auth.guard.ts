import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, NavigationEnd, NavigationStart } from '@angular/router';
import { CookieService } from '../services/cookie.service';

@Injectable({ providedIn: 'root' })

export class InternalAuthGuard  {
    constructor(
        private router: Router,
        private cookieService: CookieService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const currentUser = JSON.parse(this.cookieService.getCookie('currentUser'));
        const isAdmin = currentUser.isAdmin;
        if (currentUser) {
            if (!isAdmin) {
                if (state.url.includes('user') || state.url.includes('category') || state.url.includes('location')) {
                    this.router.navigate(['/app/course']);
                }
                return true;
            }
            return true;
        } else {
            return false;
        }
    }
}
