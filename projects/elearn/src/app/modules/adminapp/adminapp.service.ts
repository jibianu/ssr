import { map, switchMap, catchError, shareReplay, tap } from 'rxjs/operators';
import { Category } from './category/category.model';
import { Observable, of, throwError } from 'rxjs';
import { environment } from './../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AuthenticationService } from '../auth/auth.service';
import { getApiBaseUrl } from 'src/app/core/helpers/api-base-url.helper';

@Injectable({ providedIn: 'root' })
export class AdminAppService {
    user: any;
    apiUrl = environment.apiUrl;

    /**
     * Short-lived cache for the curriculum list (course structure) keyed by courseId.
     * The course-details sidebar re-requests this on every in-course navigation (topic switch),
     * so caching it avoids a heavy duplicate round-trip while browsing topics. Invalidated on
     * progress writes and after a short TTL so completion state stays fresh.
     */
    private curriculumListCache = new Map<string, { obs: Observable<any>; ts: number }>();
    private readonly curriculumListCacheTtlMs = 60_000;

    constructor(
        private http: HttpClient,
        private authService: AuthenticationService
    ) {
    }

    /** Drop cached curriculum list(s) so the next request re-fetches fresh progress/completion. */
    invalidateCurriculumListCache(courseId?: string): void {
        if (courseId) {
            this.curriculumListCache.delete(courseId);
        } else {
            this.curriculumListCache.clear();
        }
    }

    getCourses(params,right:boolean=true): Observable<any> {
        if(right)
        return this.http.get<any>(this.apiUrl + `api/course`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/courses`, { params });
    }

    /** Company admin: tenant course catalog (all draft/published org courses). GET api/company/courses */
    getCompanyCourses(params: Record<string, unknown>): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/company/courses`, { params: params as any });
    }

