import { Location } from '@angular/common';
import { CookieService } from 'src/app/core/services/cookie.service';
import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { SharedService } from '../../service/shared-service.service';
import { AuthenticationService, ROLE_LANDING_ROUTES } from 'src/app/modules/auth/auth.service';
import { environment } from 'src/environments/environment';
import { getNavbarMenuForRole, NavbarMenuItem } from 'src/app/config/navbar-menu.config';
import { Role } from 'src/app/shared/models/role';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { AffiliateService, AffiliateDashboardResponse } from 'src/app/modules/affiliate/affiliate.service';
// import { ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';

@Component({
    selector: 'app-user-profile',
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.scss'],
    standalone: false
})
export class UserProfileComponent implements OnInit, OnDestroy {

  userId: string;
  userForm: UntypedFormGroup;
  PasswordChangeForm: UntypedFormGroup;
  submitted = false;
  submitted1 = false;
  subscription: Subscription = new Subscription();
  fileData: File = null;
  previewUrl: any = null;
  fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  userEmail: string = '';
  userDisplayName: string = '';
  dropdownOpen = false;
  /** Logo URL from S3 when set in environment; otherwise local asset (same as Login). */
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  /** Home/dashboard route for current user role (logo click). */
  homeRoute = '/app/student/courses';
  /** When true, used inside Trainer/Company/Management or Student layout – no topbar/sidebar (layout provides them), content only. */
  @Input() embedded = false;
  /** True when we're under student layout (same topbar/sidebar as other student pages). */
  get embeddedMode(): boolean {
    return this.embedded || (this.router.url?.startsWith('/app/student') ?? false);
  }
  /** Sidebar: menu items by role (same as shared navbar); show sidebar for Admin, Trainer, Company, Management, Affiliate. */
  menuItems: NavbarMenuItem[] = [];
  hideSideNav = false;
  showSidebarToggler = false;
  roleId: number | null = null;
  /** True when current user has an affiliate record (status !== 'None'); show sidebar + affiliate section. */
  isAffiliateUser = false;
  /** Affiliate dashboard data for profile affiliate section. */
  affiliateDashboard: AffiliateDashboardResponse | null = null;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private cookieService: CookieService,
    private sharedService: SharedService,
    private location: Location,
    private authService: AuthenticationService,
    private router: Router,
    private elementRef: ElementRef,
    private studentBreadcrumb: StudentBreadcrumbService,
    private affiliateService: AffiliateService
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.dropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  goBack(): void {
    this.location.back();
  }

  toggleSideNav(): void {
    this.hideSideNav = !this.hideSideNav;
  }

  ngOnInit(): void {
    if (this.router.url?.startsWith('/app/student')) {
      this.studentBreadcrumb.setBreadcrumb([{ label: 'Profile' }]);
    }
    const user = JSON.parse(this.cookieService.getCookie('currentUser') || '{}');
    this.userId = user?.id;
    this.userEmail = user?.email || '';
    this.userDisplayName = this.buildDisplayName(user?.firstName, user?.lastName, user?.userName);
    this.roleId = user?.roleId != null ? user.roleId : this.authService.currentUser()?.roleId ?? null;
    if (this.roleId != null && ROLE_LANDING_ROUTES[this.roleId]) {
      this.homeRoute = ROLE_LANDING_ROUTES[this.roleId];
    }
    /* Show sidebar for Admin, Trainer, Company, Management (same as shared navbar). */
    this.showSidebarToggler = this.roleId === Role.Admin || this.roleId === Role.Trainer || this.roleId === Role.Company || this.roleId === Role.Manager;
    this.menuItems = getNavbarMenuForRole(this.roleId);
    if (this.roleId === Role.Manager) {
      this.subscription.add(
        this.appService.getMyManagementPermissions().subscribe({
          next: (perms: string[]) => {
            const allowed = new Set(perms || []);
            const full = getNavbarMenuForRole(Role.Manager);
            this.menuItems = full.filter(m => !m.permission || allowed.has(m.permission));
          },
          error: () => {
            this.menuItems = getNavbarMenuForRole(Role.Manager);
          },
        })
      );
    }
    /* Affiliate (student with affiliate record): show sidebar with affiliate menu + load affiliate data for profile section. */
    if (this.roleId === Role.Student) {
      this.affiliateService.getDashboard().subscribe({
        next: (res) => {
          if (res && res.status !== 'None') {
            this.isAffiliateUser = true;
            this.showSidebarToggler = true;
            this.menuItems = getNavbarMenuForRole(Role.Affiliate);
            this.affiliateDashboard = res;
            this.homeRoute = '/app/affiliate/dashboard';
          }
        },
        error: () => {}
      });
    }
    this.formInit();
    /* Load profile from API (works for Admin, Trainer, Company, Management – API uses current user from token). */
    this.getUserInfo();
    this.sharedService.certificateName.next('My Profile');
  }

