import { inject } from "@angular/core";
import { RedirectCommand, ResolveFn, Router, UrlTree } from "@angular/router";
import { PublicAppService } from "../../publicapp.service";
import { catchError, map } from "rxjs/operators";
import { redirectToNotFoundPage } from "src/app/core/helpers/redirect-to-not-found";

export const publicCourseDetailsResolver: ResolveFn<unknown> = (snap) => {
    const courseUrl = snap.paramMap.get('url');
    const location = snap.paramMap.get('location');

    const publicAppService = inject(PublicAppService);
    const router = inject(Router);

    const course$ = location ?
        publicAppService.getCourseByCanonicalLocationURL(courseUrl, location):
        publicAppService.getCourseByCanonicalURL(courseUrl);

    return course$
        .pipe(
            map(course => {
                if (!course) {
                    throw new Error('Course not found');
                }
                return course;
            }),
            catchError(() => redirectToNotFoundPage(router))
        );


}

