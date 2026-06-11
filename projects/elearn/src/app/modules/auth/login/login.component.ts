import { AuthenticationService, getLandingRoute } from './../auth.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isCompanyTenantLoginHost, getTenantSubdomainFromHostname } from 'src/app/core/company-portal-host.util';
import { tryRedirectToCompanyPortalAfterLogin } from 'src/app/core/helpers/company-portal-redirect.helper';
import { getDefaultLogoUrl } from 'src/app/core/logo-url.util';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { getGoogleOAuthRedirectUri, launchGoogleOAuth, isEmbeddedBrowser } from 'src/app/core/google-oauth-redirect.util';
import { jsonProp } from 'src/app/core/api-json.util';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: false
})
export class LoginComponent implements OnInit {

    email: string = '';
    password: string = '';
    socialUser: any;
    isLoggedin: boolean | false;
    /** Logo URL from S3 when set in environment; otherwise local asset */
    logoUrl = environment.logoUrl || getDefaultLogoUrl();
    /** True when Google OAuth (code flow) is configured; custom button shown immediately, no SDK load. */
    googleEnabled = !!environment.oauthKey?.trim();

    /** Company portal: one SSO row (OIDC when enabled in API, else Cognito fallback if configured, else still shown so admin can enable SSO). */
    showCompanyPortalSsoButton = false;

    tenantSubdomain: string | null = null;
    companySsoPublic: Record<string, unknown> | null = null;
    loadingSsoConfig = false;
    enterpriseSsoButtonLabel = 'Company SSO';

    /** Consumer Google button (hidden on company tenant hosts). */
    showGoogleOAuthButton = false;

    /** Blocking modal when role is not configured */
    showAlert = false;
    alertMessage = '';

