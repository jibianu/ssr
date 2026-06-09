import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthenticationService } from '../auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { environment } from 'src/environments/environment';
import { getDefaultLogoUrl } from 'src/app/core/logo-url.util';
import { getGoogleOAuthRedirectUri, launchGoogleOAuth, isEmbeddedBrowser } from 'src/app/core/google-oauth-redirect.util';
import { parseRegistrationError } from '../auth-error.util';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: false
})
export class RegisterComponent implements OnInit {
  email = '';
  password = '';
  givenName = '';
  name = '';
  cid = '';

  /** Logo URL from environment; otherwise local asset. Same as Login. */
  logoUrl = environment.logoUrl || getDefaultLogoUrl();
  /** True when Google OAuth (code flow) is configured; same custom button as Login. */
  googleEnabled = !!environment.oauthKey?.trim();

  /** True when inside an in-app browser / WebView; Google blocks OAuth here (Error 403: disallowed_useragent). */
  inAppBrowser = false;
  /** Shown after we ask the user to open the page in their system browser. */
  showOpenInBrowserHint = false;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private toaster: ToasterService
  ) {
    this.activatedRoute.params.subscribe(res => {
      if (res && res['cid']) {
        this.cid = res['cid'];
      }
    });
  }

  /** Affiliate ref from ?ref=OILXXXXX; stored in localStorage for 30 days and sent on register. */
  private static readonly AFFILIATE_REF_KEY = 'affiliate_ref';
  /** Course from ?course=GUID (course-specific referral link); stored with same expiry as ref for checkout/attribution. */
  private static readonly AFFILIATE_REF_COURSE_KEY = 'affiliate_ref_course';
  private static readonly AFFILIATE_REF_DAYS = 30;

  ngOnInit(): void {
    this.inAppBrowser = isEmbeddedBrowser();
    this.activatedRoute.queryParams.subscribe(params => {
      const ref = params['ref'];
      const course = params['course'];
      if (ref && typeof ref === 'string' && ref.trim()) {
        try {
          localStorage.setItem(RegisterComponent.AFFILIATE_REF_KEY, ref.trim());
          const expires = new Date();
          expires.setDate(expires.getDate() + RegisterComponent.AFFILIATE_REF_DAYS);
          localStorage.setItem(RegisterComponent.AFFILIATE_REF_KEY + '_exp', expires.toISOString());
          if (course && typeof course === 'string' && course.trim()) {
            localStorage.setItem(RegisterComponent.AFFILIATE_REF_COURSE_KEY, course.trim());
            localStorage.setItem(RegisterComponent.AFFILIATE_REF_COURSE_KEY + '_exp', expires.toISOString());
          }
        } catch (_) {}
      }
    });
  }

  /**
   * Same as Login: redirect to Google OAuth (response_type=code). User returns to google-callback; backend exchanges code and issues app JWT.
   */
  continueWithGoogle(): void {
    const clientId = environment.oauthKey?.trim();
    const redirectUri = getGoogleOAuthRedirectUri();
    if (!clientId || !redirectUri) return;
    const result = launchGoogleOAuth(clientId, redirectUri);
    if (!result.launched && result.embedded) {
      this.inAppBrowser = true;
      this.showOpenInBrowserHint = true;
    }
  }

  /** Copy current page URL so the user can open it in Chrome/Safari to use Google sign-in. */
  async copyOpenInBrowserUrl(): Promise<void> {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      this.toaster.showSuccess('Link copied. Open Chrome or Safari and paste it to continue with Google.');
    } catch {
      this.toaster.showError('Open this page in Chrome or Safari to continue with Google.');
    }
  }

  register(): void {
    try {
      this.registerLocal();
    } catch (error) {
      console.log('error signing up:', error);
    }
  }

  /** Username default: part before @ (e.g. anush@gmail.com → anush). Backend may use this; user can change later in profile. */
  private usernameFromEmail(email: string): string {
    if (!email || typeof email !== 'string') return email || '';
    const at = email.indexOf('@');
    return at > 0 ? email.slice(0, at).trim() : email.trim();
  }

  registerLocal(): void {
    try {
      let affiliateCode: string | undefined;
      let affiliateCourseId: string | undefined;
      try {
        const exp = localStorage.getItem(RegisterComponent.AFFILIATE_REF_KEY + '_exp');
        if (exp && new Date(exp) > new Date()) {
          affiliateCode = localStorage.getItem(RegisterComponent.AFFILIATE_REF_KEY) ?? undefined;
        }
        if (!affiliateCode) {
          affiliateCode = this.getCookie(RegisterComponent.AFFILIATE_REF_KEY);
        }
        const courseExp = localStorage.getItem(RegisterComponent.AFFILIATE_REF_COURSE_KEY + '_exp');
        if (courseExp && new Date(courseExp) > new Date()) {
          affiliateCourseId = localStorage.getItem(RegisterComponent.AFFILIATE_REF_COURSE_KEY) ?? undefined;
        }
      } catch (_) {}
      const defaultUserName = this.usernameFromEmail(this.email) || this.email;
      const request: Record<string, string> = {
        LastName: this.email,
        FirstName: this.email,
        UserName: defaultUserName,
        Email: this.email,
        Password: this.password,
        CompanyUserName: this.cid
      };
      if (affiliateCode) request['AffiliateCode'] = affiliateCode;
      if (affiliateCourseId) request['AffiliateCourseId'] = affiliateCourseId;
      this.authenticationService
        .register(request)
        .pipe(first())
        .subscribe({
          next: () => {
            this.router.navigate(['/verification'], { queryParams: { code: btoa(this.email) } });
          },
          error: (err) => {
            this.handleRegisterError(err);
          }
        });
    } catch (error) {
      console.log('error signing up:', error);
    }
  }

  /**
   * Show an accurate signup error. Only a genuine duplicate account routes to login;
   * everything else (e.g. weak password, invalid email) shows the real backend message.
   * Backend error shape is { StatusCode, Messages: string[] } (see ErrorResponse / ExceptionMiddleware).
   */
  private handleRegisterError(err: any): void {
    const { message, isAlreadyExists } = parseRegistrationError(err);
    if (isAlreadyExists) {
      this.toaster.showError(message || 'An account with this email already exists. Please log in.');
      this.router.navigate(['/login']);
      return;
    }
    // Any other failure (400 validation, weak password, server error): show the real reason.
    console.error('Registration failed:', err?.status, err?.error ?? err);
    this.toaster.showError(message || 'Registration failed. Please check your details and try again.');
  }

  private getCookie(name: string): string | undefined {
    try {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2].trim()) : undefined;
    } catch (_) {
      return undefined;
    }
  }
}
