import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { AuthenticationService } from '../../auth/auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { jsonProp } from 'src/app/core/api-json.util';

@Component({
  selector: 'app-sso-settings',
  templateUrl: './sso-settings.component.html',
  styleUrls: ['./sso-settings.component.scss'],
  standalone: false
})
export class SsoSettingsComponent implements OnInit {
  loading = false;
  saving = false;

  private readonly fb = inject(FormBuilder);

  readonly providerOptions = [
    { v: 0, label: 'None' },
    { v: 1, label: 'Azure AD / Microsoft Entra ID' },
    { v: 2, label: 'Google Workspace' },
    { v: 3, label: 'Okta' },
    { v: 4, label: 'Auth0' },
    { v: 5, label: 'OneLogin' },
    { v: 6, label: 'Custom SAML 2.0' },
    { v: 7, label: 'Custom OIDC' }
  ];

  form = this.fb.group({
    enabled: [false],
    autoRedirectEnabled: [false],
    autoCreateUsersFromSso: [true],
    disableOtpVerification: [false],
    restrictLoginToSsoOnly: [false],
    autoSyncProfileFromIdp: [true],
    providerType: [0, [Validators.required]],
    tenantId: [''],
    clientId: [''],
    clientSecret: [''],
    discoveryUrl: [''],
    authorizationUrl: [''],
    tokenUrl: [''],
    logoutUrl: [''],
    allowedEmailDomains: ['', Validators.required],
    portalDisplayName: [''],
    logoUrl: [''],
    primaryColorHex: [''],
    welcomeMessage: [''],
    loginBackgroundUrl: [''],
    oauthScopes: ['openid profile email']
  });

  constructor(
    private readonly auth: AuthenticationService,
    private readonly toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.auth
      .getCompanySsoSettings()
      .pipe(first())
      .subscribe({
        next: (s) => {
          const r = s as Record<string, unknown>;
          this.form.patchValue({
            enabled: !!jsonProp<boolean>(r, 'Enabled', 'enabled'),
            autoRedirectEnabled: !!jsonProp<boolean>(r, 'AutoRedirectEnabled', 'autoRedirectEnabled'),
            autoCreateUsersFromSso: jsonProp<boolean>(r, 'AutoCreateUsersFromSso', 'autoCreateUsersFromSso') !== false,
            disableOtpVerification: !!jsonProp<boolean>(r, 'DisableOtpVerification', 'disableOtpVerification'),
            restrictLoginToSsoOnly: !!jsonProp<boolean>(r, 'RestrictLoginToSsoOnly', 'restrictLoginToSsoOnly'),
            autoSyncProfileFromIdp: jsonProp<boolean>(r, 'AutoSyncProfileFromIdp', 'autoSyncProfileFromIdp') !== false,
            providerType: Number(jsonProp<number>(r, 'ProviderType', 'providerType') ?? 0),
            tenantId: (jsonProp<string>(r, 'TenantId', 'tenantId') ?? '') as string,
            clientId: (jsonProp<string>(r, 'ClientId', 'clientId') ?? '') as string,
            discoveryUrl: (jsonProp<string>(r, 'DiscoveryUrl', 'discoveryUrl') ?? '') as string,
            authorizationUrl: (jsonProp<string>(r, 'AuthorizationUrl', 'authorizationUrl') ?? '') as string,
            tokenUrl: (jsonProp<string>(r, 'TokenUrl', 'tokenUrl') ?? '') as string,
            logoutUrl: (jsonProp<string>(r, 'LogoutUrl', 'logoutUrl') ?? '') as string,
            allowedEmailDomains: (jsonProp<string>(r, 'AllowedEmailDomains', 'allowedEmailDomains') ?? '') as string,
            portalDisplayName: (jsonProp<string>(r, 'PortalDisplayName', 'portalDisplayName') ?? '') as string,
            logoUrl: (jsonProp<string>(r, 'LogoUrl', 'logoUrl') ?? '') as string,
            primaryColorHex: (jsonProp<string>(r, 'PrimaryColorHex', 'primaryColorHex') ?? '') as string,
            welcomeMessage: (jsonProp<string>(r, 'WelcomeMessage', 'welcomeMessage') ?? '') as string,
            loginBackgroundUrl: (jsonProp<string>(r, 'LoginBackgroundUrl', 'loginBackgroundUrl') ?? '') as string,
            oauthScopes: (jsonProp<string>(r, 'OAuthScopes', 'oauthScopes') ?? 'openid profile email') as string
          });
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toaster.showError('Could not load SSO settings.');
        }
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      enabled: v.enabled,
      autoRedirectEnabled: v.autoRedirectEnabled,
      autoCreateUsersFromSso: v.autoCreateUsersFromSso,
      disableOtpVerification: v.disableOtpVerification,
      restrictLoginToSsoOnly: v.restrictLoginToSsoOnly,
      autoSyncProfileFromIdp: v.autoSyncProfileFromIdp,
      providerType: Number(v.providerType),
      tenantId: v.tenantId || null,
      clientId: v.clientId || null,
      clientSecret: v.clientSecret || null,
      discoveryUrl: v.discoveryUrl || null,
      authorizationUrl: v.authorizationUrl || null,
      tokenUrl: v.tokenUrl || null,
      logoutUrl: v.logoutUrl || null,
      allowedEmailDomains: v.allowedEmailDomains,
      portalDisplayName: v.portalDisplayName || null,
      logoUrl: v.logoUrl || null,
      primaryColorHex: v.primaryColorHex || null,
      welcomeMessage: v.welcomeMessage || null,
      loginBackgroundUrl: v.loginBackgroundUrl || null,
      oauthScopes: v.oauthScopes || 'openid profile email'
    };
    this.auth
      .saveCompanySsoSettings(body)
      .pipe(first())
      .subscribe({
        next: () => {
          this.saving = false;
          this.toaster.showSuccess('SSO settings saved.');
          this.form.patchValue({ clientSecret: '' });
        },
        error: (err) => {
          this.saving = false;
          const m = err?.error?.messages?.[0] ?? err?.error?.Messages?.[0] ?? err?.message ?? 'Save failed.';
          this.toaster.showError(m);
        }
      });
  }
}
