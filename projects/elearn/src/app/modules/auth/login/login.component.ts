import { AuthenticationService, getLandingRoute } from './../auth.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

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
    logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
    /** True when Google OAuth (code flow) is configured; custom button shown immediately, no SDK load. */
    googleEnabled = !!(environment.oauthKey && environment.googleRedirectUri);

    /** Blocking modal when role is not configured */
    showAlert = false;
    alertMessage = '';

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private authenticationService: AuthenticationService,
        private adminAppService: AdminAppService
    ) { }

  ngOnInit(): void {
    const returnUrl = (this.route.snapshot.queryParams['returnUrl'] ?? this.route.snapshot.queryParams['redirect'] ?? '').toString().trim();
    if (returnUrl && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('returnUrl', returnUrl);
      } catch (_) {}
    }
  }

  /**
   * Custom UI, response_type=code: redirect to Google OAuth. Google redirects back with code; backend exchanges for id_token and verifies.
   * Pass redirect URL (e.g. /checkout/123) via state so after login we can send user back to checkout.
   */
  continueWithGoogle(): void {
    const clientId = environment.oauthKey?.trim();
    const redirectUri = (environment.googleRedirectUri || `${window.location.origin}/auth/google-callback`).trim().replace(/\/+$/, '');
    if (!clientId || !redirectUri) return;
    const redirect = (this.route.snapshot.queryParams['redirect'] ?? this.route.snapshot.queryParams['returnUrl'] ?? '').toString().trim();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile'
    });
    if (redirect) {
      params.set('state', redirect);
    }
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async loginWithCognito() {
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
                  this.router.navigateByUrl(returnUrl);
                }
                return;
              }
              const route = getLandingRoute(res);
              if (route) {
                this.router.navigate([route]);
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
      this.router.navigate(['/auth/login']);
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
