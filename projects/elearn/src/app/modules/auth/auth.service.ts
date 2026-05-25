import { environment } from './../../../environments/environment';
import { normalizeRoleLandingRoute } from './../../core/helpers/app-url.helper';
import { CookieService } from './../../core/services/cookie.service';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';

/** Role source of truth = SQL. Same for Google and Local auth. */
export interface PostLoginResponse {
    isValidUser: boolean;
    roleId: number;
    /** True when user has an affiliate record; redirect to affiliate dashboard instead of student. */
    isAffiliate?: boolean;
}

/** Centralized role-to-landing-route mapping. Do NOT default to Student. */
export const ROLE_LANDING_ROUTES: Record<number, string> = {
    1: '/app/admin/students',        // Admin
    2: '/app/student/dashboard',     // Student
    3: '/app/trainer/course/list',   // Trainer
    4: '/app/company/dashboard',     // Company
    5: '/app/management/dashboard', // Management
    6: '/app/affiliate/dashboard'    // Affiliate (layout role)
};

/** Landing route after login. RoleId 6 = Affiliate (one user one role). */
export function getLandingRoute(res: PostLoginResponse): string | null {
    const roleId = res?.roleId ?? 0;
    const route = ROLE_LANDING_ROUTES[roleId];
    return route ? normalizeRoleLandingRoute(route) : null;
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    user: any;
    token: any;
    apiUrl = environment.apiUrl;

    /** Current user roleId from post-login (SQL). Set after postLogin() or from currentUser on refresh. */
    private roleIdSubject = new BehaviorSubject<number | null>(null);
    roleId$ = this.roleIdSubject.asObservable();

    constructor(private http: HttpClient, private cookieService: CookieService) {
    }
    
    // assign value at header based on header selection
    private dataSubject = new BehaviorSubject<string>('');
    data$ = this.dataSubject.asObservable();
  
    updateData(newData: string) {
         this.dataSubject.next(newData); 
    }
   obj = {
      // Flags: whether each content type exists for the current curriculum
      curriculumConceptCount: false,
      curriculumQuestionCount : false,
      curriculumStudyMaterialCount : false,
      curriculumTopicCount : false,
      curriculumVideoLectureCount : false,
      // Totals: numeric counts used for header/topbar badges
      curriculumConceptTotal: 0,
      curriculumQuestionTotal: 0,
      curriculumStudyMaterialTotal: 0,
      curriculumVideoLectureTotal: 0,
    }  

    curriculumData = new BehaviorSubject<any>(this.obj);
    curriculumDetails = new Subject<string>();
    selectedContent = new Subject<string>();
    courseStructure = new Subject<string>();

    commonCourse = new Subject<any>();


    /**
     * Returns the current user
     */
    public currentUser(): any {
        if (!this.user) {
            this.user = JSON.parse(this.cookieService.getCookie('currentUser'));
        }
        return this.user;
    }

    /** Update stored user's profile picture (e.g. after upload on profile page). Persists to cookie so topbar/sidebar and refresh show new image. */
    public updateUserProfilePicture(url: string | null): void {
        const u = this.currentUser();
        if (!u) return;
        u.profilePictureUrl = url ?? '';
        u.ProfilePictureUrl = url ?? '';
        this.user = u;
        this.cookieService.setCookie('currentUser', JSON.stringify(u), 1);
    }

    public currentToken(): string | null {
        if (this.token) {
            return this.normalizeToken(this.token);
        }
        try {
            const raw = this.cookieService.getCookie('token');
            if (!raw) return null;
            const parsed = JSON.parse(raw) as string;
            return this.normalizeToken(parsed);
        } catch {
            return null;
        }
    }

    /** Strip surrounding quotes if present (avoids sending invalid Bearer token) */
    private normalizeToken(t: string): string | null {
        if (!t || typeof t !== 'string') return null;
        const s = t.trim();
        if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
            return s.slice(1, -1);
        }
        return s;
    }

    /**
     * Performs the auth
     * @param username username of user
     * @param password password of user
     */
    login(username: string, password: string) {
        return this.http.post<any>(this.apiUrl + `api/account/login`, { username, password })
            .pipe(map(res => {
                const isSuccess = res?.isSuccess ?? res?.IsSuccess;
                const tokenValue = res?.token ?? res?.Token;
                if (isSuccess && tokenValue != null && tokenValue !== '') {
                    const tokenStr = typeof tokenValue === 'string' ? tokenValue : String(tokenValue);
                    this.token = tokenStr;
                    this.cookieService.setCookie('token', JSON.stringify(tokenStr), 1);
                }
                return res;
            }));
    }

    register(obj) {
        return this.http.post<any>(this.apiUrl + `api/account/registerstudent`, obj)
    }
    googleLogin(token){
        return this.http.post<any>(this.apiUrl+`api/account/google-login`,token)
        .pipe(map(res => {
            const isSuccess = res?.isSuccess ?? res?.IsSuccess;
            const tokenValue = res?.token ?? res?.Token;
            if (isSuccess && tokenValue != null && tokenValue !== '') {
                const tokenStr = typeof tokenValue === 'string' ? tokenValue : String(tokenValue);
                this.token = tokenStr;
                this.cookieService.setCookie('token', JSON.stringify(tokenStr), 1);
            }
            return res;
        }));
    }

    /**
     * Cognito Hosted UI callback: exchange authorization code for app JWT.
     * Call after redirect from Cognito (Google or other IdP). Backend verifies Cognito token and issues app token.
     */
    cognitoAuth(code: string, redirectUri: string): Observable<any> {
        return this.http.post<any>(this.apiUrl + 'api/account/cognito-auth', { code, redirectUri }).pipe(
            map(res => {
                const isSuccess = res?.isSuccess ?? res?.IsSuccess;
                const tokenValue = res?.token ?? res?.Token;
                if (isSuccess && tokenValue != null && tokenValue !== '') {
                    const tokenStr = typeof tokenValue === 'string' ? tokenValue : String(tokenValue);
                    this.token = tokenStr;
                    this.cookieService.setCookie('token', JSON.stringify(tokenStr), 1);
                }
                return res;
            })
        );
    }

    registerCompany(obj) {
        return this.http.post<any>(this.apiUrl + `api/account/registercompany`, obj)
    }

    /** Public: GET api/company/check-subdomain/{subdomain} → { available: boolean } */
    checkCompanySubdomainAvailable(subdomain: string) {
        const encoded = encodeURIComponent(subdomain.trim());
        return this.http.get<{ available: boolean }>(`${this.apiUrl}api/company/check-subdomain/${encoded}`);
    }

    getCompanySsoPublicConfig(subdomain: string) {
        const enc = encodeURIComponent((subdomain || '').trim());
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}api/sso/company/${enc}`);
    }

    initCompanySsoLogin(body: { subdomain: string; redirectUri: string; state?: string }) {
        return this.http.post<{ authorizeUrl: string }>(`${this.apiUrl}api/sso/login`, body);
    }

    completeCompanySsoCallback(body: { subdomain: string; code: string; redirectUri: string }) {
        return this.http.post<any>(`${this.apiUrl}api/sso/callback`, body).pipe(
            map(res => {
                const isSuccess = res?.isSuccess ?? res?.IsSuccess;
                const tokenValue = res?.token ?? res?.Token;
                if (isSuccess && tokenValue != null && tokenValue !== '') {
                    const tokenStr = typeof tokenValue === 'string' ? tokenValue : String(tokenValue);
                    this.token = tokenStr;
                    this.cookieService.setCookie('token', JSON.stringify(tokenStr), 1);
                }
                return res;
            })
        );
    }

    getCompanySsoSettings() {
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}api/company/sso/settings`);
    }

    saveCompanySsoSettings(body: Record<string, unknown>) {
        return this.http.post<{ saved: boolean }>(`${this.apiUrl}api/company/sso/save`, body);
    }

    listCompanyUsers(params: HttpParams) {
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}api/company/users`, { params });
    }

    getCompanyUser(id: string) {
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}api/company/users/${encodeURIComponent(id)}`);
    }

    createCompanyUser(body: Record<string, unknown>) {
        return this.http.post<Record<string, unknown>>(`${this.apiUrl}api/company/users`, body);
    }

    inviteCompanyUser(body: Record<string, unknown>) {
        return this.http.post<Record<string, unknown>>(`${this.apiUrl}api/company/users/invite`, body);
    }

    updateCompanyUser(id: string, body: Record<string, unknown>) {
        return this.http.put<Record<string, unknown>>(`${this.apiUrl}api/company/users/${encodeURIComponent(id)}`, body);
    }

    deleteCompanyUser(id: string) {
        return this.http.delete<Record<string, unknown>>(`${this.apiUrl}api/company/users/${encodeURIComponent(id)}`);
    }

    importCompanyUsersCsv(formData: FormData) {
        return this.http.post<Record<string, unknown>>(`${this.apiUrl}api/company/users/import`, formData);
    }

    exportCompanyUsersCsv(params: HttpParams) {
        return this.http.get(`${this.apiUrl}api/company/users/export/csv`, { params, responseType: 'blob' as const });
    }

    resetCompanyUserPassword(id: string, body: { newPassword: string }) {
        return this.http.post<Record<string, unknown>>(`${this.apiUrl}api/company/users/${encodeURIComponent(id)}/reset-password`, body);
    }

    listCompanyTrainers(params: HttpParams) {
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}api/company/trainers`, { params });
    }

    getCompanyTrainer(id: string) {
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}api/company/trainers/${encodeURIComponent(id)}`);
    }

    createCompanyTrainer(body: Record<string, unknown>) {
        return this.http.post<Record<string, unknown>>(`${this.apiUrl}api/company/trainers`, body);
    }

    inviteCompanyTrainer(body: Record<string, unknown>) {
        return this.http.post<Record<string, unknown>>(`${this.apiUrl}api/company/trainers/invite`, body);
    }

    updateCompanyTrainer(id: string, body: Record<string, unknown>) {
        return this.http.put<Record<string, unknown>>(`${this.apiUrl}api/company/trainers/${encodeURIComponent(id)}`, body);
    }

    deleteCompanyTrainer(id: string) {
        return this.http.delete<Record<string, unknown>>(`${this.apiUrl}api/company/trainers/${encodeURIComponent(id)}`);
    }

    exportCompanyTrainersCsv(params: HttpParams) {
        return this.http.get(`${this.apiUrl}api/company/trainers/export/csv`, { params, responseType: 'blob' as const });
    }

    /** Company admin: pending content permission requests from trainers in this organization. */
    listCompanyContentPermissionRequests(status = 0) {
        return this.http.get<unknown[]>(`${this.apiUrl}api/company/content-permission-requests`, {
            params: { status: String(status) }
        });
    }

    approveCompanyContentPermissionRequest(id: string) {
        return this.http.post<Record<string, unknown>>(
            `${this.apiUrl}api/company/content-permission-requests/${encodeURIComponent(id)}/approve`,
            {}
        );
    }

    rejectCompanyContentPermissionRequest(id: string) {
        return this.http.post<Record<string, unknown>>(
            `${this.apiUrl}api/company/content-permission-requests/${encodeURIComponent(id)}/reject`,
            {}
        );
    }

    registerTrainer(obj) {
        return this.http.post<any>(this.apiUrl + `api/account/registertrainer`, obj)
    }

    registerAffiliate(obj: { FirstName: string; LastName: string; UserName: string; Email: string; Password: string }) {
        return this.http.post<any>(this.apiUrl + `api/account/registeraffiliate`, obj);
    }

    registerManagement(obj) {
        return this.http.post<any>(this.apiUrl + `api/account/registermanagement`, obj)
    }
    // verifyUser(obj){
    //     return this.http.post<any>(this.apiUrl + `api/account/verifyUser`, obj)
    // }
    confirmation(obj) {
        return this.http.post<any>(this.apiUrl + `api/account/confirm`, obj)
    }
    ResendConformationCode(obj){
        return this.http.post<any>(this.apiUrl + `api/account/resend`, obj)
    }

    forgot(obj) {
        return this.http.post<any>(this.apiUrl + `api/account/forgot`, obj)
    }
    confirmforgot(obj){
        return this.http.post<any>(this.apiUrl + `api/account/confirmforgot`, obj)
    }
    change_password(obj){
        return this.http.post<any>(this.apiUrl + `api/account/change_password`, obj)
    }
    
    getUserInfo() {
        return this.http.get(this.apiUrl + `api/account/getinfo`).pipe(map((user: any) => {
            if (user) {
                // API may return PascalCase (ProfilePictureUrl); normalize so app can use profilePictureUrl
                const normalized = {
                    ...user,
                    profilePictureUrl: user.profilePictureUrl ?? user.ProfilePictureUrl,
                    roleId: user.roleId ?? user.RoleId,
                    companyId: user.companyId ?? user.CompanyId,
                    companyPortalSubdomain: user.companyPortalSubdomain ?? user.CompanyPortalSubdomain
                };
                this.user = normalized;
                this.cookieService.setCookie('currentUser', JSON.stringify(normalized), 1);
                const roleId = normalized.roleId;
                if (roleId != null) {
                    this.roleIdSubject.next(roleId);
                }
                return normalized;
            }
            return user;
        }));
    }

    /**
     * Post-login: resolve role from backend (SQL). Call after login + getUserInfo (Google or Local).
     * Role source of truth = SQL. Never infer role from OAuth provider.
     */
    /**
     * Free course enrollment. Call after login when returnUrl is /app/student/course/:courseId.
     */
    enrollFreeCourse(courseId: string): Observable<{ success?: boolean; alreadyEnrolled?: boolean; message?: string } | null> {
        const t = this.currentToken();
        if (!t) return of(null);
        return this.http.post<any>(this.apiUrl + 'api/course/enroll/free', { courseId }, {
            headers: { Authorization: 'Bearer ' + t }
        }).pipe(
            map(res => res ?? null),
            catchError(() => of(null))
        );
    }

    postLogin(): Observable<PostLoginResponse> {
        const t = this.currentToken();
        if (!t) {
            return of({ isValidUser: false, roleId: 0 });
        }
        return this.http.post<PostLoginResponse>(this.apiUrl + 'api/auth/post-login', {}, {
            headers: { Authorization: 'Bearer ' + t }
        }).pipe(
            map((res: any) => {
                const valid = res?.isValidUser ?? res?.IsValidUser;
                const roleId = res?.roleId ?? res?.RoleId;
                const isAffiliate = !!(res?.isAffiliate ?? res?.IsAffiliate);
                if (valid && roleId != null) {
                    this.roleIdSubject.next(roleId);
                } else {
                    this.roleIdSubject.next(null);
                }
                return { isValidUser: !!valid, roleId: roleId ?? 0, isAffiliate };
            }),
            catchError(() => {
                this.roleIdSubject.next(null);
                return of({ isValidUser: false, roleId: 0 });
            })
        );
    }

    /** Current roleId from memory or from stored user (e.g. on refresh). */
    getRoleId(): number | null {
        const fromSubject = this.roleIdSubject.getValue();
        if (fromSubject != null) return fromSubject;
        const u = this.currentUser();
        if (u && (u.roleId === 1 || u.roleId === 2 || u.roleId === 3 || u.roleId === 4 || u.roleId === 5 || u.roleId === 6)) {
            return u.roleId as number;
        }
        return null;
    }

    /** Stub for legacy callers; prefer postLogin() for role-based flow. */
    validateUser(): Observable<{ skipValidation?: boolean; isValidUser?: boolean }> {
        return of({ isValidUser: true });
    }

    /**
     * Logout the user
     */
    logout() {
        this.roleIdSubject.next(null);
        this.cookieService.deleteCookie('currentUser');
        this.cookieService.deleteCookie('token');
        this.user = null;
    }
}

