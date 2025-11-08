// ✅ DISABLED: Resolver completely disabled to prevent automatic course API calls
// Course data is now fetched manually via button click in the component
// This file is kept for reference but the resolver is not used in routing

/*
import { inject } from "@angular/core";
import { ResolveFn, Router } from "@angular/router";
import { PublicAppService } from "../../publicapp.service";
import { catchError, map } from "rxjs/operators";
import { throwError, of } from "rxjs";
import { redirectToNotFoundPage } from "src/app/core/helpers/redirect-to-not-found";
import { isNotFoundError, isServerError, getErrorMessages, getErrorStatus } from "src/app/core/utils/error.util";

export const publicCourseDetailsResolver: ResolveFn<unknown> = (snap) => {
    let courseUrl = snap.paramMap.get('url') || '';
    let location = snap.paramMap.get('location');

    // ✅ FIX: Exclude /assets/ paths from course routing
    // /assets/config.json should not be treated as a course URL
    if (courseUrl === 'assets' || courseUrl.startsWith('assets/')) {
        const router = inject(Router);
        console.warn(`⚠️ Blocked routing to assets path: ${courseUrl}`);
        return redirectToNotFoundPage(router);
    }

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

    // ✅ FIX: If location is provided, try course with location first, but fallback to course without location if it fails
    // This handles cases where the route :url/:location matches a course slug followed by another course slug
    if (location) {
        return publicAppService.getCourseByCanonicalLocationURL(courseUrl, location).pipe(
            // ✅ BEST PRACTICE: Handle null response from service (service returns null on error)
            map(course => {
                if (!course) {
                    // If service returned null, throw error to trigger fallback
                    throw { 
                        status: 500, 
                        error: { 
                            StatusCode: 500, 
                            Messages: ['Course not found'] 
                        } 
                    };
                }
                return course;
            }),
            catchError((error) => {
                // ✅ BEST PRACTICE: Use ErrorUtil for consistent error detection
                const messages = getErrorMessages(error);
                const status = getErrorStatus(error); // ✅ FIX: Use utility function for consistent status extraction
                
                // Check if it's a "not found" error (404, or 500 with "not found" message)
                const isNotFound = isNotFoundError(error) || 
                                 (status === 500 && messages.some((msg: string) => 
                                     msg?.toLowerCase().includes('not found') || 
                                     msg?.toLowerCase().includes('course not found')
                                 )) ||
                                 (isServerError(error) && messages.some((msg: string) => 
                                     msg?.toLowerCase().includes('not found') || 
                                     msg?.toLowerCase().includes('course not found')
                                 ));
                
                if (isNotFound) {
                    console.warn(`⚠️ Course "${courseUrl}" with location "${location}" not found. Trying "${location}" as course slug instead.`);
                    // Try treating the "location" as the actual course URL
                    return publicAppService.getCourseByCanonicalURL(location).pipe(
                        map(course => {
                            if (!course) {
                                // ✅ FIX: If fallback also returns null, redirect to 404
                                console.error(`❌ Fallback course "${location}" also not found. Redirecting to 404.`);
                                throw new Error('Course not found');
                            }
                            return course;
                        }),
                        catchError((fallbackError) => {
                            // ✅ FIX: Ensure fallback errors always redirect to 404
                            console.error(`❌ Error fetching fallback course "${location}":`, fallbackError);
                            return redirectToNotFoundPage(router);
                        })
                    );
                }
                // For other errors (network, timeout, etc.), redirect to 404
                console.error(`❌ Non-not-found error for course "${courseUrl}" with location "${location}":`, error);
                return redirectToNotFoundPage(router);
            }),
            catchError(() => redirectToNotFoundPage(router))
        );
    }

    // No location parameter - just fetch course by URL
    return publicAppService.getCourseByCanonicalURL(courseUrl).pipe(
        map(course => {
            if (!course) {
                throw new Error('Course not found');
            }
            return course;
        }),
        catchError(() => redirectToNotFoundPage(router))
    );
}
*/

// ✅ PLACEHOLDER: Return null to prevent any accidental usage
export const publicCourseDetailsResolver = null;

