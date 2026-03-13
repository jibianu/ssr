import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthenticationService } from './modules/auth/auth.service';
import { AffiliateService } from './modules/affiliate/affiliate.service';
import { UtmService } from './services/utm.service';

const AFFILIATE_CLICK_SENT_KEY = 'affiliate_click_sent';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'Elearning';

  constructor(
    private auth: AuthenticationService,
    private router: Router,
    private utmService: UtmService,
    private affiliateService: AffiliateService
  ) {}

  ngOnInit(): void {
    // Restore session on refresh: if we have token but no currentUser cookie, fetch user so we stay signed in
    if (this.auth.currentToken() && !this.auth.currentUser()) {
      this.auth.getUserInfo().subscribe({
        error: () => {
          // Token expired or invalid; logout already done by interceptor – don't break app
        },
      });
    }
    // Capture UTM params from URL so they are available at checkout (revenue share attribution)
    this.utmService.captureFromUrl();
    this.recordAffiliateClickFromUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.utmService.captureFromUrl(this.router.url);
        this.recordAffiliateClickFromUrl(this.router.url);
      });
  }

  private static readonly AFFILIATE_REF_KEY = 'affiliate_ref';
  private static readonly AFFILIATE_REF_DAYS = 30;

  /**
   * When the URL contains ?ref=CODE (affiliate referral), record one click per session and store ref for registration.
   */
  private recordAffiliateClickFromUrl(urlOrQuery: string): void {
    if (!urlOrQuery || typeof sessionStorage === 'undefined') return;
    try {
      const query = urlOrQuery.includes('?') ? urlOrQuery.slice(urlOrQuery.indexOf('?') + 1) : urlOrQuery;
      const params = new URLSearchParams(query);
      const ref = params.get('ref')?.trim();
      if (!ref) return;
      this.setAffiliateRefStorage(ref);
      const sentKey = `${AFFILIATE_CLICK_SENT_KEY}_${ref}`;
      if (sessionStorage.getItem(sentKey)) return;
      sessionStorage.setItem(sentKey, '1');
      this.affiliateService.recordClick(ref).subscribe({
        next: () => {},
        error: () => { sessionStorage.removeItem(sentKey); }
      });
    } catch (_) {}
  }

  private setAffiliateRefStorage(code: string): void {
    try {
      localStorage.setItem(AppComponent.AFFILIATE_REF_KEY, code);
      const expires = new Date();
      expires.setDate(expires.getDate() + AppComponent.AFFILIATE_REF_DAYS);
      localStorage.setItem(AppComponent.AFFILIATE_REF_KEY + '_exp', expires.toISOString());
      document.cookie = `affiliate_ref=${encodeURIComponent(code)}; path=/; max-age=${AppComponent.AFFILIATE_REF_DAYS * 24 * 60 * 60}; SameSite=Lax`;
    } catch (_) {}
  }
}

// app.component.ts
// import { Component, OnInit } from '@angular/core';

// declare const google: any;  // Declare the google namespace for the Google API

// @Component({
//   selector: 'app-root',
//   templateUrl: './app.component.html',
//   styleUrls: ['./app.component.scss']
// })
// export class AppComponent implements OnInit {
//   title = 'Elearning';
//   ngOnInit(): void {
//     this.initializeGoogleSignIn();
//   }

//   initializeGoogleSignIn(): void {
//     // Initialize Google Identity Services
//     google.accounts.id.initialize({
//       client_id: '9001690783-2at0k49u0nkoe8qb3ucn8d76qv9ls073.apps.googleusercontent.com',
//       callback: (response: any) => this.handleCredentialResponse(response)
//     });
//   }

//   onGoogleSignIn(): void {
//     google.accounts.id.prompt();  // Trigger Google Sign-In prompt
//   }

//   handleCredentialResponse(response: any): void {
//     console.log('Encoded JWT ID token: ' + response.credential);

//     // Perform actions with the ID token, such as sending it to your backend for validation
//   }
// }
