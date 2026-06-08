import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { AuthenticationService, ROLE_LANDING_ROUTES } from '../../../auth/auth.service';
import { environment } from 'src/environments/environment';
import { getGoogleOAuthRedirectUri, launchGoogleOAuth, isEmbeddedBrowser } from 'src/app/core/google-oauth-redirect.util';

@Component({
    selector: 'app-public-course-home',
    templateUrl: './public-course-home.component.html',
    styleUrls: ['./public-course-home.component.scss'],
    standalone: false
})
export class PublicCourseHomeComponent implements OnInit, OnDestroy {

  items = [];
  categories = [];
  subscription: Subscription = new Subscription();
  /** Left-side login form */
  loginEmail = '';
  loginPassword = '';
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  googleEnabled = !!(environment.oauthKey && environment.googleRedirectUri);

  constructor(
    private publicAppService: PublicAppService,
    private authenticationService: AuthenticationService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // this.fetchDashboardCategories();
  }

  onLoginSubmit(): void {
    if (!this.loginEmail?.trim() || !this.loginPassword) return;
    this.subscription.add(
      this.authenticationService.login(this.loginEmail.trim(), this.loginPassword).subscribe({
        next: (response) => {
          const isSuccess = response?.isSuccess ?? response?.IsSuccess;
          const token = response?.token ?? response?.Token;
          if (isSuccess && token) {
            this.landingGetUserInfo();
          } else {
            const msg = response?.Message ?? response?.message ?? 'Invalid username or password';
            alert(msg);
          }
        },
        error: () => alert('User Authentication failed')
      })
    );
  }

  private landingGetUserInfo(): void {
    this.authenticationService.getUserInfo().pipe(first()).subscribe({
      next: () => {
        this.authenticationService.postLogin().pipe(first()).subscribe({
          next: (res) => {
            if (!res?.isValidUser) {
              alert('User role is not configured. Please contact administrator.');
              return;
            }
            const route = ROLE_LANDING_ROUTES[res.roleId];
            if (route) {
              const queryParams = this.route.snapshot.queryParams;
              if (queryParams.redirect && (String(queryParams.redirect).includes('/checkout/') || String(queryParams.redirect).includes('/app/payment/checkout/'))) {
                this.router.navigate([queryParams.redirect]);
              } else {
                this.router.navigate([route]);
              }
            } else {
              alert('User role is not configured. Please contact administrator.');
            }
          },
          error: () => alert('User role is not configured. Please contact administrator.')
        });
      },
      error: () => alert('User role is not configured. Please contact administrator.')
    });
  }

  /** True when inside an in-app browser / WebView; Google blocks OAuth here (Error 403: disallowed_useragent). */
  inAppBrowser = isEmbeddedBrowser();

  continueWithGoogle(): void {
    const clientId = environment.oauthKey?.trim();
    const redirectUri = getGoogleOAuthRedirectUri();
    if (!clientId || !redirectUri) return;
    const result = launchGoogleOAuth(clientId, redirectUri);
    if (!result.launched && result.embedded) {
      this.inAppBrowser = true;
      alert('Google sign-in is blocked inside in-app browsers. Please open this page in Chrome or Safari to continue with Google, or sign in with your email and password.');
    }
  }

  isVisible: boolean = false; 
  toggleVisibility() { 
    this.isVisible = true
   }
   toggleinVisibility(){
    this.isVisible = false
   }

  fetchDashboardCategories() {
    this.subscription.add(this.publicAppService.getDashboardCategories()
      .subscribe(
        response => {
          this.categories = response;
          if (this.categories && this.categories.length > 0) {
            this.categories.forEach(element => {
              this.fetchCourseByCategoryId(element.id, element.name, element.sortOrder)
            });
          }
        },
        error => {
          console.log(error);
        }));
  }

  fetchCourseByCategoryId(id, name, sortOrder) {
    this.subscription.add(this.publicAppService.getCourseByCategoryId(id)
      .subscribe(
        response => {
          let obj = {
            categoryName: name,
            categoryCourse: response,
            sortOrder: sortOrder
          }
          this.items.push(obj);
          this.items.sort((a, b) => (a['sortOrder'] - b['sortOrder']));
        },
        error => {
          console.log(error);
        }));
  }

  onImgError(event) {
    event.target.src = 'https://via.placeholder.com/468x300?text=ono.blog.com';
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

  trackBySortOrder(index: number, companyProduct: any): string {
    return companyProduct.sortOrder;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
