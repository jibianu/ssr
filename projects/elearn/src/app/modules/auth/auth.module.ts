import { SharedModule } from './../../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RegisterComponent } from './register/register.component';
import { RegisterCompanyComponent } from './register-company/register-company.component';
import { RegisterTrainerComponent } from './register-trainer/register-trainer.component';
import { RegisterAffiliateComponent } from './register-affiliate/register-affiliate.component';
import { RegisterManagementComponent } from './register-management/register-management.component';
import { VerificationCodeComponent } from './verification-code/verification-code.component';
import { ForgetPasswordComponent } from './forget-password/forget-password.component';
import { ForgetPasswordVerificationComponent } from './forget-password-verification/forget-password-verification.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { GoogleCallbackComponent } from './google-callback/google-callback.component';
import { UserUnavailableComponent } from './user-unavailable/user-unavailable.component';

@NgModule({
  declarations: [
    UserUnavailableComponent,
    LoginComponent,
    RegisterComponent,
    RegisterCompanyComponent,
    RegisterTrainerComponent,
    RegisterAffiliateComponent,
    RegisterManagementComponent,
    VerificationCodeComponent,
    ForgetPasswordComponent,
    ForgetPasswordVerificationComponent,
    ChangePasswordComponent,
    AuthCallbackComponent,
    GoogleCallbackComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    SharedModule,
    // SocialLoginModule,
    // GoogleSigninButtonModule
  ],
  providers:[
    // {
    //   provide:'SocialAuthServiceConfig',
    //   useValue:{
    //     autoLogin:false,
    //     providers:[
    //       {
    //         id: GoogleLoginProvider.PROVIDER_ID,
    //         provider: new GoogleLoginProvider(environment.oauthKey)
    //       }
    //     ],
    //     onError: (err) => {
    //       console.log(err)
    //     }
    //   } as SocialAuthServiceConfig
    // }
  ]
})
export class AuthModule { }
