import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit, OnDestroy {

  pageTitle: string;
  btntext: string;
  userId: string;
  userForm: UntypedFormGroup;
  submitted = false;
  subscription: Subscription = new Subscription();
  constructor(
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private location: Location,
  ) {

  }

  ngOnInit(): void {
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.id) {
          this.userId = params.id;
        }
      });
    if (this.userId) {
      this.pageTitle = 'Update User';
      this.btntext = 'Update';
      this.getUserById(this.userId);
    } else {
      this.pageTitle = 'Add User';
      this.btntext = 'Save';
    }
    this.formInit();
  }

  formInit() {
    this.userForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      userName: ['', Validators.required],
      profilePictureUrl: [''],
      isActive: [false],
      isAdmin: [false],
      canAdd: [false],
      canEdit: [false],
      canDelete: [false]
    });
  }

  get f() { return this.userForm.controls; }

  getUserById(id) {
    this.subscription.add(this.appService.getUserById(id).subscribe((res: any) => {
      if (res) {
        this.userForm.patchValue({
          firstName: res.firstName ? res.firstName : '',
          lastName: res.lastName ? res.lastName : '',
          email: res.email ? res.email : '',
          userName: res.userName ? res.userName : '',
          profilePictureUrl: res.profilePictureUrl ? res.profilePictureUrl : '',
          isActive: res.isActive ? res.isActive : false,
          isAdmin: res.isAdmin ? res.isAdmin : false,
          canAdd: res.canAdd ? res.canAdd : false,
          canEdit: res.canEdit ? res.canEdit : false,
          canDelete: res.canDelete ? res.canDelete : false
        })
      }
    }));
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.userForm.invalid) {
      return;
    }
    if (this.userId) {
      this.subscription.add(this.appService.updateUser(this.userId, this.userForm.value).subscribe(() => {
        this.toasterService.showSuccess('User updated successfully');
        this.goBack();
      }));
    }
  }

  goBack() {
    this.location.back();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
