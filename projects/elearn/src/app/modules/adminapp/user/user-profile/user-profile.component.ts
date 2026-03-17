import { CookieService } from './../../../../core/services/cookie.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

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

  constructor(
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private cookieService: CookieService,
  ) {

  }
  ngOnInit(): void {
    const user = JSON.parse(this.cookieService.getCookie('currentUser') || '{}');
    this.userId = user?.id;
    this.formInit();
    if (this.userId) {
      this.getUserInfo();
    }
  }

  formInit() {
    this.userForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      userName: ['', Validators.required],
      profilePictureUrl: ['', Validators.required],
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

  private usernameFromEmail(emailOrUsername: string): string {
    if (!emailOrUsername || typeof emailOrUsername !== 'string') return '';
    const at = emailOrUsername.indexOf('@');
    return at > 0 ? emailOrUsername.slice(0, at).trim() : emailOrUsername.trim();
  }

  getUserInfo() {
    this.subscription.add(this.appService.getUserInfo().subscribe((res: any) => {
      if (res) {
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
          userName: userName || currentUserName,
          profilePictureUrl: res.profilePictureUrl ? res.profilePictureUrl : '',
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
        this.uploadedFilePath = res.profilePictureUrl ? res.profilePictureUrl : '';
      }
    }));
    
  }

  onSubmit() {
    this.submitted = true;
    if (this.userForm.invalid) return;
    const raw = this.userForm.value;
    const socialLinks = (raw.socialLinks || [])
      .filter((l: any) => l && (l.url || '').trim())
      .map((l: any) => ({ platform: (l.platform || '').trim() || 'Other', url: (l.url || '').trim() }));
    const payload = { ...raw, socialLinks };
    this.subscription.add(this.appService.profileUpdate(payload).subscribe(() => {
      this.toasterService.showSuccess('Profile updated successfully');
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
    this.appService.uploadImage(this.fileData).subscribe(res => {
      this.uploadedFilePath = res.url;
      this.userForm.patchValue({
        profilePictureUrl: this.uploadedFilePath
      })
    })
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
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
