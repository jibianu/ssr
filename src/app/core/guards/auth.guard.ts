
import { AuthenticationService } from '../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard  {
    private readonly loginRoute = '/auth/login';

    constructor(
        private router: Router,
        private authenticationService: AuthenticationService
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.checkAuthentication(state.url);
    }

    private checkAuthentication(returnUrl: string): boolean | UrlTree {
        if (this.isAuthenticated()) {
            return true;
        }
        
        return this.createLoginUrlTree(returnUrl);
    }

    private isAuthenticated(): boolean {
        return !!this.authenticationService.currentUser();
    }

    private createLoginUrlTree(returnUrl: string): UrlTree {
        return this.router.createUrlTree(
            [this.loginRoute],
            { queryParams: { returnUrl } }
        );
    }
}