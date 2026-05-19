import { RegisterManagementComponent } from './register-management/register-management.component';
import { RegisterTrainerComponent } from './register-trainer/register-trainer.component';
import { RegisterAffiliateComponent } from './register-affiliate/register-affiliate.component';
import { RegisterCompanyComponent } from './register-company/register-company.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { GoogleCallbackComponent } from './google-callback/google-callback.component';
import { SsoCallbackComponent } from './sso-callback/sso-callback.component';
import { Routes } from '@angular/router';
import { VerificationCodeComponent } from './verification-code/verification-code.component';
import { ForgetPasswordComponent } from './forget-password/forget-password.component';
import { ForgetPasswordVerificationComponent } from './forget-password-verification/forget-password-verification.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { UserUnavailableComponent } from './user-unavailable/user-unavailable.component';

/**
 * Root-level auth URLs: `/login`, `/register`, `/forget-password`, … (no `/auth` prefix).
 * Included in `app-routing.module.ts` before the public `''` route so they win over `:slug`.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'user-unavailable',
    component: UserUnavailableComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'callback',
    component: AuthCallbackComponent
  },
  {
    path: 'google-callback',
    component: GoogleCallbackComponent
  },
  {
    path: 'sso-callback',
    component: SsoCallbackComponent
  },
  {
    path: 'verification',
    component: VerificationCodeComponent
  },
  {
    path: 'forget-password',
    component: ForgetPasswordComponent
  },
  {
    path: 'change-password',
    component: ChangePasswordComponent
  },
  {
    path: 'fg-code',
    component: ForgetPasswordVerificationComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'register/:cid',
    component: RegisterComponent
  },
  {
    path: 'register-company',
    component: RegisterCompanyComponent
  },
  {
    path: 'register-trainer',
    component: RegisterTrainerComponent
  },
  {
    path: 'register-affiliate',
    component: RegisterAffiliateComponent
  },
  {
    path: 'register-management',
    component: RegisterManagementComponent
  },
];
