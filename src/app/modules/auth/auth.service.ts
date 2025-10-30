import { environment } from './../../../environments/environment';
import { CookieService } from './../../core/services/cookie.service';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';


@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    user: any;
    token: any;
    apiUrl = environment.apiUrl;
    
    // Cached observable to prevent redundant API calls
    private userInfoCache$: Observable<any> | null = null;
    
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
    // ✅ PERFORMANCE: Login doesn't need caching - always requires fresh auth
    login(username: string, password: string): Observable<string> {
        return this.http.post<any>(this.apiUrl + `page/account/login`, { username, password })
            .pipe(
                map(token => {
                    // login successful if there's a jwt token in the response
                    if (token.token) {
                        this.token = token.token;
                        // store user details and jwt in cookie
                        if (isPlatformBrowser(this.platformId)) {
                            this.cookieService.setCookie('token', JSON.stringify(token.token));
                        }
                        // ✅ PERFORMANCE: Clear user info cache on login to force refresh
                        this.userInfoCache$ = null;
                    }
                    return token.token;
                }),
                catchError(error => {
                    console.error('Login error:', error);
                    throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
                })
            );
    }

    register(obj): Observable<any> {
        return this.http.post<any>(this.apiUrl + `page/account/register`, obj).pipe(
            catchError(error => {
                console.error('Registration error:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    // ✅ PERFORMANCE: Cache user info - called after login and in multiple components
    getUserInfo(): Observable<any> {
        if (!this.userInfoCache$) {
            this.userInfoCache$ = this.http.get(this.apiUrl + `page/Account/getinfo`).pipe(
                map(user => {
                    if (user) {
                        this.user = user;
                        if (isPlatformBrowser(this.platformId)) {
                            this.cookieService.setCookie('currentUser', JSON.stringify(user));
                        }
                    }
                    return user;
                }),
                shareReplay({ bufferSize: 1, refCount: true }), // ✅ PERFORMANCE: refCount=true releases memory when no subscribers
                catchError(error => {
                    console.error('Error fetching user info:', error);
                    this.userInfoCache$ = null; // ✅ ERROR HANDLING: Clear cache on error to allow retry
                    return of(null); // ✅ ERROR HANDLING: Return null instead of throwing
                })
            );
        }
        return this.userInfoCache$;
    }

    /**
     * Logout the user
     */
    logout(): void {
        // remove user from local storage to log user out
        this.cookieService.deleteCookie('currentUser');
        this.cookieService.deleteCookie('token');
        this.user = null;
        // Clear user info cache on logout
        this.userInfoCache$ = null;
    }
}

