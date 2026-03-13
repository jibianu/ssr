import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from '../../modules/auth/auth.service';

/**
 * Stub guard: post-login user validation not in use. Allows all navigation.
 */
@Injectable({ providedIn: 'root' })
export class UserValidationGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    return true;
  }
}