    /** Public marketplace catalog (no auth). Used on company Explore for marketplace section. */
    getPublicCourses(params: Record<string, string | number>): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/public/courses`, { params: params as any });
    }

    publishCompanyCourse(courseId: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}api/company/courses/${courseId}/publish`, {});
    }

    unpublishCompanyCourse(courseId: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}api/company/courses/${courseId}/unpublish`, {});
    }

    deleteCompanyCourse(courseId: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}api/company/courses/${courseId}`);
    }

    setCompanyCourseVisibility(courseId: string, body: { showOnLms: boolean; showOnPublic: boolean }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}api/company/courses/${courseId}/set-visibility`, body);
    }

    updateCompanyCourseProgress(courseId: string, progress: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}api/company/courses/${courseId}/progress`, {
            progress,
            courseId
        });
    }

    approveCompanyCourseReview(courseId: string, approvalNote?: string | null): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}api/company/courses/${courseId}/approve-review`, {
            approvalNote: approvalNote ?? ''
        });
    }

    /** Search courses by title for topbar autocomplete. Returns up to 10 items (id, title, slug). */
    searchCourses(keyword: string): Observable<{ id: string; title: string; slug: string }[]> {
        const term = (keyword ?? '').trim();
        if (term.length < 2) return of([]);
        const params = {
            'Filter.Title': term,
            pageSize: '10',
            pageNumber: '1',
            'Sort.PropertyName': 'Title',
            'Sort.IsAscending': 'true'
        };
        return this.http.get<{ results?: any[] }>(this.apiUrl + 'api/course', { params }).pipe(
            map(res => {
                const list = res?.results || [];
                return list.slice(0, 10).map((item: any) => ({
                    id: String(item?.id ?? item?.Id ?? ''),
                    title: item?.title ?? item?.Title ?? '',
                    slug: (item?.slug ?? item?.Slug ?? '').trim()
                }));
            }),
            catchError(() => of([]))
        );
    }

    addCourse(obj) {
        return this.http.post<any>(this.apiUrl + `api/course`, obj);
    }
    addEnrollCourse(obj) {
        return this.http.post<any>(this.apiUrl + `api/course/enrollCourse`, obj);
    }
    updateCourse(obj, id) {
        return this.http.put<any>(this.apiUrl + `api/course/` + id, obj);
    }

    /** Update course from landing sidebar (title, canonicalUrl, categoryId, metaDescription, titleImageUrl, promoVideoUrl). Persists Slug. */
    updateCourseFromLanding(id: string, obj: { title?: string; canonicalUrl?: string; categoryId?: string; metaDescription?: string; titleImageUrl?: string; promoVideoUrl?: string }) {
        return this.http.put<any>(this.apiUrl + `page/course/course/` + id, obj);
    }

    /** Upload course title image to S3; returns { url } or { Url }. Caller should then persist via updateCourseFromLanding. */
    uploadCourseTitleImage(courseId: string, file: File): Observable<{ url?: string; Url?: string }> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        return this.http.post<{ url?: string; Url?: string }>(this.apiUrl + `page/course/course/${courseId}/title-image`, formData);
    }

    /** Upload course promo video to S3; returns { url } or { Url }. Caller should then persist via updateCourseFromLanding. */
    uploadCoursePromoVideo(courseId: string, file: File): Observable<{ url?: string; Url?: string }> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        return this.http.post<{ url?: string; Url?: string }>(this.apiUrl + `page/course/course/${courseId}/promo-video`, formData);
    }

    /** Remove title image from S3 and clear URL in DB. */
    deleteCourseTitleImage(courseId: string): Observable<{ message?: string }> {
        return this.http.delete<{ message?: string }>(this.apiUrl + `page/course/course/${courseId}/title-image`);
    }

    /** Remove promo video from S3 and clear URL in DB. */
    deleteCoursePromoVideo(courseId: string): Observable<{ message?: string }> {
        return this.http.delete<{ message?: string }>(this.apiUrl + `page/course/course/${courseId}/promo-video`);
    }

    getCourseById(id) {
        return this.http.get<any>(this.apiUrl + `api/course/` + id);
    }

    getBlogByCanonicalURL(url) {
        return this.http.get<any>(this.apiUrl + `api/course/` + url);
    }

    getBlogByUser() {
        return this.http.get<any>(this.apiUrl + `api/course/user`);
    }

    deleteCourseById(id) {
        return this.http.delete<any>(this.apiUrl + `api/course/` + id);
    }

    addCategory(obj) {
        return this.http.post<any>(this.apiUrl + `api/category`, obj);
    }

    updateCategory(obj, id) {
        return this.http.put<any>(this.apiUrl + `api/category/` + id, obj);
    }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl + `api/category`);
    }
    getPublishedCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl + `api/category/published`);
    }

    getCategoryById(id): Observable<Category> {
        return this.http.get<any>(this.apiUrl + `api/category/` + id);
    }

    deleteCategoryById(id) {
        return this.http.delete<any>(this.apiUrl + `api/category/` + id);
    }

    getEvents(): Observable<any[]> {
        return this.http.get<any>(this.apiUrl + `api/events`);
    }

    /** Get published blogs (paginated). API: GET /api/blog */
    getBlogs(pageNumber: number = 1, pageSize: number = 100): Observable<{ pageNumber: number; pageSize: number; totalNumberOfRecords: number; results: any[] }> {
        return this.http.get<any>(this.apiUrl + `api/blog`, {
            params: { pageNumber: String(pageNumber), pageSize: String(pageSize) }
        });
    }

    /** Admin: get all blogs (with author, word count). GET /api/admin/blog. Optional search for link builder. */
    getAdminBlogs(pageNumber: number = 1, pageSize: number = 500, search?: string): Observable<{ pageNumber: number; pageSize: number; totalNumberOfRecords: number; results: any[] }> {
        const params: Record<string, string> = { pageNumber: String(pageNumber), pageSize: String(pageSize) };
        if (search != null && search.trim() !== '') params['search'] = search.trim();
        return this.http.get<any>(this.apiUrl + `api/admin/blog`, { params });
    }
    /** Admin: get blog categories for dropdown. GET /api/admin/blog/categories */
    getAdminBlogCategories(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl + `api/admin/blog/categories`);
    }
    /** Admin: users who have created at least one blog (for User tab). GET /api/admin/blog/authors */
    getBlogAuthors(): Observable<{ id: string; name: string; profilePictureUrl?: string; email?: string; blogCount: number }[]> {
        return this.http.get<any[]>(this.apiUrl + `api/admin/blog/authors`);
    }
    /** Admin: get blog by id for edit. GET /api/admin/blog/{id} */
    getAdminBlogById(id: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/admin/blog/` + id);
    }
    /** Admin: create blog. POST /api/admin/blog */
    createBlog(body: any): Observable<any> {
        return this.http.post<any>(this.apiUrl + `api/admin/blog`, body);
    }
    /** Admin: update blog. PUT /api/admin/blog/{id} */
    updateBlog(id: string, body: any): Observable<any> {
        return this.http.put<any>(this.apiUrl + `api/admin/blog/` + id, body);
    }
    /** Admin: soft delete blog. DELETE /api/admin/blog/{id} */
    deleteBlog(id: string): Observable<void> {
        return this.http.delete<void>(this.apiUrl + `api/admin/blog/` + id);
    }
    /**
     * Admin/management: unpublish blog (Published -> Draft).
     * 1) POST /api/admin/blog/{id}/unpublish
     * 2) GET blog + PUT /api/admin/blog/{id}?unpublish=true (gateway-safe)
     */
    unpublishBlog(id: string): Observable<void> {
        const primary = this.apiUrl + `api/admin/blog/` + id + `/unpublish`;
        return this.http.post<void>(primary, {}).pipe(
            catchError((err) => {
                if (err?.status === 404) {
                    return this.unpublishBlogViaPut(id);
                }
                return throwError(() => err);
            })
        );
    }

    private unpublishBlogViaPut(id: string): Observable<void> {
        return this.getAdminBlogById(id).pipe(
            switchMap((b) => {
                const payload = this.mapAdminBlogToCreateOrUpdatePayload(b);
                const url = `${this.apiUrl}api/admin/blog/${encodeURIComponent(id)}?unpublish=true`;
                return this.http.put<any>(url, payload);
            }),
            map(() => undefined)
        );
    }
    /** Trainer: submit blog for admin review. POST /api/admin/blog/{id}/submit-for-review */
    submitBlogForReview(id: string, message?: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + `api/admin/blog/` + id + `/submit-for-review`, { message: message ?? '' });
    }
    /** Admin: get blogs pending review. GET /api/admin/blog/review */
    getPendingReviewBlogs(pageNumber: number = 1, pageSize: number = 100): Observable<{ pageNumber: number; pageSize: number; totalNumberOfRecords: number; results: any[] }> {
        return this.http.get<any>(this.apiUrl + `api/admin/blog/review`, {
            params: { pageNumber: String(pageNumber), pageSize: String(pageSize) }
        });
    }
    /** Admin: company-tenant trainer blogs across all companies (read-only directory). GET /api/admin/blog/corporate */
    getCorporateBlogs(pageNumber: number = 1, pageSize: number = 500, search?: string): Observable<{ pageNumber: number; pageSize: number; totalNumberOfRecords: number; results: any[] }> {
        const params: Record<string, string> = { pageNumber: String(pageNumber), pageSize: String(pageSize) };
        if (search != null && search.trim() !== '') params['search'] = search.trim();
        return this.http.get<any>(this.apiUrl + `api/admin/blog/corporate`, { params });
    }
    /**
     * Admin: publish/approve blog.
     * 1) POST /api/admin/blog/{id}/publish
     * 2) POST /api/admin/blog/review/{id}/approve
     * 3) GET blog + PUT /api/admin/blog/{id}?publish=true (uses the same route as Save — works when POST subpaths are not routed)
     */
    approveBlog(id: string, approvalNote?: string): Observable<void> {
        const body = { approvalNote: approvalNote ?? '' };
        const primary = this.apiUrl + `api/admin/blog/` + id + `/publish`;
        return this.http.post<void>(primary, body).pipe(
            catchError((err) => {
                if (err?.status === 404) {
                    return this.http.post<void>(this.apiUrl + `api/admin/blog/review/` + id + `/approve`, body);
                }
                return throwError(() => err);
            }),
            catchError((err) => {
                if (err?.status === 404) {
                    return this.publishBlogViaPut(id);
                }
                return throwError(() => err);
            })
        );
    }

    /** When dedicated approve endpoints 404, re-save via PUT ?publish=true (backend runs ApproveBlogAsync). */
    private publishBlogViaPut(id: string): Observable<void> {
        return this.getAdminBlogById(id).pipe(
            switchMap((b) => {
                const payload = this.mapAdminBlogToCreateOrUpdatePayload(b);
                const url = `${this.apiUrl}api/admin/blog/${encodeURIComponent(id)}?publish=true`;
                return this.http.put<any>(url, payload);
            }),
            map(() => undefined)
        );
    }

    private mapAdminBlogToCreateOrUpdatePayload(b: any): any {
        const sectionsRaw = b?.blogSections ?? b?.BlogSections ?? [];
        const sections = Array.isArray(sectionsRaw)
            ? sectionsRaw.map((s: any, i: number) => ({
                id: s.id ?? s.Id,
                title: s.title ?? s.Title ?? '',
                content: s.content ?? s.Content ?? '',
                sequenceNumber: s.sequenceNumber ?? s.SequenceNumber ?? (i + 1)
            }))
            : [];
        return {
            title: b?.title ?? b?.Title ?? '',
            canonicalUrl: b?.canonicalUrl ?? b?.CanonicalUrl ?? '',
            content: b?.content ?? b?.Content ?? '',
            metaDescription: b?.metaDescription ?? b?.MetaDescription ?? '',
            titleImgUrl: b?.titleImgUrl ?? b?.TitleImgUrl ?? '',
            showOnDashboard: b?.showOnDashboard ?? b?.ShowOnDashboard ?? false,
            categoryId: b?.categoryId ?? b?.CategoryId ?? '',
            blogSections: sections
        };
    }
    /** Admin: reject blog with reason. POST /api/admin/blog/{id}/reject, fallback to review path. */
    rejectBlog(id: string, rejectionReason: string): Observable<void> {
        const body = { rejectionReason: rejectionReason || '' };
        const primary = this.apiUrl + `api/admin/blog/` + id + `/reject`;
        return this.http.post<void>(primary, body).pipe(
            catchError((err) => {
                if (err?.status === 404) {
                    return this.http.post<void>(this.apiUrl + `api/admin/blog/review/` + id + `/reject`, body);
                }
                return throwError(() => err);
            })
        );
    }
    /** Normalize review history from API (handles camelCase/PascalCase and wrapped { data } / { results }). */
    private normalizeReviewHistory(raw: any): { eventType: number; eventDate: string; message: string | null }[] {
        const arr = Array.isArray(raw) ? raw : (raw?.data ?? raw?.results ?? []);
        if (!Array.isArray(arr)) return [];
        return arr.map((item: any) => ({
            eventType: item?.eventType ?? item?.EventType ?? 0,
            eventDate: item?.eventDate ?? item?.EventDate ?? '',
            message: item?.message ?? item?.Message ?? null
        }));
    }

    getBlogReviewHistory(blogId: string): Observable<{ eventType: number; eventDate: string; message: string | null }[]> {
        return this.http.get<any>(this.apiUrl + `api/admin/blog/` + blogId + `/review-history`).pipe(
            map((res) => this.normalizeReviewHistory(res))
        );
    }

    /** Trainer: submit course for admin review with optional message (shown in review history). POST api/course/{courseId}/submit-for-review */
    submitCourseForReview(courseId: string, message?: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + `api/course/` + courseId + `/submit-for-review`, { message: message ?? '' });
    }
    /** Admin: get courses pending review. GET api/admin/course/review */
    getPendingReviewCourses(pageNumber: number = 1, pageSize: number = 100): Observable<{ pageNumber: number; pageSize: number; totalNumberOfRecords: number; results: any[] }> {
        return this.http.get<any>(this.apiUrl + `api/admin/course/review`, {
            params: { pageNumber: String(pageNumber), pageSize: String(pageSize) }
        });
    }
    /** Admin: approve course with optional note. POST api/admin/course/review/{id}/approve */
    approveCourse(id: string, approvalNote?: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + `api/admin/course/review/` + id + `/approve`, { approvalNote: approvalNote ?? '' });
    }
    /** Admin: reject course with reason. POST api/admin/course/review/{id}/reject */
    rejectCourse(id: string, rejectionReason: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + `api/admin/course/review/` + id + `/reject`, { rejectionReason: rejectionReason || '' });
    }
    /** Full review timeline (trainer). GET api/course/{courseId}/review-history */
    getCourseReviewHistory(courseId: string): Observable<{ eventType: number; eventDate: string; message: string | null }[]> {
        return this.http.get<any>(this.apiUrl + `api/course/` + courseId + `/review-history`).pipe(
            map((res) => this.normalizeReviewHistory(res))
        );
    }
    /** Full review timeline (admin). GET api/admin/course/review/{id}/review-history */
    getAdminCourseReviewHistory(courseId: string): Observable<{ eventType: number; eventDate: string; message: string | null }[]> {
        return this.http.get<any>(this.apiUrl + `api/admin/course/review/` + courseId + `/review-history`).pipe(
            map((res) => this.normalizeReviewHistory(res))
        );
    }

    /** Admin: list newsletter subscriptions from DB. GET /api/admin/newsletter-subscriptions */
    getNewsletterSubscriptions(
        pageNumber: number = 1,
        pageSize: number = 25,
        search?: string,
        fromDate?: string,
        toDate?: string
    ): Observable<{ pageNumber: number; pageSize: number; totalNumberOfRecords: number; results: any[] }> {
        const params: Record<string, string> = {
            pageNumber: String(pageNumber),
            pageSize: String(pageSize)
        };
        if (search != null && search.trim() !== '') {
            params['search'] = search.trim();
        }
        if (fromDate && fromDate.trim() !== '') {
            params['fromDate'] = fromDate;
        }
        if (toDate && toDate.trim() !== '') {
            params['toDate'] = toDate;
        }
        return this.http.get<any>(this.apiUrl + `api/admin/newsletter-subscriptions`, { params });
    }
    deleteNewsletterSubscription(id: string): Observable<void> {
        return this.http.delete<void>(this.apiUrl + `api/admin/newsletter-subscriptions/${id}`);
    }

    /** Loop Marketing: get content by category (null = default). GET /api/admin/loop-marketing/category */
    getLoopMarketingContent(categoryId?: string | null): Observable<any> {
        const params = categoryId ? { categoryId } : {};
        return this.http.get<any>(this.apiUrl + `api/admin/loop-marketing/category`, { params });
    }
    /** Loop Marketing: create. POST /api/admin/loop-marketing */
    createLoopMarketingContent(body: any): Observable<any> {
        return this.http.post<any>(this.apiUrl + `api/admin/loop-marketing`, body);
    }
    /** Loop Marketing: update. PUT /api/admin/loop-marketing/{id} */
    updateLoopMarketingContent(id: string, body: any): Observable<any> {
        return this.http.put<any>(this.apiUrl + `api/admin/loop-marketing/` + id, body);
    }

    getEventById(eventId: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/events/` + eventId);
    }

    createEvent(obj: any): Observable<any> {
        return this.http.post<any>(this.apiUrl + `api/events`, obj);
    }

    updateEvent(eventId: string, obj: any): Observable<any> {
        return this.http.put<any>(this.apiUrl + `api/events/` + eventId, obj);
    }

    uploadEventTitleImage(file: File): Observable<{ url?: string }> {
        const data = new FormData();
        data.append('file', file, file.name);
        return this.http.post<{ url?: string }>(this.apiUrl + `api/events/TitleImage`, data);
    }

    /** Upload event video to S3; returns { url } to store in event. */
    uploadEventVideo(file: File): Observable<{ url?: string }> {
        const data = new FormData();
        data.append('file', file, file.name);
        return this.http.post<{ url?: string }>(this.apiUrl + `api/events/Video`, data);
    }

    /** Delete event media (title image or video) from S3. Call before clearing the URL from the form so DB and S3 stay in sync. */
    deleteEventMedia(url: string): Observable<{ message?: string }> {
        return this.http.post<{ message?: string }>(this.apiUrl + `api/events/Media/delete`, { url });
    }

    deleteEvent(eventId: string): Observable<any> {
        return this.http.delete(this.apiUrl + `api/events/` + eventId);
    }

    /** Set event publish status. When published, event is shown on site and elearn pages. */
    setEventPublishStatus(eventId: string, isPublished: boolean): Observable<{ message?: string }> {
        return this.http.patch<{ message?: string }>(this.apiUrl + `api/events/` + eventId + `/publish`, { isPublished });
    }

    /** Set event page completion percentage (0-100). */
    setEventProgress(eventId: string, completionPercent: number): Observable<{ message?: string; completionPercent?: number }> {
        return this.http.patch<{ message?: string; completionPercent?: number }>(
            this.apiUrl + `api/events/` + eventId + `/progress`,
            { completionPercent }
        );
    }

    getEventUsers(eventId: string): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl + `api/events/users/` + eventId);
    }
    submitEventForReview(eventId: string, message?: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + `api/events/` + eventId + `/submit-for-review`, { message: message ?? '' });
    }
    /** Full review timeline (trainer or admin). GET api/events/{eventId}/review-history – same pattern as course (api/course/{courseId}/review-history). */
    getEventReviewHistory(eventId: string): Observable<{ eventType: number; eventDate: string; message: string | null }[]> {
        return this.http.get<any>(this.apiUrl + `api/events/` + eventId + `/review-history`).pipe(
            map((res) => this.normalizeReviewHistory(res))
        );
    }
    approveEvent(eventId: string, approvalNote?: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + `api/admin/event/review/` + eventId + `/approve`, { approvalNote: approvalNote ?? '' });
    }
    rejectEvent(eventId: string, rejectionReason: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + `api/admin/event/review/` + eventId + `/reject`, { rejectionReason: rejectionReason || '' });
    }

    getUsers(params) {
        return this.http.get<any>(this.apiUrl + `api/user`, { params });
    }

    getStudents(params, right: boolean = true) {
        if (right)
            return this.http.get<any>(this.apiUrl + `api/user/students`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/students`, { params });
    }

    /** Admin: students with <c>CompanyId</c> = company account (portal employees). Requires GetCompanies. */
    getCompanyPortalStudents(companyUserId: string, params: Record<string, string | number | boolean>) {
        const enc = encodeURIComponent(companyUserId);
        return this.http.get<any>(`${this.apiUrl}api/user/companies/${enc}/portal-students`, { params });
    }

    getCompanyPortalTrainers(companyUserId: string, params: Record<string, string | number | boolean>) {
        const enc = encodeURIComponent(companyUserId);
        return this.http.get<any>(`${this.apiUrl}api/user/companies/${enc}/portal-trainers`, { params });
    }

    getTrainers(params, right: boolean = true) {
        if (right)
            return this.http.get<any>(this.apiUrl + `api/user/trainers`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/trainers`, { params });

    }

    getCompanies(params, right: boolean = true) {
        if(right)
        return this.http.get<any>(this.apiUrl + `api/user/companies`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/companies`, { params });
    }

    getManagement(params, right: boolean = true): Observable<any> {
        if (!this.authService.currentToken()) {
            return of({ results: [], totalNumberOfRecords: 0 });
        }
        if (right)
            return this.http.get<any>(this.apiUrl + `api/user/management`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/management`, { params });
    }

    getUserById(Id) {
        return this.http.get<any>(this.apiUrl + `api/user/` + Id);
    }

    /** Admin student drawer: profile, stats, engagement, timeline. */
    getStudentDrawer(studentId: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/admin/analytics/student/${studentId}/drawer`);
    }

    /** Admin student purchases with date filter and pagination. */
    getStudentPurchases(studentId: string, params: { from?: string; to?: string; page?: number; pageSize?: number }): Observable<any> {
        const p: any = { page: params.page ?? 1, pageSize: params.pageSize ?? 10 };
        if (params.from) p.from = params.from;
        if (params.to) p.to = params.to;
        return this.http.get<any>(this.apiUrl + `api/admin/analytics/student/${studentId}/purchases`, { params: p });
    }

    createUser(obj) {
        return this.http.post<any>(this.apiUrl + `api/user`, obj);
    }

    updateUser(id, obj) {
        return this.http.put<any>(this.apiUrl + `api/user/` + id, obj);
    }

    deleteUserById(id) {
        return this.http.delete<any>(this.apiUrl + `api/user/` + id);
    }

    getUserInfo() {
        return this.http.get<any>(this.apiUrl + `api/account/getinfo/`);
    }

    /** Get current user's content permissions (Blog, Course, Event) for trainer sidebar. */
    getMyContentPermissions(): Observable<string[]> {
        return this.http.get<string[]>(this.apiUrl + `api/account/my-content-permissions`);
    }

    /** Trainer: request permission to create content (Course, Event, Blog). */
    requestContentPermission(contentType: string): Observable<{ id?: string; message?: string }> {
        return this.http.post<{ id?: string; message?: string }>(
            this.apiUrl + `api/trainer/dashboard/content-permission-request`,
            { contentType }
        );
    }

    /** Trainer: get my pending content permission requests (to show "Permission requested" in topbar). */
    getMyPendingPermissionRequests(): Observable<{ contentType?: string }[]> {
        return this.http.get<{ contentType?: string }[]>(this.apiUrl + `api/trainer/dashboard/my-pending-permission-requests`);
    }

    /** Admin: list content permission requests (status: 0 Pending, 1 Approved, 2 Rejected). */
    getContentPermissionRequests(status = 0): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl + `api/admin/content-permission-requests`, {
            params: { status: String(status) }
        });
    }

    /** Admin: approve a content permission request. */
    approveContentPermissionRequest(id: string): Observable<any> {
        return this.http.post<any>(this.apiUrl + `api/admin/content-permission-requests/${id}/approve`, {});
    }

    /** Admin: reject a content permission request. */
    rejectContentPermissionRequest(id: string): Observable<any> {
        return this.http.post<any>(this.apiUrl + `api/admin/content-permission-requests/${id}/reject`, {});
    }

    profileUpdate(obj) {
        return this.http.put<any>(this.apiUrl + `api/account/updateinfo/`, obj);
    }

    passwordUpdate(obj) {
        return this.http.put<any>(this.apiUrl + `api/account/changepassword/`, obj);
    }
    inviteUser(obj) {
        return this.http.post<any>(this.apiUrl + `api/UserManagement/invite`, obj);
    }

    uploadImage(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `api/CurriculumVideoLecture/UploadImage`, data);
    }

    deleteImage(imageUrl: string): Observable<any> {
        // PascalCase + camelCase so model binding works regardless of JSON settings
        return this.http.post(this.apiUrl + `api/CurriculumVideoLecture/DeleteImage`, {
            imageUrl,
            ImageUrl: imageUrl
        });
    }
    /** Upload file to backend; backend uploads to S3. Always send file in POST to avoid CORS (no direct PUT to S3 from browser). */
    uploadDocumnet(file: File, docType): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        data.append('DocType', docType);
        data.append('userId', 'b9d1cec3-d0ee-4723-bbab-45de466b5cef');
        return this.http.post<{ documentPath?: string; documentComments?: string; isPreSignedUrl?: boolean }>(
            this.apiUrl + 'api/Document/UploadDocument',
            data,
            { reportProgress: true }
        );
    }
    /**
     * Upload large files (e.g. videos) straight to S3 via a presigned PUT URL so the bytes never pass
     * through API Gateway / Lambda (which rejects bodies over ~10 MB with a 413). The API only issues
     * the presigned URL (tiny request); the browser PUTs the file directly to S3.
     * Requires the S3 bucket to allow cross-origin PUT/GET from this site.
     * Returns the final public document path to store as the video link.
     */
    uploadDocumentDirect(file: File, docType: string): Observable<string> {
        const contentType = file.type || 'application/octet-stream';
        const data: FormData = new FormData();
        data.append('DocType', docType);
        data.append('userId', 'b9d1cec3-d0ee-4723-bbab-45de466b5cef');
        data.append('fileName', file.name);
        data.append('fileType', contentType);
        return this.http
            .post<{ documentPath?: string; documentComments?: string; isPreSignedUrl?: boolean }>(
                this.apiUrl + 'api/Document/UploadDocument',
                data
            )
            .pipe(
                switchMap((res) => {
                    if (res?.isPreSignedUrl && res.documentComments) {
                        return this.http
                            .put(res.documentComments, file, {
                                headers: new HttpHeaders({ 'Content-Type': contentType })
                            })
                            .pipe(map(() => res.documentPath || ''));
                    }
                    return of(res?.documentPath || '');
                })
            );
    }

    uploadDocumnetLink(fileLink, docType) {
        var obj = {
            "fileLink": fileLink,
            "docType": docType,
            "providerType": "youtube"
        }
        return this.http.post<any>(this.apiUrl + `api/Document/UploadDocumentLink`, obj);
    }

    addDocuments(obj) {
        return this.http.post<any>(this.apiUrl + `api/Document`, obj);
    }
    getDocumentByEntry(id, entry) {
        return this.http.get<any>(this.apiUrl + `api/Document/Entry/${entry}/${id}`);
    }

    /**
     * Check if course is completed for certificate (dynamic certificate view/download).
     */
    checkCertificateCompleted(enrollmentId: string): Observable<{ completed: boolean; enrollmentId?: string }> {
        return this.http.get<{ completed: boolean; enrollmentId?: string }>(
            getApiBaseUrl() + `certificate/check/${enrollmentId}`
        );
    }

    getDocumnetAsFile(doc, docId) {
        return this.http.get(this.apiUrl + `api/Document/download/${doc}/${docId}`, { responseType: 'blob' })
        // .pipe(map((res) => {
        //     return new Blob([res.blob()], {type: res.headers.get('Content-Type')});
        // }));
    }

    uploadVideo(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `api/CurriculumVideoLecture/UploadVideo`, data);
    }

    addLocation(obj) {
        return this.http.post<any>(this.apiUrl + `api/location`, obj);
    }

    updateLocation(obj, id) {
        return this.http.put<any>(this.apiUrl + `api/location/` + id, obj);
    }

    getLocation(): Observable<any> {
        return this.http.get(this.apiUrl + `api/location`);
    }

    getLocationById(id) {
        return this.http.get<any>(this.apiUrl + `api/location/` + id);
    }

    deleteLocationById(id) {
        return this.http.delete<any>(this.apiUrl + `api/location/` + id);
    }

    getCurriculumByCourseId(courseId) {
        const key = String(courseId);
        const cached = this.curriculumListCache.get(key);
        if (cached && (Date.now() - cached.ts) < this.curriculumListCacheTtlMs) {
            return cached.obs;
        }
        const obs = this.http.get<any>(this.apiUrl + `api/curriculum/course/` + courseId).pipe(
            catchError((err) => {
                // Don't cache failures – allow the next call to retry instead of replaying the error for the whole TTL.
                this.curriculumListCache.delete(key);
                return throwError(() => err);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        this.curriculumListCache.set(key, { obs, ts: Date.now() });
        return obs;
    }
    getCurriculumByCourseId1(courseId) {
        return this.http.get<any>(this.apiUrl + `api/curriculum/courseByCourse/` + courseId);
    }

    // Curriculum
    addCurriculum(obj, courseId) {
        // New curriculum must show up immediately (e.g. to auto-open its panel), so drop the cached list.
        return this.http.post<any>(this.apiUrl + `api/curriculum/` + courseId, obj)
            .pipe(tap(() => this.invalidateCurriculumListCache(courseId)));
    }

    deleteCurriculum(curriculumId) {
        return this.http.delete<any>(this.apiUrl + `api/curriculum/` + curriculumId)
            .pipe(tap(() => this.invalidateCurriculumListCache()));
    }

    getCurriculumByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/curriculum/` + curriculumId);
    }

    updateCurriculum(obj, curriculumId) {
        return this.http.put<any>(this.apiUrl + `api/curriculum/` + curriculumId, obj)
            .pipe(tap(() => this.invalidateCurriculumListCache()));
    }

    // Course FAQ (public landing sidebar)
    getCourseFaqsByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/coursefaq/course/` + courseId);
    }
    addCourseFaq(courseId: string, obj: { question?: string; answer?: string; sortOrder?: number }) {
        return this.http.post<any>(this.apiUrl + `api/coursefaq/course/` + courseId, obj);
    }
    updateCourseFaq(id: string, obj: { question?: string; answer?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/coursefaq/` + id, obj);
    }
    deleteCourseFaq(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/coursefaq/` + id);
    }

    // Course Trainers (public landing sidebar)
    getCourseTrainersByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/coursetrainer/course/` + courseId);
    }
    addCourseTrainer(courseId: string, obj: { name?: string; imageUrl?: string; description?: string; sortOrder?: number }) {
        return this.http.post<any>(this.apiUrl + `api/coursetrainer/course/` + courseId, obj);
    }
    updateCourseTrainer(id: string, obj: { name?: string; imageUrl?: string; description?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/coursetrainer/` + id, obj);
    }
    deleteCourseTrainer(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/coursetrainer/` + id);
    }

    // Course Title Summaries (public landing)
    getCourseSummariesByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/coursesummary/course/` + courseId);
    }
    addCourseSummary(courseId: string, obj: { title?: string; summary?: string }) {
        return this.http.post<any>(this.apiUrl + `api/coursesummary/course/` + courseId, obj);
    }
    updateCourseSummary(id: string, obj: { title?: string; summary?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/coursesummary/` + id, obj);
    }
    deleteCourseSummary(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/coursesummary/` + id);
    }

    // Course About Information (info sections)
    getCourseInformationByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/courseinformation/course/` + courseId);
    }
    addCourseInformation(courseId: string, obj: { title?: string; summary?: string }) {
        return this.http.post<any>(this.apiUrl + `api/courseinformation/course/` + courseId, obj);
    }
    updateCourseInformation(id: string, obj: { title?: string; summary?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/courseinformation/` + id, obj);
    }
    deleteCourseInformation(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/courseinformation/` + id);
    }

    // Course Features
    getCourseFeaturesByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/coursefeature/course/` + courseId);
    }
    addCourseFeature(courseId: string, obj: { description?: string }) {
        return this.http.post<any>(this.apiUrl + `api/coursefeature/course/` + courseId, obj);
    }
    updateCourseFeature(id: string, obj: { description?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/coursefeature/` + id, obj);
    }
    deleteCourseFeature(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/coursefeature/` + id);
    }

    // Become Course (single title + description)
    getBecomeCourseByCourseId(courseId: string) {
        return this.http.get<any>(this.apiUrl + `api/becomecourse/course/` + courseId);
    }
    upsertBecomeCourse(courseId: string, obj: { title?: string; description?: string }) {
        return this.http.put<any>(this.apiUrl + `api/becomecourse/course/` + courseId, obj);
    }


    // Curriculum Topics

    addCurriculumTopic(obj, curriculumId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumTopic/` + curriculumId, obj);
    }

    deleteCurriculumTopic(curriculumId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumTopic/` + curriculumId);
    }

    getCurriculumTopicById(curriculumTopicId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumTopic/` + curriculumTopicId);
    }

    updateCurriculumTopic(obj, curriculumTopicId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumTopic/` + curriculumTopicId, obj);
    }

    getCurriculumTopicByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumTopic/curriculum/` + curriculumId);
    }

    // Curriculum Study material

    addCurriculumStudyMaterial(obj, curriculumId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumStudyMaterial/` + curriculumId, obj)
            .pipe(tap(() => this.invalidateCurriculumListCache()));
    }

    deleteCurriculumStudyMaterial(sutdyMateialId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumStudyMaterial/` + sutdyMateialId)
            .pipe(tap(() => this.invalidateCurriculumListCache()));
    }

    getCurriculumStudyMaterialById(sutdyMateialId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumStudyMaterial/` + sutdyMateialId);
    }

    updateCurriculumStudyMaterial(obj, sutdyMateialId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumStudyMaterial/` + sutdyMateialId, obj);
    }

    getCurriculumStudyMaterialByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumStudyMaterial/curriculum/` + curriculumId);
    }

    // Curriculum Video

    addCurriculumVideo(obj, curriculumId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumVideoLecture/` + curriculumId, obj)
            .pipe(tap(() => this.invalidateCurriculumListCache()));
    }

    deleteCurriculumVideo(videoId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumVideoLecture/` + videoId)
            .pipe(tap(() => this.invalidateCurriculumListCache()));
    }

    getCurriculumVideoById(videoId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumVideoLecture/` + videoId);
    }

    updateCurriculumVideo(obj, videoId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumVideoLecture/` + videoId, obj);
    }

    getCurriculumVideoByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumVideoLecture/curriculum/` + curriculumId);
    }

    // Curriculum Question Set

    addCourseQuestionSet(obj, courseId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumQuestionSet/` + courseId, obj);
    }

    deleteCurriculumQuestionSet(questionSetId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumQuestionSet/` + questionSetId);
    }

    getQuetionSetCourseId(courseId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/course/` + courseId);
    }

    updateCurriculumQuestionSet(obj, questionSetId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumQuestionSet/` + questionSetId, obj);
    }

    getCurriculumQuestionSetByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/curriculum/` + curriculumId);
    }

    //add questions

    addQuestion(obj) {
        // Questions can belong to a curriculum; counts in the curriculum list depend on them.
        return this.http.post<any>(this.apiUrl + `api/question`, obj)
            .pipe(tap(() => this.invalidateCurriculumListCache()));
    }

    deleteQuestion(questionId) {
        return this.http.delete<any>(this.apiUrl + `api/question/` + questionId)
            .pipe(tap(() => this.invalidateCurriculumListCache()));
    }

    getQuestionById(questionId) {
        return this.http.get<any>(this.apiUrl + `api/question/` + questionId);
    }

    updateQuestion(obj, questionId) {
        return this.http.put<any>(this.apiUrl + `api/question/` + questionId, obj);
    }

    getQuestionByquestionSetId(questionSetId) {
        return this.http.get<any>(this.apiUrl + `api/question/questionSet/` + questionSetId);
    }

    getQuestionsByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/Question/questionbycurriculum/` + curriculumId);
    }

    getQuestionsByCourseId(courseId) {
        return this.http.get<any>(this.apiUrl + `api/Question/questionbycourse/` + courseId);
    }

    getAllQuestionsByCourseId(courseId) {
        return this.http.get<any>(this.apiUrl + `api/Question/questionbycourseandcurriculum/` + courseId);
    }

    // getRandomQuestions(questionSetId, difficultyLevelId) {
    //     return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/` + questionSetId + `/random/` + difficultyLevelId);
    // }

    getRandomQuestions(courseId, difficultyLevelId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/` + courseId + `/randomByCourse/` + difficultyLevelId);
    }

    getQuestionsetById(questionSetId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/questionSet/` + questionSetId);
    }
    Get(apiUrl) {
        return this.http.get<any>(this.apiUrl + apiUrl)
            .toPromise()
            .then(response => response);
    }
    updateStudent(params) {
        return this.http.put<any>(this.apiUrl + `api/User/userpermissions/update`, params);
    }
    getCourseByCategory(categoryID) {
        return this.http.get<any>(this.apiUrl + `api/Course/ByCategory/` + categoryID)
            .toPromise()
            .then(response => response);;
    }
    getCourseByUserAndCategory(userId, categoryID) {
        return this.http.get<any>(this.apiUrl + `api/Course/ByUserCategory/` + userId + '/' + categoryID)
            .toPromise()
            .then(response => response);;
    }
    getCategoriesForModal() {
        return this.http.get<Category[]>(this.apiUrl + `api/category`)
            .toPromise()
            .then(response => response);;
    }
    enrollCourse(obj) {
        return this.http.post<any>(this.apiUrl + `api/Course/EnrollCourses`, obj);
    }
    getCourseByCourseID(id: string, skipCache?: boolean) {
        const encoded = encodeURIComponent(String(id).trim());
        const url = skipCache
            ? `${this.apiUrl}api/Course/${encoded}?_t=${Date.now()}`
            : `${this.apiUrl}api/Course/${encoded}`;
        // Students often lack Course.GetCourse; anonymous by-slug accepts GUID and returns same CourseResponse shape.
        return this.http.get(url).pipe(
            catchError((err: HttpErrorResponse) => {
                const status = err?.status;
                if (status === 403 || status === 401 || status === 404) {
                    const slugUrl = skipCache
                        ? `${this.apiUrl}api/Course/by-slug/${encoded}?_t=${Date.now()}`
                        : `${this.apiUrl}api/Course/by-slug/${encoded}`;
                    return this.http.get(slugUrl);
                }
                return throwError(() => err);
            })
        );
    }

    /** Public read by slug (AllowAnonymous). Use when route param is a slug, not a GUID. */
    getCourseBySlugOnly(slug: string, skipCache?: boolean): Observable<any> {
        const encoded = encodeURIComponent(String(slug).trim());
        const url = skipCache
            ? `${this.apiUrl}api/Course/by-slug/${encoded}?_t=${Date.now()}`
            : `${this.apiUrl}api/Course/by-slug/${encoded}`;
        return this.http.get(url);
    }

    /** Check if current user is enrolled in course. GET api/course/enrollment-status/{courseId}. For Resume vs Enroll/Buy UI. */
    getEnrollmentStatus(courseId: string): Observable<{ isEnrolled: boolean }> {
        return this.http.get<{ isEnrolled: boolean }>(this.apiUrl + `api/course/enrollment-status/${courseId}`);
    }

    /** Enroll current user in a free course. POST api/course/enroll/free. Returns { success, alreadyEnrolled?, message? }. */
    enrollFree(courseId: string): Observable<{ success?: boolean; alreadyEnrolled?: boolean; message?: string }> {
        return this.http.post<any>(this.apiUrl + `api/course/enroll/free`, { courseId });
    }

    /** Bulk enrollment status for multiple courses. POST api/course/enrollment-status/bulk. Body: { courseIds: string[] }. Returns { [courseId]: boolean }. */
    getEnrollmentStatusBulk(courseIds: string[]): Observable<Record<string, boolean>> {
        if (!courseIds?.length) return of({});
        return this.http.post<Record<string, boolean>>(this.apiUrl + `api/course/enrollment-status/bulk`, { courseIds });
    }
    publishCourse(id): Observable<any> {
        return this.http.patch<any>(this.apiUrl + `api/Course/Publish/` + id, null);
    }
    unPublishCourse(id): Observable<any> {
        return this.http.patch<any>(this.apiUrl + `api/Course/UnPublish/` + id, null);
    }
    /** Set visibility on Elearn LMS and Public marketing page (checkbox-based). */
    setCourseVisibility(courseId: string, showOnLms: boolean, showOnPublic: boolean): Observable<any> {
        return this.http.patch<any>(this.apiUrl + `api/Course/Visibility/` + courseId, { showOnLms, showOnPublic });
    }
    /** Set ShowOnPublicListing = true for all published courses so they appear on the public site. Returns { updatedCount, message }. */
    setShowOnPublicForAllPublished(): Observable<{ updatedCount: number; message?: string }> {
        return this.http.post<{ updatedCount: number; message?: string }>(this.apiUrl + `api/Course/publish-all-to-public`, {});
    }
    updateProgress(id,progress): Observable<any> {
        var data={
            progress:progress,
            courseId:id
        }
        return this.http.post<any>(this.apiUrl + `api/Course/UpdateProgress/` + id, data);
    }
    getAuthor(right:boolean=true,param:string=''): Observable<any> {
        if(right)
        return this.http.get<any>(this.apiUrl + `api/User/trainers?${param}`);
        return this.http.get<any>(this.apiUrl + `api/UserManagement/trainers?${param}`);
    }
    addCourseProgress(obj) {
        return this.http.post<any>(this.apiUrl + `api/CourseProgress`, obj);
    }
    addCourseProgressDetail(obj) {
        return this.http.post<any>(this.apiUrl + `api/CourseProgress/AddCourseProgressDetail`, obj);
    }
    /** Save watch progress for a curriculum (video). When progress >= 90%, curriculum is marked completed. */
    saveCurriculumWatchProgress(payload: { curriculumId: string; secondsWatched: number; videoDurationSeconds?: number }) {
        // Progress may flip a curriculum to "completed"; drop the cached list so the sidebar reflects it.
        this.invalidateCurriculumListCache();
        return this.http.post<any>(this.apiUrl + `api/CourseProgress/SaveCurriculumWatchProgress`, payload);
    }
    getEnrolledCourses(params): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/Course/GetEnrolledCourse`, { params });
    }
    startTest(obj) {
        return this.http.post<any>(this.apiUrl + `api/Test/StartTest`, obj);
    }
    saveTestsDetail(obj) {
        return this.http.post<any>(this.apiUrl + `api/Test/SaveTestsDetail`, obj);
    }
    submitTests(obj) {
        return this.http.post<any>(this.apiUrl + `api/Test/SubmitTests`, obj);
    }
    addWishList(obj) {
        return this.http.post<any>(this.apiUrl + `api/WishLists`, obj);
    }
    updateWishList(obj) {
        return this.http.put<any>(this.apiUrl + `api/WishLists/${obj.wishListId}`, obj);
    }
    getWishList() {
        return this.http.get<any>(this.apiUrl + `api/WishLists`);
    }
    getWishListbyId(id) {
        return this.http.get<any>(this.apiUrl + `api/WishLists/${id}`);
    }
    getTestsResult(questionSetId) {
        return this.http.get<any>(this.apiUrl + `api/Test/GetTestsResult/` + questionSetId);
    }
    addUserManagemntMap(obj) {
        return this.http.post<any>(this.apiUrl + `api/UserManagement/AddUsers`, obj);
    }
    assignTrainersToManagement(managementUserId: string, trainerUserIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/trainers/map`, {
            managementUserId,
            trainerUserIds
        });
    }
    unmapTrainerFromManagement(managementUserId: string, trainerUserId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/trainers/unmap`, {
            body: { managementUserId, trainerUserId }
        });
    }
    mapCompaniesToManagement(managementUserId: string, companyUserIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/companies/map`, {
            managementUserId,
            companyUserIds
        });
    }
    unmapCompanyFromManagement(managementUserId: string, companyUserId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/companies/unmap`, {
            body: { managementUserId, companyUserId }
        });
    }
    getMappedCompaniesForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/companies`, { params: params || {} });
    }
    getAssignedCompaniesForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/companies`, { params: params || {} });
    }
    mapManagementsToManagement(parentManagementUserId: string, managementUserIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/management-users/map`, {
            managementUserId: parentManagementUserId,
            managementUserIds
        });
    }
    unmapManagementFromManagement(parentManagementUserId: string, childManagementUserId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/management-users/unmap`, {
            body: { managementUserId: parentManagementUserId, childManagementUserId }
        });
    }
    getMappedManagementsForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/management-users`, { params: params || {} });
    }
    getAssignedManagementsForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/management-users`, { params: params || {} });
    }
    mapStudentsToManagement(managementUserId: string, studentUserIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/students/map`, {
            managementUserId,
            studentUserIds
        });
    }
    unmapStudentFromManagement(managementUserId: string, studentUserId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/students/unmap`, {
            body: { managementUserId, studentUserId }
        });
    }
    getMappedStudentsForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/students`, { params: params || {} });
    }
    getAssignedStudentsForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/students`, { params: params || {} });
    }
    mapCoursesToManagement(managementUserId: string, courseIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/courses/map`, {
            managementUserId,
            courseIds
        });
    }
    unmapCourseFromManagement(managementUserId: string, courseId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/courses/unmap`, {
            body: { managementUserId, courseId }
        });
    }
    unmapCoursesFromManagement(managementUserId: string, courseIds: string[]) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/courses/unmap-bulk`, {
            body: { managementUserId, courseIds }
        });
    }
    getMappedCoursesForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/courses`, { params: params || {} });
    }
    getAssignedCoursesForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/courses`, { params: params || {} });
    }
    getMappedTrainersForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/trainers`, { params: params || {} });
    }
    getAssignedTrainers() {
        return this.http.get<any[]>(this.apiUrl + `api/Management/profile/trainers`);
    }
    /** Get current Management user's permissions (StudentList, TrainerList, etc.) for sidebar filtering. */
    getMyManagementPermissions() {
        return this.http.get<string[]>(this.apiUrl + `api/Management/profile/permissions`);
    }
    getAssignedTrainersForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/trainers`, { params: params || {} });
    }
    getManagementTrainerById(trainerId: string) {
        return this.http.get<any>(this.apiUrl + `api/Management/trainers/${trainerId}`);
    }
    lockManagementTrainer(trainerId: string, locked: boolean) {
        return this.http.post<any>(this.apiUrl + `api/Management/trainers/${trainerId}/lock`, { locked });
    }
    enrollManagementTrainerCourse(request: any) {
        return this.http.post<any>(this.apiUrl + `api/Management/trainers/enroll`, request);
    }
    getManagementByUser(userId) {
        return this.http.get<any>(this.apiUrl + `api/UserManagement/Management/` + userId);
    }
    getManagementByCourse(courseId: string) {
        return this.http.get<any>(this.apiUrl + `api/Management/courses/` + courseId + `/managements`);
    }
    addToGroupUser(obj){
        return this.http.post<any>(this.apiUrl + `api/UserManagement/addtogroup`, obj);
    }
    getUserGroups(userId){
        return this.http.get<any>(this.apiUrl + `api/UserManagement/usergroups/${userId}`);
    }
    GetPermissionByAction(actionName) {
        var ac = btoa(actionName);
        return this.http.get<any>(this.apiUrl + `api/UserManagement/userpermissions/` + ac);
    }

    deleteUserManagemntMap(id) {
        return this.http.delete<any>(this.apiUrl + `api/UserManagement/RemoveUser/` + id);
    }

    // prices
    addCoursePrices(courseId,obj) {
        return this.http.post<any>(this.apiUrl + `api/Course/price/${courseId}`, obj);
    }
    updateCoursePrices(obj,id) {
        return this.http.put<any>(this.apiUrl + `api/Course/price/${id}`, obj);
    }
    deleteCoursePrices(id) {
        return this.http.delete<any>(this.apiUrl + `api/Course/price/${id}`);
    }
    getCoursePrices(courseId){
        return this.http.get<any>(this.apiUrl + `api/Course/prices/${courseId}`);
    }
    /** Start purchase (Buy flow): returns status + redirectUrl. already_enrolled | enrolled → course page; payment_required → checkout. */
    startPurchase(courseId: string) {
        return this.http.post<{ status: string; redirectUrl: string }>(this.apiUrl + `api/Course/start-purchase`, { courseId });
    }
    getCheckout(courseId){
        return this.http.get<any>(this.apiUrl + `api/Payment/checkout/${courseId}`);
    }
    createPaymentIntent(courseId,obj){
        return this.http.post<any>(this.apiUrl + `api/Payment/intent/${courseId}`,obj);
    }
    verifyPayment(sessionId,obj){
        return this.http.post<any>(this.apiUrl + `api/Payment/checkout/verify/${sessionId}`,obj);
    }

    /** Send push notification to students (Admin/Management). targetAudience: 'all_students' | 'selected' | 'by_category'; categoryId when by_category. */
    sendPushNotification(body: { title: string; message: string; type?: string; linkUrl?: string; targetAudience: string; userIds?: string[]; categoryId?: string }) {
        return this.http.post<{ message: string; count: number }>(this.apiUrl + `api/push-notifications/send`, body);
    }

    /** Get all notifications list (Admin/Management). */
    getNotificationList(page = 1, pageSize = 20, type?: string) {
        let params: any = { page: String(page), pageSize: String(pageSize) };
        if (type && type.trim()) params.type = type.trim();
        return this.http.get<any>(this.apiUrl + `api/push-notifications/list`, { params });
    }

    /** Notification history (sent notifications) with filters and paging. */
    getNotificationHistory(params: {
        title?: string;
        type?: string;
        sendTo?: string;
        fromDate?: string;
        toDate?: string;
        pageSize?: number;
        pageNumber?: number;
        sortPropertyName?: string;
        sortIsAscending?: boolean;
    }) {
        const q: any = {
            pageSize: String(params.pageSize ?? 20),
            pageNumber: String(params.pageNumber ?? 1)
        };
        if (params.title != null && params.title.trim()) q.title = params.title.trim();
        if (params.type != null && params.type.trim()) q.type = params.type.trim();
        if (params.sendTo != null && params.sendTo.trim()) q.sendTo = params.sendTo.trim();
        if (params.fromDate != null && params.fromDate.trim()) q.fromDate = params.fromDate.trim();
        if (params.toDate != null && params.toDate.trim()) q.toDate = params.toDate.trim();
        if (params.sortPropertyName != null && params.sortPropertyName.trim()) q.sortPropertyName = params.sortPropertyName.trim();
        if (params.sortIsAscending != null) q.sortIsAscending = params.sortIsAscending;
        return this.http.get<{ items: any[]; totalCount: number }>(this.apiUrl + `api/notifications`, { params: q });
    }

    /** Get single notification history item by id (for View panel). */
    getNotificationHistoryById(id: string) {
        return this.http.get<any>(this.apiUrl + `api/notifications/${id}`);
    }

    /** Update notification history record (Title, Type, SendTo, CreatedAt, Link, Message). */
    updateNotificationHistory(id: string, body: { title: string; message: string; type: string; linkUrl?: string; sendTo?: string; categoryId?: string; createdAt?: string }) {
        return this.http.put<{ message: string }>(this.apiUrl + `api/notifications/${id}`, body);
    }

    /** Delete notification history record. */
    deleteNotificationHistory(id: string) {
        return this.http.delete<{ message: string }>(this.apiUrl + `api/notifications/${id}`);
    }
}


