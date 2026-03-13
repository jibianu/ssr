import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthGuard } from './auth.guard';

const UUID_LIKE_REGEX = /^[0-9a-fA-F]{8,9}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function looksLikeCourseId(param: string | null): boolean {
  if (!param || typeof param !== 'string') return false;
  const t = param.trim();
  if (/^\d+$/.test(t)) return true; // numeric ID
  if (UUID_LIKE_REGEX.test(t)) return true; // UUID-like (e.g. 8-4-4-4-12 or 9-4-4-4-12)
  return false;
}

/**
 * When the route param (e.g. :courseSlug) looks like a course ID (number or GUID),
 * requires authentication and redirects to /login if not logged in.
 * Otherwise allows access (canonical slug route).
 */
@Injectable({ providedIn: 'root' })
export class CourseIdAuthGuard {
  constructor(private authGuard: AuthGuard) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    const param = route.paramMap.get('courseSlug') ?? route.params['courseSlug'] ?? null;
    if (!looksLikeCourseId(param)) return true;
    return this.authGuard.canActivate(route, state) as boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree>;
  }
}
