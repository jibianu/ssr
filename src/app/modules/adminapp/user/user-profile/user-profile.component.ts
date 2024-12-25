import { CookieService } from './../../../../core/services/cookie.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
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
    const user = JSON.parse(this.cookieService.getCookie('currentUser'));
    this.userId = user.id;
    if (this.userId) {
      this.getUserInfo();
    }
    this.formInit();
  }

  formInit() {
    this.userForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      userName: ['', Validators.required],
      profilePictureUrl: ['', Validators.required],
    });
    this.PasswordChangeForm = this.formBuilder.group({
      originalPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validator: MustMatch('newPassword', 'confirmPassword')
    });
  }

  get f() { return this.userForm.controls; }

  get p() { return this.PasswordChangeForm.controls; }

  getUserInfo() {
    this.subscription.add(this.appService.getUserInfo().subscribe((res: any) => {
      if (res) {
        this.userForm.patchValue({
          firstName: res.firstName ? res.firstName : '',
          lastName: res.lastName ? res.lastName : '',
          email: res.email ? res.email : '',
          userName: res.userName ? res.userName : '',
          profilePictureUrl: res.profilePictureUrl ? res.profilePictureUrl : '',
        })
      }
      this.uploadedFilePath = res.profilePictureUrl ? res.profilePictureUrl: '';
    }));
    
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.userForm.invalid) {
      return;
    }
    this.subscription.add(this.appService.profileUpdate(this.userForm.value).subscribe(() => {
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
    this.appService.uploadTitleImage(this.fileData).subscribe(res => {
      this.uploadedFilePath = res.url;
      this.userForm.patchValue({
        profilePictureUrl: this.uploadedFilePath
      })
    })
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

  onImgError(event){
    event.target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
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
