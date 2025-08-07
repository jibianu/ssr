import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CookieService } from '../services/cookie.service';

@Injectable({ providedIn: 'root' })
export class InternalAuthGuard  {
    private readonly adminRestrictedRoutes = [
        'user',
        'category',
        'location'
    ];

    constructor(
        private router: Router,
        private cookieService: CookieService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        try {
            const currentUser = this.getCurrentUser();
            
            if (!currentUser) {
                this.redirectToLogin();
                return false;
            }

            if (!this.isAdminUser(currentUser) && this.isRestrictedRoute(state.url)) {
                this.redirectToDefault();
                return false;
            }

            return true;
        } catch (error) {
            console.error('AuthGuard error:', error);
            this.redirectToLogin();
            return false;
        }
    }

    private getCurrentUser(): any {
        const userCookie = this.cookieService.getCookie('currentUser');
        return userCookie ? JSON.parse(userCookie) : null;
    }

    private isAdminUser(user: any): boolean {
        return user.isAdmin === true;
    }

    private isRestrictedRoute(url: string): boolean {
        return this.adminRestrictedRoutes.some(route => url.includes(route));
    }

    private redirectToLogin(): void {
        this.router.navigate(['/login']); // Adjust to your login route
    }

    private redirectToDefault(): void {
        this.router.navigate(['/app/course']);
    }
}