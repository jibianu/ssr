import { AdminAppService } from '../../modules/adminapp/adminapp.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CourseGuard implements CanActivate {
    constructor(private adminAppService: AdminAppService, private router: Router) { }
    canActivate(_next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        // debugger
        return this._canActivate(_next, state);
    }

    _canActivate(_next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.adminAppService.getBlogByCanonicalURL(_next.params.url).pipe(
            switchMap(post => {
                
                if (post) {
                    return of(true);
                } else {
                    
                    this.router.navigate(['page-not-found']);
                }
                return of(false);
            }),
            catchError((err) => {
                this.router.navigate(['page-not-found']);
                return of(false);
              }),
        );
    }
}
