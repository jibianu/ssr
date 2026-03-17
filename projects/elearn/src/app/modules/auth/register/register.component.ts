import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthenticationService } from '../auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { environment } from 'src/environments/environment';

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
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  /** True when Google OAuth (code flow) is configured; same custom button as Login. */
  googleEnabled = !!(environment.oauthKey && environment.googleRedirectUri);

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
    const redirectUri = (environment.googleRedirectUri || `${window.location.origin}/auth/google-callback`).trim().replace(/\/+$/, '');
    if (!clientId || !redirectUri) return;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile'
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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
            this.router.navigate(['auth', 'verification'], { queryParams: { code: btoa(this.email) } });
          },
          error: (err) => {
            const msg = err?.error?.message ?? err?.message ?? '';
            const isAlreadyExists =
              err?.status === 409 ||
              /already exists|user already exist|(user|username|email).*exists/i.test(msg);
            if (isAlreadyExists) {
              this.toaster.showError('User already exists. Please log in.');
              this.router.navigate(['auth', 'login']);
            } else {
              console.log('error signing up:', err);
            }
          }
        });
    } catch (error) {
      console.log('error signing up:', error);
    }
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