    /** True when the app is open inside an in-app browser / WebView. Google blocks OAuth here (Error 403: disallowed_useragent). */
    inAppBrowser = false;
    /** Authorize URL shown for "open in your browser" guidance when inAppBrowser is true. */
    oauthOpenInBrowserUrl = '';
    /** Shown after we ask the user to open the page in their system browser. */
    showOpenInBrowserHint = false;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService,
        private adminAppService: AdminAppService
    ) { }

  ngOnInit(): void {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const onCompanyTenant = isCompanyTenantLoginHost(host);
    this.tenantSubdomain = getTenantSubdomainFromHostname(host);
    this.showGoogleOAuthButton = this.googleEnabled && !onCompanyTenant;
    this.inAppBrowser = isEmbeddedBrowser();

    if (onCompanyTenant && this.tenantSubdomain) {
      this.loadingSsoConfig = true;
      this.authenticationService.getCompanySsoPublicConfig(this.tenantSubdomain).subscribe({
        next: (cfg) => {
          this.companySsoPublic = cfg;
          this.applyTenantSsoUi();
          this.loadingSsoConfig = false;
          const rec = cfg as Record<string, unknown>;
          const auto = !!jsonProp<boolean>(rec, 'AutoRedirectEnabled', 'autoRedirectEnabled');
          const enabled = !!jsonProp<boolean>(rec, 'SsoEnabled', 'ssoEnabled');
          if (enabled && auto) {
            setTimeout(() => this.continueWithEnterpriseSso(), 0);
          }
        },
        error: () => {
          this.companySsoPublic = null;
          this.applyTenantSsoUi();
          this.loadingSsoConfig = false;
        }
      });
    } else {
      this.applyTenantSsoUi();
    }

    const returnUrl = (this.route.snapshot.queryParams['returnUrl'] ?? this.route.snapshot.queryParams['redirect'] ?? '').toString().trim();
    if (returnUrl && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('returnUrl', returnUrl);
      } catch (_) {}
    } else if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('returnUrl');
      } catch (_) {}
    }

    if (this.authenticationService.currentUser() && this.authenticationService.currentToken()) {
      this.redirectAuthenticatedUser(returnUrl);
    }
  }

  /** Already signed in — leave login and go to returnUrl or role home. */
  private redirectAuthenticatedUser(returnUrl: string): void {
    if (returnUrl) {
      if (returnUrl.startsWith('http')) {
        window.location.href = returnUrl;
      } else {
        this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      }
      return;
    }
    this.authenticationService.postLogin().pipe(first()).subscribe({
      next: (res) => {
        if (tryRedirectToCompanyPortalAfterLogin(res, this.authenticationService.currentUser(), '')) {
          return;
        }
        const route = getLandingRoute(res);
        if (route) {
          this.router.navigateByUrl(route, { replaceUrl: true });
        }
      }
    });
  }

  tenantInfoTitle: string | null = null;
  tenantInfoSubtitle: string | null = null;
  tenantPrimaryColor: string | null = null;
  tenantLoginBackgroundUrl: string | null = null;

  /** When true, company tenant login hides email/password (SSO-only). */
  hideLocalCredentials = false;

  private readonly cognitoFallbackConfigured = !!(
    environment.cognitoHostedUiDomain?.trim() &&
    environment.cognitoClientId?.trim()
  );

  private applyTenantSsoUi(): void {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const onCompanyTenant = isCompanyTenantLoginHost(host);
    const p = this.companySsoPublic as Record<string, unknown> | null;
    const apiEnabled = !!jsonProp<boolean>(p, 'SsoEnabled', 'ssoEnabled');
    /** Only offer SSO when we loaded tenant config and either OIDC is on or Cognito fallback exists. Otherwise password login is the path. */
    this.showCompanyPortalSsoButton =
      onCompanyTenant &&
      !!this.tenantSubdomain &&
      p != null &&
      (apiEnabled || this.cognitoFallbackConfigured);
    const pt = Number(jsonProp<number>(p, 'ProviderType', 'providerType') ?? 0);
    const restrict = !!jsonProp<boolean>(p, 'RestrictLoginToSsoOnly', 'restrictLoginToSsoOnly');
    this.hideLocalCredentials = onCompanyTenant && apiEnabled && restrict;
    if (apiEnabled) {
      if (pt === 1) {
        this.enterpriseSsoButtonLabel = 'Sign in with Microsoft';
      } else if (pt === 2) {
        this.enterpriseSsoButtonLabel = 'Sign in with Google';
      } else if (pt === 3) {
        this.enterpriseSsoButtonLabel = 'Sign in with Okta';
      } else if (pt === 4) {
        this.enterpriseSsoButtonLabel = 'Sign in with Auth0';
      } else if (pt === 5) {
        this.enterpriseSsoButtonLabel = 'Sign in with OneLogin';
      } else if (pt === 7) {
        this.enterpriseSsoButtonLabel = 'Sign in with SSO';
      } else {
        this.enterpriseSsoButtonLabel = 'Company SSO';
      }
    } else if (this.cognitoFallbackConfigured) {
      this.enterpriseSsoButtonLabel = 'Company SSO';
    } else {
      this.enterpriseSsoButtonLabel = 'Sign in with SSO';
    }
    const welcome = jsonProp<string>(p, 'WelcomeMessage', 'welcomeMessage')?.trim();
    const portalName = jsonProp<string>(p, 'PortalDisplayName', 'portalDisplayName')?.trim();
    if (portalName || welcome) {
      this.tenantInfoTitle = portalName || welcome || null;
      this.tenantInfoSubtitle = portalName && welcome && welcome !== portalName ? welcome : null;
    } else {
      this.tenantInfoTitle = null;
      this.tenantInfoSubtitle = null;
    }
    const logo = jsonProp<string>(p, 'LogoUrl', 'logoUrl');
    if (logo) {
      this.logoUrl = logo;
    }
    const color = jsonProp<string>(p, 'PrimaryColorHex', 'primaryColorHex');
    this.tenantPrimaryColor = color && /^#[0-9A-Fa-f]{3,8}$/.test(color) ? color : null;
    const bg = jsonProp<string>(p, 'LoginBackgroundUrl', 'loginBackgroundUrl');
    this.tenantLoginBackgroundUrl = bg || null;
  }

  /** Single entry for the company-portal SSO row (replaces a separate Google OAuth affordance on tenant hosts). */
  continueCompanyPortalSignIn(): void {
    const p = this.companySsoPublic as Record<string, unknown> | null;
    const apiEnabled = !!jsonProp<boolean>(p, 'SsoEnabled', 'ssoEnabled');
    if (apiEnabled) {
      this.continueWithEnterpriseSso();
      return;
    }
    if (this.cognitoFallbackConfigured) {
      this.continueWithCompanySso();
      return;
    }
    this.continueWithEnterpriseSso();
  }

  continueWithEnterpriseSso(): void {
    if (!this.tenantSubdomain) {
      return;
    }
    const redirectUri = `${window.location.origin}/sso-callback`.replace(/\/+$/, '');
    const redirect = (this.route.snapshot.queryParams['redirect'] ?? this.route.snapshot.queryParams['returnUrl'] ?? '').toString().trim();
    try {
      sessionStorage.setItem('companySsoSubdomain', this.tenantSubdomain);
      if (redirect) {
        sessionStorage.setItem('companySsoReturnState', redirect);
      } else {
        sessionStorage.removeItem('companySsoReturnState');
      }
    } catch (_) {}
    this.authenticationService
      .initCompanySsoLogin({
        subdomain: this.tenantSubdomain,
        redirectUri,
        state: redirect || undefined
      })
      .subscribe({
        next: (r) => {
          const rec = r as Record<string, unknown>;
          const url = jsonProp<string>(rec, 'AuthorizeUrl', 'authorizeUrl');
          if (url) {
            window.location.href = url;
          } else {
            alert('Could not start company sign-in.');
          }
        },
        error: (err) => {
          const msg = err?.error?.messages?.[0] ?? err?.message ?? 'Could not start company sign-in.';
          alert(msg);
        }
      });
  }

  /**
   * Custom UI, response_type=code: redirect to Google OAuth. Google redirects back with code; backend exchanges for id_token and verifies.
   * Pass redirect URL (e.g. /checkout/123) via state so after login we can send user back to checkout.
   */
  continueWithGoogle(): void {
    const clientId = environment.oauthKey?.trim();
    const redirectUri = getGoogleOAuthRedirectUri();
    if (!clientId || !redirectUri) return;
    const redirect = (this.route.snapshot.queryParams['redirect'] ?? this.route.snapshot.queryParams['returnUrl'] ?? '').toString().trim();
    const result = launchGoogleOAuth(clientId, redirectUri, redirect || undefined);
    if (!result.launched && result.embedded) {
      // In-app browser (Instagram/LinkedIn/Gmail/etc.): Google blocks OAuth here.
      // Guide the user to open the page in their secure system browser.
      this.inAppBrowser = true;
      this.oauthOpenInBrowserUrl = window.location.href;
      this.showOpenInBrowserHint = true;
    }
  }

  /** Copy the current page URL so the user can paste it into Chrome/Safari. */
  async copyOpenInBrowserUrl(): Promise<void> {
    const url = this.oauthOpenInBrowserUrl || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      await navigator.clipboard.writeText(url);
      this.alertMessage = 'Link copied. Open your browser (Chrome or Safari) and paste it to sign in with Google.';
      this.showAlert = true;
    } catch {
      this.alertMessage = 'Please copy this link and open it in Chrome or Safari to sign in with Google: ' + url;
      this.showAlert = true;
    }
  }

  /**
   * Cognito Hosted UI (SAML/OIDC company IdP). Redirect URI must be registered for this origin (including *.localhost in dev).
   * Optional env `cognitoCompanyIdentityProvider` skips the Hosted UI picker and sends users straight to that IdP.
   */
  continueWithCompanySso(): void {
    if (!this.cognitoFallbackConfigured) {
      alert('Company sign-in is not configured for this environment. Use your work email and password, or contact your administrator.');
      return;
    }
    let base = environment.cognitoHostedUiDomain!.trim().replace(/\/+$/, '');
    if (!base.toLowerCase().startsWith('https://')) {
      base = 'https://' + base;
    }
    const authorizeUrl = `${base}/oauth2/authorize`;
    const redirectUri = (environment.cognitoRedirectUri || '').trim() || `${window.location.origin}/callback`;
    const redirect = (this.route.snapshot.queryParams['redirect'] ?? this.route.snapshot.queryParams['returnUrl'] ?? '').toString().trim();
    const params = new URLSearchParams({
      client_id: environment.cognitoClientId!.trim(),
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: redirectUri
    });
    const idp = (environment as unknown as Record<string, string | undefined>).cognitoCompanyIdentityProvider?.trim();
    if (idp) {
      params.set('identity_provider', idp);
    }
    if (redirect) {
      params.set('state', redirect);
    }
    window.location.href = `${authorizeUrl}?${params.toString()}`;
  }

  async loginWithCognito() {
      if (this.hideLocalCredentials) {
        return;
      }
      // debugger
      try {
        // var user = await Auth.signIn(this.email.toString(), this.password.toString());
        // console.log('Authentication performed for user=' + this.email + 'password=' + this.password + ' login result==' + user);
        // var tokens = user.signInUserSession;
        // if (tokens != null) {
        //  await this.getTokenCognito();
        // }
        await this.getTokenCognito();
      } catch (error) {

        console.log(error);

        alert('User Authentication failed');

      }

    }
    async getTokenCognito() {
      try {
        var user = this.authenticationService.login(this.email.toString(), this.password.toString())
        .subscribe(
          response => {
            // API returns PascalCase (IsSuccess, Token); support both
            const isSuccess = response?.isSuccess ?? response?.IsSuccess;
            const token = response?.token ?? response?.Token;
            if (isSuccess && token) {
              this.getUserInfo();
            } else {
              const msg = response?.Message ?? response?.message ?? 'Invalid username or password';
              alert(msg);
            }
            // else{
            //   const NEW_PASSWORD_REQUIRED='NEW_PASSWORD_REQUIRED';
            //   const User_Not_Confirmed='User Not Confirmed';
            //   switch(response.message){
            //     case NEW_PASSWORD_REQUIRED:
            //       this.router.navigate(['auth','change-password'],{queryParams:{code:btoa(this.email)}});
            //       break;
            //       case User_Not_Confirmed:
            //         this.router.navigate(['auth','verification'],{queryParams:{code:btoa(this.email)}});
            //       break;
            //       default:

            //   }
            // }
          },
          error => {
            console.log(error);
            // if(error.status==500){
            //   if(error && error.error && error.error.Messages && error.error.Messages.length){
            //     if(error.error.Messages[0]=="User Not Confirmed"){
            //       this.router.navigate(['auth','verification'],{queryParams:{code:btoa(this.email)}});
            //     }
            //   }
            // }
          });
      } catch (error) {

        console.log(error);

        alert('Something went wrong!');

      }

    }
    getUserInfo() {
      this.authenticationService.getUserInfo().pipe(first()).subscribe({
        next: () => {
          this.authenticationService.postLogin().pipe(first()).subscribe({
            next: (res) => {
              if (!res.isValidUser) {
                this.showRoleNotConfiguredModal();
                return;
              }
              const queryParams = this.route.snapshot.queryParams;
              let returnUrl = (queryParams['redirect'] ?? queryParams['returnUrl'] ?? '').toString().trim();
              if (!returnUrl && typeof localStorage !== 'undefined') {
                try {
                  returnUrl = (localStorage.getItem('returnUrl') ?? '').trim();
                  if (returnUrl) localStorage.removeItem('returnUrl');
                } catch (_) {}
              }
              if (returnUrl) {
                const courseMatch = returnUrl.match(/^\/app\/student\/course\/([^/?#]+)/);
                if (courseMatch) {
                  const courseId = courseMatch[1];
                  this.adminAppService.startPurchase(courseId).pipe(first()).subscribe({
                    next: (res: any) => {
                      const redirectUrl = (res?.redirectUrl ?? '').toString().trim();
                      if (redirectUrl) {
                        if (redirectUrl.startsWith('http')) {
                          window.location.href = redirectUrl;
                        } else {
                          this.router.navigateByUrl(redirectUrl);
                        }
                      } else {
                        this.router.navigate(['/checkout', courseId]);
                      }
                    },
                    error: () => {
                      this.router.navigate(['/checkout', courseId]);
                    }
                  });
                  return;
                }
                if (returnUrl.startsWith('http')) {
                  window.location.href = returnUrl;
                } else {
                  const openRegistration = queryParams['openRegistration'] === '1';
                  const tree = this.router.parseUrl(returnUrl);
                  if (openRegistration) {
                    tree.queryParams = { ...tree.queryParams, openRegistration: '1' };
                  }
                  this.router.navigateByUrl(tree, { replaceUrl: true });
                }
                return;
              }
              if (tryRedirectToCompanyPortalAfterLogin(res, this.authenticationService.currentUser(), returnUrl)) {
                return;
              }
              const route = getLandingRoute(res);
              if (route) {
                this.router.navigateByUrl(route, { replaceUrl: true });
              } else {
                this.showRoleNotConfiguredModal();
              }
            },
            error: () => this.showRoleNotConfiguredModal()
          });
        },
        error: () => this.showRoleNotConfiguredModal()
      });
    }

    showRoleNotConfiguredModal(): void {
      this.alertMessage = 'User role is not configured. Please contact administrator.';
      this.showAlert = true;
    }

    closeAlert(): void {
      this.showAlert = false;
      this.alertMessage = '';
    }

    closeAlertAndLogout(): void {
      this.closeAlert();
      this.authenticationService.logout();
      this.router.navigate(['/login']);
    }

    isVisible: boolean = false; 
    toggleVisibility() { 
      this.isVisible = true
     }
     toggleinVisibility(){
      this.isVisible = false
     }
  }





  
// import { AuthenticationService } from './../auth.service';
// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { ActivatedRoute, Router } from '@angular/router';
// import { first } from 'rxjs/operators';
// import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
// import { Role } from 'src/app/shared/models/role';
// import { Auth } from 'aws-amplify';

// @Component({
//   selector: 'app-login',
//   templateUrl: './login.component.html',
//   styleUrls: ['./login.component.scss']
// })
// export class LoginComponent implements OnInit {

//   loginForm: FormGroup;
//   loading = false;
//   submitted = false;
//   returnUrl: string;
//   error = '';
//   email: string = '';
//  password: string = '';
  

//   constructor(
//     private formBuilder: FormBuilder,
//     private route: ActivatedRoute,
//     private router: Router,
//     private authenticationService: AuthenticationService,
//     private toasterService: ToasterService
//   ) { }

//   ngOnInit():void {
//   }
//   async loginWithCognito() {
//           try {
//     this.loginForm = this.formBuilder.group({
//       email: ['', Validators.required],
//       password: ['', Validators.required]
//     });

// //   ngOnInit(): void {
// //     }
// //     async loginWithCognito() {
// //       try {
// //         var user = await Auth.signIn(this.email.toString(), this.password.toString());
// //         console.log('Authentication performed for user=' + this.email + 'password=' + this.password + ' login result==' + user);
// //         var tokens = user.signInUserSession;
// //         if (tokens != null) {
// //           console.log('User authenticated');
// //          // this.router.navigate(['home']);
// //           alert('You are logged in successfully !');
// //           this.router.navigateByUrl('/app/admin')
// //         }


//     // get return url from route parameters or default to '/'
//     this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/admin';
//   }

//   // convenience getter for easy access to form fields
//   //get f() { return this.loginForm.controls; }

// onSubmit() {
//     this.submitted = true;

//     // stop here if form is invalid
//     if (this.loginForm.invalid) {
//       return;
//     }

//     this.loading = true;
//     this.authenticationService.login(this.email.toString(), this.password.toString())
//       .pipe(first())
//       .subscribe(
//         data => {
//           if (data) {
//             this.loginWithCognito();
//             this.toasterService.showSuccess('Logged in successfully');

//           }
//         },
//         error => {
//           this.error = error;
//           this.loading = false;
//         });
//   }

//   this.loginWithCognito()
//     this.authenticationService.getUserInfo().pipe(first()).subscribe((data: any) => {
//       if (data) {
//         const user = data;
//         const role = user.roleId;
//         if (role === Role.Admin || role === Role.Manager) {
//           this.router.navigate(['/app/admin']);
//         } else if (role === Role.Trainer) {
//           this.router.navigate(['/app/trainer']);
//         } else if (role === Role.Student) {
//           this.router.navigate(['/app/student']);
//         }
//       }
//     })
//   }

//   }
