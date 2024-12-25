import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

@Component({
  selector: 'app-add-category',
  templateUrl: './add-category.component.html',
  styleUrls: ['./add-category.component.scss']
})
export class AddCategoryComponent implements OnInit, OnDestroy {

  pageTitle: string;
  btntext: string;
  categoryId: string;
  categoryForm: UntypedFormGroup;
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
          this.categoryId = params.id;
        }
      });
    if (this.categoryId) {
      this.pageTitle = 'Update Category';
      this.btntext = 'Update';
      this.getCategoryById(this.categoryId);
    } else {
      this.pageTitle = 'Add Category';
      this.btntext = 'Save';
    }
    this.formInit();
  }

  formInit() {
    this.categoryForm = this.formBuilder.group({
      name: ['', Validators.required],
      appsName: ['', Validators.required],
      showOnDashboard: false,
      sortOrder: 0
    });
  }

  get f() { return this.categoryForm.controls; }

  getCategoryById(id) {
    this.subscription.add(this.appService.getCategoryById(id).subscribe((res: any) => {
      if (res) {
        this.categoryForm.patchValue({
          name: res.name ? res.name : '',
          appsName: res.appsName ? res.appsName : '',
          showOnDashboard : res.showOnDashboard ? res.showOnDashboard : false,
          sortOrder: res.sortOrder ? res.sortOrder : 0,
        })
      }
    }));
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.categoryForm.invalid) {
      return;
    }
    if (this.categoryId) {
      this.subscription.add(this.appService.updateCategory(this.categoryForm.value, this.categoryId).subscribe(() => {
        this.toasterService.showSuccess('Category updated successfully');
        this.goBack();
      }));
    } else {
      this.subscription.add(this.appService.addCategory(this.categoryForm.value).subscribe(() => {
        this.toasterService.showSuccess('Category created successfully');
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
