import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from "@angular/router";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";
import { AdminAppService } from "src/app/modules/adminapp/adminapp.service";

@Injectable({
    providedIn: 'root'
  })
export class CourseResoverService {
    constructor(private adminService: AdminAppService,private router: Router) {}
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        // throw new Error("Method not implemented.");
        // console.log(route.params.url);
       return this.adminService.getBlogByCanonicalURL(route.params.url)
       .pipe(
        catchError(er=>{
            this.router.navigate(['page-not-found'])
            return of("no data");
        })
       )
    }

}