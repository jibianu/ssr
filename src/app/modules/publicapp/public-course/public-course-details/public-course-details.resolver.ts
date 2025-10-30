import { inject } from "@angular/core";
import { RedirectCommand, ResolveFn, Router, UrlTree } from "@angular/router";
import { PublicAppService } from "../../publicapp.service";
import { catchError, map } from "rxjs/operators";
import { redirectToNotFoundPage } from "src/app/core/helpers/redirect-to-not-found";

export const publicCourseDetailsResolver: ResolveFn<unknown> = (snap) => {
    let courseUrl = snap.paramMap.get('url') || '';
    let location = snap.paramMap.get('location');

    if (!courseUrl) {
        const router = inject(Router);
        return redirectToNotFoundPage(router);
    }

    // ✅ FIX: Normalize courseUrl to handle cases where it might include 'course/course/' or 'course/' prefix
    // Remove leading '/' and any 'course/' prefixes
    const originalCourseUrl = courseUrl;
    courseUrl = courseUrl.replace(/^\/+/, '');
    // Remove 'course/course/' prefix if present (more specific first)
    if (courseUrl.startsWith('course/course/')) {
        courseUrl = courseUrl.replace(/^course\/course\//, '');
    } else if (courseUrl.startsWith('course/')) {
        courseUrl = courseUrl.replace(/^course\//, '');
    }
    
    // ✅ FIX: If courseUrl is still "course", it means the route was matched incorrectly
    // This happens when canonicalUrl contains "course/" prefix and routerLink creates /course/course/...
    // In this case, if location is set, treat location as the actual courseUrl
    if (courseUrl === 'course' && location) {
        console.warn(`⚠️ Route mismatch detected: url="${originalCourseUrl}", location="${location}". Treating location as courseUrl.`);
        courseUrl = location;
        location = null; // Clear location since it was actually the course URL
    }

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

