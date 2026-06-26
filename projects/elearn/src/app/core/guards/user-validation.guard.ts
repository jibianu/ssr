import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthenticationService } from '../../modules/auth/auth.service';

/**
 * Validates the logged-in user against api/auth/post-login (SQL role + account status).
 * Cached for 60s to avoid hammering the API on nested route activations.
 */
@Injectable({ providedIn: 'root' })
export class UserValidationGuard implements CanActivate {
  private static readonly VALIDATION_TTL_MS = 60_000;
  private lastValidation: { at: number; valid: boolean } | null = null;

  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> {
    const token = this.authService.currentToken();
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
      return false;
    }

    if (
      this.lastValidation &&
      Date.now() - this.lastValidation.at < UserValidationGuard.VALIDATION_TTL_MS
    ) {
      if (!this.lastValidation.valid) {
        this.router.navigate(['/user-unavailable']);
      }
      return this.lastValidation.valid;
    }

    return this.authService.postLogin().pipe(
      tap((res) => {
        const valid = !!(res?.isValidUser && res.roleId > 0);
        this.lastValidation = { at: Date.now(), valid };
        if (!valid) {
          this.authService.logout();
        }
      }),
      map((res) => {
        const valid = !!(res?.isValidUser && res.roleId > 0);
        if (!valid) {
          this.router.navigate(['/user-unavailable']);
          return false;
        }
        return true;
      }),
      catchError(() => {
        this.lastValidation = { at: Date.now(), valid: false };
        this.authService.logout();
        this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
        return of(false);
      })
    );
  }
}
