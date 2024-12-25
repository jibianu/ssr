import { PublicAppService } from './../../modules/publicapp/publicapp.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class CourseLocationGuard implements CanActivate {
    constructor(private publicAppService: PublicAppService, private router: Router) { }
    canActivate(_next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this._canActivate(_next, state);
    }

    _canActivate(_next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.publicAppService.getCourseByCanonicalLocationURL(_next.params.url, _next.params.location).pipe(
            
            switchMap(post => {
                if (post) {
                    return of(true);
                } else {
                    this.router.navigate(['error/page-not-found']);
                }
                return of(false);
            }),
            catchError((err) => {
                
                this.router.navigate(['error/page-not-found']);
                return of(false);
              }),
        );
    }
}
