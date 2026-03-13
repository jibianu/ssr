import { environment } from './../../../../../environments/environment';
import { CookieService } from 'src/app/core/services/cookie.service';
import { AdminAppService } from './../../adminapp.service';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
@Component({
    selector: 'app-add-course',
    templateUrl: './add-course.component.html',
    styleUrls: ['./add-course.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class AddCourseComponent implements OnInit, OnDestroy {

  pageTitle: string;
  btntext: string;
  courseId: string;
  courseForm: UntypedFormGroup;
  submitted = false;
  categories = [];
  locations = [];
  subscription: Subscription = new Subscription();
  fileData: File = null;
  previewUrl: any = null;
  fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  isAdmin = false;
  toggleDragArray = [];
  selectedItems = [];
  locationArray: any = [];
  dropdownSettings = {};
  courseData: any;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private cookieService: CookieService
  ) { }

  ngOnInit(): void {
    this.getCategories();
    const currentUser = JSON.parse(this.cookieService.getCookie('currentUser'));
    this.courseData = JSON.parse(window.sessionStorage.getItem('courseData'));
    this.isAdmin = currentUser.isAdmin ? currentUser.isAdmin : false;
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.id) {
          this.courseId = params.id;
        }
      });
    if (this.courseId) {
      this.pageTitle = 'Update Course';
      this.btntext = 'Update';
      if (!this.courseData) {
        this.getCourseById(this.courseId);
      }
    } else {
      this.pageTitle = 'Add Course';
      this.btntext = 'Save';
    }
    this.formInit();
  }

  formInit() {
    this.courseForm = this.formBuilder.group({
      title: ['', Validators.required],
      imageLink: [''],
      description: ['', Validators.required],
      categoryId: ['', Validators.required],
    })
  }

  get f() { return this.courseForm.controls; }


  getCourseById(id) {
    this.subscription.add(this.appService.getCourseById(id).subscribe((res: any) => {
      if (res) {
        this.setvalue(res);
      }
    }));
  }

  setvalue(res) {
    this.courseForm.patchValue({
      title: res.title ? res.title : '',
      categoryId: (res.category && res.category.id) ? res.category.id : (res.categoryId ? res.categoryId : ''),
      imageLink: res.imageLink ? res.imageLink : '',
      description: res.description ? res.description : '',
    });
    this.uploadedFilePath = res.imageLink ? res.imageLink : environment.imgUrl;
  }

  getCategories() {
    this.subscription.add(this.appService.getCategories().subscribe((res: any) => {
      if (res) {
        this.categories = res;
      }
    }));
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.courseForm.invalid) {
      return;
    }
    if (this.courseId) {
      this.subscription.add(this.appService.updateCourse(this.courseForm.value, this.courseId).subscribe(() => {
        this.toasterService.showSuccess('Course updated successfully');
        this.goBack();
      }));
    } else {
      this.subscription.add(this.appService.addCourse(this.courseForm.value).subscribe(() => {
        this.toasterService.showSuccess('Course created successfully');
        this.goBack();
      }));
    }
  }

  goBack() {
    this.location.back();
    window.sessionStorage.clear();
  }

  fileProgress(fileInput: any) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadImage(this.fileData).subscribe(res => {
      this.uploadedFilePath = res.url;
      this.courseForm.patchValue({
        imageLink: this.uploadedFilePath
      })
    })
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
