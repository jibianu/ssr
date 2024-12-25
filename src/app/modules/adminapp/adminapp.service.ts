import { Category } from './category/category.model';
import { Observable } from 'rxjs';
import { environment } from './../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';


@Injectable({ providedIn: 'root' })
export class AdminAppService {
    user: any;
    apiUrl = environment.apiUrl;
    constructor(private http: HttpClient) {
    }

    getCourses(params): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/course`, { params });
    }

    addCourse(obj) {
        return this.http.post<any>(this.apiUrl + `page/course`, obj);
    }

    updateCourse(obj, id) {
        return this.http.put<any>(this.apiUrl + `page/course/` + id, obj);
    }

    getCourseById(id) {
        return this.http.get<any>(this.apiUrl + `page/course/id/` + id);
    }

    getBlogByCanonicalURL(url) {
        return this.http.get<any>(this.apiUrl + `page/course/course/` + url);
    }

    getBlogByUser() {
        return this.http.get<any>(this.apiUrl + `page/course/user`);
    }

    deleteCourseById(id) {
        return this.http.delete<any>(this.apiUrl + `page/course/` + id);
    }

    addCategory(obj) {
        return this.http.post<any>(this.apiUrl + `page/category`, obj);
    }

    updateCategory(obj, id) {
        return this.http.put<any>(this.apiUrl + `page/category/` + id, obj);
    }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl + `page/category`);
    }

    getCategoryById(id): Observable<Category> {
        return this.http.get<any>(this.apiUrl + `page/category/` + id);
    }

    deleteCategoryById(id) {
        return this.http.delete<any>(this.apiUrl + `page/category/` + id);
    }

    getUsers(params) {
        return this.http.get<any>(this.apiUrl + `page/user`, { params });
    }

    getUserById(Id) {
        return this.http.get<any>(this.apiUrl + `page/user/` + Id);
    }

    createUser(obj) {
        return this.http.post<any>(this.apiUrl + `page/user`, obj);
    }

    updateUser(id, obj) {
        return this.http.put<any>(this.apiUrl + `page/user/` + id, obj);
    }

    deleteUserById(id) {
        return this.http.delete<any>(this.apiUrl + `page/user/` + id);
    }

    getUserInfo() {
        return this.http.get<any>(this.apiUrl + `page/account/getinfo/`);
    }

    profileUpdate(obj) {
        return this.http.put<any>(this.apiUrl + `page/account/updateinfo/`, obj);
    }

    passwordUpdate(obj) {
        return this.http.put<any>(this.apiUrl + `page/account/changepassword/`, obj);
    }

    uploadTitleImage(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `page/Course/TitleImage`, data);
    }

    uploadTeacherImage(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `page/Course/TeacherImage`, data);
    }

    addLocation(obj) {
        return this.http.post<any>(this.apiUrl + `page/location`, obj);
    }

    updateLocation(obj, id) {
        return this.http.put<any>(this.apiUrl + `page/location/` + id, obj);
    }

    getLocation(): Observable<any> {
        return this.http.get(this.apiUrl + `page/location`);
    }

    getLocationById(id) {
        return this.http.get<any>(this.apiUrl + `page/location/` + id);
    }

    addIcon(obj) {
        return this.http.post<any>(this.apiUrl + `page/icon`, obj);
    }

    updateIcon(obj, id) {
        return this.http.put<any>(this.apiUrl + `page/icon/` + id, obj);
    }

    deleteLocationById(id) {
        return this.http.delete<any>(this.apiUrl + `page/location/` + id);
    }

    getIcon(): Observable<any> {
        return this.http.get(this.apiUrl + `page/icon`);
    }

    getIconById(id) {
        return this.http.get<any>(this.apiUrl + `page/icon/` + id);
    }

    deleteIconById(id) {
        return this.http.delete<any>(this.apiUrl + `page/icon/` + id);
    }

    uploadIcon(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `page/icon/upload`, data);
    }
}

