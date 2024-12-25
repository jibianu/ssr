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

    getCourses(params): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/course`, { params });
    }

    getCourseById(id) {
        return this.http.get<any>(this.apiUrl + `page/course/id/` + id);
    }

    getCourseByCanonicalURL(url) {
        return this.http.get<any>(this.apiUrl + `page/course/course/` + url);
    }

    getDashboardCourses() {
        return this.http.get<any>(this.apiUrl + `page/course/Dashboard`);
    }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl + `page/category`);
    }

    getCourseByCategoryId(id) {
        return this.http.get<any>(this.apiUrl + `page/Course/` + id + '/Dashboard');
    }

    getDashboardCategories() {
        return this.http.get<any>(this.apiUrl + `page/Category/Dashboard`);
    }

    getCourseByCanonicalLocationURL(courseUrl, locationUrl){
        return this.http.get<any>(this.apiUrl + `page/course/course/` + courseUrl + '/location/' + locationUrl);
    }
}

