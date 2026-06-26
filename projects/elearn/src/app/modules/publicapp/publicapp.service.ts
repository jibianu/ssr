import { Category } from './../adminapp/category/category.model';
import { Observable } from 'rxjs';
import { environment } from './../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';


@Injectable({ providedIn: 'root' })
export class PublicAppService {
    user: any;
    apiUrl = environment.apiUrl;
    constructor(private http: HttpClient) {
    }

    /** Requires auth. Use getPublicCourses() for public list (no login). */
    getCourses(params): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/course`, { params });
    }

    /** Public course list – no auth. Use for /list so it works when session expired or not logged in. */
    getPublicCourses(params: { pageNumber?: number; pageSize?: number; categorySlug?: string; search?: string }): Observable<any> {
        const p: any = {};
        if (params.pageNumber != null) p.pageNumber = params.pageNumber;
        if (params.pageSize != null) p.pageSize = params.pageSize;
        if (params.categorySlug) p.categorySlug = params.categorySlug;
        if (params.search) p.search = params.search;
        return this.http.get<any>(this.apiUrl + `api/public/courses`, { params: p });
    }

    getCourseById(id) {
        return this.http.get<any>(this.apiUrl + `api/course/id/` + id);
    }

    getCourseByCanonicalURL(url) {
        return this.http.get<any>(this.apiUrl + `api/course/` + url);
    }

    /** Get course by slug (SEO-friendly). Use for routes like /api-570-closed-book-mock-exam?ref=CODE */
    getCourseBySlug(slug: string) {
        return this.http.get<any>(this.apiUrl + `api/course/by-slug/` + encodeURIComponent(slug));
    }

    getDashboardCourses() {
        return this.http.get<any>(this.apiUrl + `api/course/Dashboard`);
    }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl + `api/category`);
    }

    getCourseByCategoryId(id) {
        return this.http.get<any>(this.apiUrl + `api/Course/` + id + '/Dashboard');
    }

    getDashboardCategories() {
        return this.http.get<any>(this.apiUrl + `page/Category/Dashboard`);
    }

    getCourseByCanonicalLocationURL(courseUrl, locationUrl){
        return this.http.get<any>(this.apiUrl + `api/course/` + courseUrl + '/' + locationUrl);
    }
}