  private buildDisplayName(firstName?: string, lastName?: string, userName?: string): string {
    const full = [firstName, lastName].filter(Boolean).join(' ').trim();
    return full || userName || 'User';
  }

  /** Default username from email: part before @ (e.g. anush@gmail.com → anush). User can still modify. */
  private usernameFromEmail(emailOrUsername: string): string {
    if (!emailOrUsername || typeof emailOrUsername !== 'string') return '';
    const at = emailOrUsername.indexOf('@');
    return at > 0 ? emailOrUsername.slice(0, at).trim() : emailOrUsername.trim();
  }

  /** Predefined social platform options (and "Add another" uses these). */
  readonly socialPlatforms = ['Facebook', 'LinkedIn', 'YouTube', 'X', 'Website', 'Other'];

  formInit() {
    this.userForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      userName: ['', Validators.required],
      profilePictureUrl: [''],
      bio: [''],
      socialLinks: this.formBuilder.array([]),
      phone: [''],
    });
    this.addSocialLink('', '');
    this.PasswordChangeForm = this.formBuilder.group({
      originalPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validator: MustMatch('newPassword', 'confirmPassword')
    });
  }

  get socialLinksArray(): UntypedFormArray {
    return this.userForm.get('socialLinks') as UntypedFormArray;
  }

  addSocialLink(platform: string = 'Website', url: string = ''): void {
    this.socialLinksArray.push(this.formBuilder.group({ platform: [platform], url: [url] }));
  }

  removeSocialLink(index: number): void {
    if (this.socialLinksArray.length > 1) this.socialLinksArray.removeAt(index);
  }

  get f() { return this.userForm.controls; }

  get p() { return this.PasswordChangeForm.controls; }

  getUserInfo() {
    /* Show current user's profile picture from cookie immediately while API loads */
    const currentUser = this.authService.currentUser();
    const cachedPic = currentUser?.profilePictureUrl ?? currentUser?.ProfilePictureUrl ?? currentUser?.profilePicture ?? currentUser?.ProfilePicture ?? currentUser?.imageUrl ?? currentUser?.avatarUrl ?? '';
    if (cachedPic && typeof cachedPic === 'string' && cachedPic.trim()) {
      this.uploadedFilePath = cachedPic.trim();
    }
    this.subscription.add(this.appService.getUserInfo().subscribe((res: any) => {
      if (res) {
        const profilePic = res.profilePictureUrl ?? res.ProfilePictureUrl ?? res.profilePicture ?? res.ProfilePicture ?? res.imageUrl ?? res.avatarUrl ?? '';
        this.userEmail = res.email || this.userEmail;
        this.userDisplayName = this.buildDisplayName(res.firstName, res.lastName, res.userName);
        const email = res.email || '';
        const currentUserName = res.userName || '';
        const userName =
          currentUserName && !currentUserName.includes('@')
            ? currentUserName
            : this.usernameFromEmail(email || currentUserName);
        this.userForm.patchValue({
          firstName: res.firstName ? res.firstName : '',
          lastName: res.lastName ? res.lastName : '',
          email: res.email ? res.email : '',
          userName,
          profilePictureUrl: profilePic,
          bio: res.bio ?? res.Bio ?? '',
          phone: res.phone ?? res.Phone ?? '',
        });
        const links = res.socialLinks ?? res.SocialLinks;
        if (Array.isArray(links) && links.length) {
          while (this.socialLinksArray.length) this.socialLinksArray.removeAt(0);
          links.forEach((link: any) =>
            this.addSocialLink(link.platform ?? link.Platform ?? '', link.url ?? link.Url ?? ''));
        } else if (res.website || res.Website) {
          while (this.socialLinksArray.length) this.socialLinksArray.removeAt(0);
          this.addSocialLink('Website', res.website ?? res.Website ?? '');
        }
        if (this.socialLinksArray.length === 0) {
          this.addSocialLink('', '');
        }
        this.uploadedFilePath = (profilePic && String(profilePic).trim()) ? String(profilePic).trim() : '';
      } else if (!this.uploadedFilePath) {
        this.uploadedFilePath = '';
      }
      this.sharedService.emitProfileImageUrl(this.uploadedFilePath || null);
    }));
  }

  // @ViewChild('content') content:ElementRef

  // imageChangedEvent: any = '';
  // croppedImage: any = '';

  // fileChangeEvent(event: any): void {
  //     this.imageChangedEvent = event;
  // }
  // imageCropped(event: ImageCroppedEvent) {
  //     this.croppedImage = event.base64;
  // }
  // imageLoaded() {
  //     // show cropper
  // }
  // cropperReady() {
  //     // cropper ready
  // }
  // loadImageFailed() {
  //     // show message
  // }

  onSubmit() {
    this.submitted = true;
    if (this.userForm.invalid) return;
    const raw = this.userForm.getRawValue();
    const socialLinks = (raw.socialLinks || [])
      .filter((l: any) => l && (l.url || '').trim())
      .map((l: any) => ({ platform: (l.platform || '').trim() || 'Other', url: (l.url || '').trim() }));
    const payload = { ...raw, socialLinks };
    this.subscription.add(this.appService.profileUpdate(payload).subscribe((res: any) => {
      this.toasterService.showSuccess('Profile updated successfully');
      if (res && (res.firstName != null || res.lastName != null || res.userName != null)) {
        this.userDisplayName = this.buildDisplayName(res.firstName, res.lastName, res.userName);
      }
      this.getUserInfo();
    },
      error => {
        this.toasterService.showError('Something went wrong!');
      }));
  }

  changePassword() {
    this.submitted1 = true;
    // stop here if form is invalid
    if (this.PasswordChangeForm.invalid) {
      return;
    }
    this.subscription.add(this.appService.passwordUpdate(this.PasswordChangeForm.value).subscribe(() => {
      this.toasterService.showSuccess('Password updated successfully');
      this.PasswordChangeForm.reset();
      this.p.originalPassword.setErrors(null);
      this.p.newPassword.setErrors(null);
      this.p.confirmPassword.setErrors(null);
    },
      error => {
        this.toasterService.showError('Something went wrong!');
      }))
  }

  fileProgress(fileInput: any) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadDocumnet(this.fileData, 'Profile_Image').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.userForm.patchValue({
        profilePictureUrl: this.uploadedFilePath
      });
      this.authService.updateUserProfilePicture(this.uploadedFilePath);
      this.sharedService.emitProfileImageUrl(this.uploadedFilePath);
    });
  }
  // openFullscreen(content){
  //   this.modalService.open(content);
  // }

  /** First letter of name/email for profile avatar when no image. */
  get profileInitial(): string {
    const fn = this.userForm?.get('firstName')?.value ?? '';
    const ln = this.userForm?.get('lastName')?.value ?? '';
    const un = this.userForm?.get('userName')?.value ?? '';
    const name = (fn || ln || un || this.userDisplayName || this.userEmail || '').toString().trim();
    return (name.charAt(0) || (this.userEmail || '?').charAt(0)).toUpperCase();
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

  /** Format currency for affiliate section (same as affiliate dashboard). */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value ?? 0);
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['logoFallback']) {
      img.dataset['logoFallback'] = '1';
      img.src = '/assets/img/oilandgas_club.svg';
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.sharedService.certificateName.next('');

  }

}

export function MustMatch(controlName: string, matchingControlName: string) {
  return (formGroup: UntypedFormGroup) => {
    const control = formGroup.controls[controlName];
    const matchingControl = formGroup.controls[matchingControlName];

    if (matchingControl.errors && !matchingControl.errors.mustMatch) {
      // return if another validator has already found an error on the matchingControl
      return;
    }

    // set error on matchingControl if validation fails
    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ mustMatch: true });
    } else {
      matchingControl.setErrors(null);
    }
  }
}
