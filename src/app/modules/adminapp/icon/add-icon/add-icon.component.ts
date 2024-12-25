import { Location } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

@Component({
  selector: 'app-add-icon',
  templateUrl: './add-icon.component.html',
  styleUrls: ['./add-icon.component.scss']
})
export class AddIconComponent implements OnInit,OnDestroy {

  pageTitle: string;
  btntext: string;
  iconId: string;
  iconForm: UntypedFormGroup;
  submitted = false;
  subscription: Subscription = new Subscription();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private location: Location,
  ) { }

  ngOnInit(): void {
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.id) {
          this.iconId = params.id;
        }
      });
    if (this.iconId) {
      this.pageTitle = 'Update Icon';
      this.btntext = 'Update';
      this.getIconById(this.iconId);
    } else {
      this.pageTitle = 'Add Icon';
      this.btntext = 'Save';
    }
    this.formInit();
  }

  formInit() {
    this.iconForm = this.formBuilder.group({
      name: ['', Validators.required],
      url: ['', Validators.required],
    });
  }

  get f() { return this.iconForm.controls; }

  getIconById(id) {
    this.subscription.add(this.appService.getIconById(id).subscribe((res: any) => {
      if (res) {
        this.iconForm.patchValue({
          name: res.name ? res.name : '',
          url: res.url ? res.url : '',
        })
      }
    }));
  }

  iconFileProgress(fileInput: any) {
    let fileData = <File>fileInput.target.files[0];
    this.appService.uploadIcon(fileData).subscribe(res => {
      let uploadedFilePath = res.url;
      this.iconForm.patchValue({
        url: uploadedFilePath
      })
    })
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.iconForm.invalid) {
      return;
    }
    if (this.iconId) {
      this.subscription.add(this.appService.updateIcon(this.iconForm.value, this.iconId).subscribe(() => {
        this.toasterService.showSuccess('Icon updated successfully');
        this.goBack();
      }));
    } else {
      this.subscription.add(this.appService.addIcon(this.iconForm.value).subscribe(() => {
        this.toasterService.showSuccess('Icon created successfully');
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
