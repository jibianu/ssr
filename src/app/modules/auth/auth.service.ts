import { environment } from './../../../environments/environment';
import { CookieService } from './../../core/services/cookie.service';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';


@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    user: any;
    token: any;
    apiUrl = environment.apiUrl;
    constructor(private http: HttpClient, private cookieService: CookieService,
        @Inject(PLATFORM_ID) private platformId: any,) {
    }

    /**
     * Returns the current user
     */
    public currentUser(): any {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.user) {
                this.user = JSON.parse(this.cookieService.getCookie('currentUser'));
            }
            return this.user;
        }
    }

    public currentToken(): any {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.token) {
                this.token = JSON.parse(this.cookieService.getCookie('token'));
            }
            return this.token;
        }
    }

    /**
     * Performs the auth
     * @param username username of user
     * @param password password of user
     */
    login(username: string, password: string) {
        return this.http.post<any>(this.apiUrl + `page/account/login`, { username, password })
            .pipe(map(token => {
                // login successful if there's a jwt token in the response
                if (token.token) {
                    this.token = token.token;
                    // store user details and jwt in cookie
                    this.cookieService.setCookie('token', JSON.stringify(token.token), 1);
                }
                return token.token;
            }));
    }

    register(obj) {
        return this.http.post<any>(this.apiUrl + `page/account/register`, obj)
    }

    getUserInfo() {
        return this.http.get(this.apiUrl + `page/account/getinfo`).pipe(map(user => {
            if (user) {
                this.user = user;
                this.cookieService.setCookie('currentUser', JSON.stringify(user), 1);
            }
            return user;
        }));
    }

    /**
     * Logout the user
     */
    logout() {
        // remove user from local storage to log user out
        this.cookieService.deleteCookie('currentUser');
        this.cookieService.deleteCookie('token');
        this.user = null;
    }
}

