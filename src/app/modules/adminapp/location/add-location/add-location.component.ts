import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-add-location',
  templateUrl: './add-location.component.html',
  styleUrls: ['./add-location.component.scss']
})
export class AddLocationComponent implements OnInit {

  pageTitle: string;
  btntext: string;
  locationId: string;
  locationForm: UntypedFormGroup;
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
          this.locationId = params.id;
        }
      });
    if (this.locationId) {
      this.pageTitle = 'Update Location';
      this.btntext = 'Update';
      this.getLocationById(this.locationId);
    } else {
      this.pageTitle = 'Add Location';
      this.btntext = 'Save';
    }
    this.formInit();
  }

  formInit() {
    this.locationForm = this.formBuilder.group({
      name: ['', Validators.required],
    });
  }

  get f() { return this.locationForm.controls; }

  getLocationById(id) {
    this.subscription.add(this.appService.getLocationById(id).subscribe((res: any) => {
      if (res) {
        this.locationForm.patchValue({
          name: res.name ? res.name : '',
        })
      }
    }));
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.locationForm.invalid) {
      return;
    }
    if (this.locationId) {
      this.subscription.add(this.appService.updateLocation(this.locationForm.value, this.locationId).subscribe(() => {
        this.toasterService.showSuccess('Location updated successfully');
        this.goBack();
      }));
    } else {
      this.subscription.add(this.appService.addLocation(this.locationForm.value).subscribe(() => {
        this.toasterService.showSuccess('Location created successfully');
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
