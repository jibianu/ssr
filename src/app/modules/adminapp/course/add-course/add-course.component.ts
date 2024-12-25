import { environment } from './../../../../../environments/environment';
import { CoursePreviewComponent } from './../course-preview/course-preview.component';
import { CookieService } from 'src/app/core/services/cookie.service';
import { AdminAppService } from './../../adminapp.service';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MyUploadAdapter } from './UploadAdapter';
@Component({
  selector: 'app-add-course',
  templateUrl: './add-course.component.html',
  styleUrls: ['./add-course.component.scss'],
  encapsulation: ViewEncapsulation.None
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
  dropdownIconSettings = {};
  courseData: any;
  iconList = [];
  selectedfeatureitems = [];
  guid = '00000000-0000-0000-0000-000000000000'

  constructor(
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private location: Location,
    private modalService: NgbModal,
    private cookieService: CookieService
  ) { }

  ngOnInit(): void {
    this.getIcons();
    this.getCategories();
    this.fetchLocations();
    const currentUser = JSON.parse(this.cookieService.getCookie('currentUser'));
    this.courseData = JSON.parse(window.sessionStorage.getItem('courseData'));
    this.isAdmin = currentUser.isAdmin ? currentUser.isAdmin : false;
    this.formInit();
    this.dropdownSettings = {
      singleSelection: false,
      idField: 'id',
      textField: 'name',
      enableCheckAll: false,
      itemsShowLimit: 5
    };
    this.dropdownIconSettings = {
      singleSelection: true,
      itemsShowLimit: 5,
      idField: 'id',
      textField: 'url',
      closeDropDownOnSelection: true
    };
  }

  formInit() {
    this.courseForm = this.formBuilder.group({
      title: ['', Validators.required],
      titleImageUrl: '',
      canonicalUrl: ['', Validators.required],
      metaDescription: ['', [Validators.required]],
      categoryId: ['', Validators.required],
      showOnDashboard: [false],
      amount: 0,
      becomeCourse: this.formBuilder.group({
        title: '',
        description: ''
      }),
      frequentlyAskedQuestions: new UntypedFormArray([
        // this.formBuilder.group({
        //   question: ['',Validators.required],
        //   answer: ['',Validators.required],
        //   sortOrder: 0,
        //   id: this.guid
        // })
      ]),
      courseFeatures: new UntypedFormArray([
        // this.formBuilder.group({
        //   description: '',
        //   iconId: '7d53ea73-a46d-45c0-a78e-85c83371a8f4',
        //   sortOrder: 0,
        //   id: this.guid
        // })
      ]),
      courseInformation: new UntypedFormArray([
        this.formBuilder.group({
          title: '',
          summary: '',
          sortOrder: 0,
          id: this.guid
        })
      ]),
      courseContents: new UntypedFormArray([
        this.formBuilder.group({
          title: '',
          summary: '',
          iconId: '',
          sortOrder: 0,
          id: this.guid,
          courseContentSubTypes: new UntypedFormArray([])
        })
      ]),
      courseSummaries: new UntypedFormArray([
        // this.formBuilder.group({
        //   summary: '',
        //   sortOrder: 0,
        //   id: this.guid
        // })
      ]),
      courseTeachers: new UntypedFormArray([
        // this.formBuilder.group({
        //   name: '',
        //   description: '',
        //   imageUrl: '',
        //   id: this.guid
        // })
      ]),
      courseLocations: new UntypedFormArray([
        // this.formBuilder.group({
        //   locationId: '',
        //   name: '',
        //   title: '',
        //   canonicalUrl: '',
        //   metaDescription: '',
        //   id: this.guid
        // })
      ])
    });

    this.subscription.add(this.courseForm.get('title').valueChanges.subscribe(val => {
      let value = val;
      let replaced = value.split(' ').join('-');
      this.courseForm.patchValue({
        canonicalUrl: replaced
      })
      this.setLocationMetaData(this.courseForm.get('title').value)
    }));
  }

  get f() { return this.courseForm.controls; }

  get frequentlyAskedQuestionsArray() {
    return this.courseForm.get('frequentlyAskedQuestions') as UntypedFormArray;
  }

  get courseFeaturesArray() {
    return this.courseForm.get('courseFeatures') as UntypedFormArray;
  }

  get courseInformationArray() {
    return this.courseForm.get('courseInformation') as UntypedFormArray;
  }

  get courseContentsArray() {
    return this.courseForm.get('courseContents') as UntypedFormArray;
  }

  get courseSummariesArray() {
    return this.courseForm.get('courseSummaries') as UntypedFormArray;
  }

  get courseTeachersArray() {
    return this.courseForm.get('courseTeachers') as UntypedFormArray;
  }

  get courseLocationsArray() {
    return this.courseForm.get('courseLocations') as UntypedFormArray;
  }

  frequentlyAskedQuestionsArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.courseForm.get('frequentlyAskedQuestions')).controls;
  }

  courseFeaturesArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.courseForm.get('courseFeatures')).controls;
  }

  courseInformationArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.courseForm.get('courseInformation')).controls;
  }

  courseSummariesArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.courseForm.get('courseSummaries')).controls;
  }

  courseContentsArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.courseForm.get('courseContents')).controls;
  }

  courseTeachersArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.courseForm.get('courseTeachers')).controls;
  }

  courseLocationsArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.courseForm.get('courseLocations')).controls;
  }

  getCourseById(id) {
    this.subscription.add(this.appService.getCourseById(id).subscribe((res: any) => {
      if (res) {
        this.setvalue(res);
      }
    }));
  }

  getIcons() {
    this.subscription.add(this.appService.getIcon().subscribe((res: any) => {
      if (res) {
        this.iconList = res
      }
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
    }));
  }

  setvalue(res) {
    this.courseForm.patchValue({
      title: res.title ? res.title : '',
      titleImageUrl: res.titleImageUrl ? res.titleImageUrl : environment.imgUrl,
      canonicalUrl: res.canonicalUrl ? res.canonicalUrl : '',
      amount: res.amount ? res.amount : 0,
      metaDescription: res.metaDescription ? res.metaDescription : '',
      categoryId: (res.category && res.category.id) ? res.category.id : (res.categoryId ? res.categoryId : ''),
      showOnDashboard: res.showOnDashboard ? res.showOnDashboard : false,
    });
    this.uploadedFilePath = res.titleImageUrl ? res.titleImageUrl : environment.imgUrl;
    this.setLocationMetaData(res.title);
    if (res.becomeCourse && (res.becomeCourse.title || res.becomeCourse.description)) {
      this.courseForm.patchValue({
        becomeCourse: {
          title: res.becomeCourse.title ? res.becomeCourse.title : '',
          description: res.becomeCourse.description ? res.becomeCourse.description : ''
        }
      })
    }
    if (res && res.frequentlyAskedQuestions && res.frequentlyAskedQuestions.length > 0) {
      let array = [];
      res.frequentlyAskedQuestions.forEach((x, i) => {
        array.push(this.formBuilder.group(
          {
            question: x.question,
            answer: x.answer,
            sortOrder: x.sortOrder ? x.sortOrder : 0,
            id: x.id ? x.id : this.guid,
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.courseForm.setControl('frequentlyAskedQuestions', FormArray);
    }
    if (res && res.courseFeatures && res.courseFeatures.length > 0) {
      let array = [];
      this.selectedfeatureitems = []
      res.courseFeatures.forEach((x, i) => {
        let data = this.iconList.filter(d => d.url === x.iconUrl)
        array.push(this.formBuilder.group(
          {
            description: x.description,
            iconId: (data && data.length > 0) ? data[0]?.id : '7d53ea73-a46d-45c0-a78e-85c83371a8f4',
            sortOrder: x.sortOrder ? x.sortOrder : 0,
            id: x.id ? x.id : this.guid,
          }))
        this.selectedfeatureitems.push(data)
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.courseForm.setControl('courseFeatures', FormArray);
    }
    if (res && res.courseInformation && res.courseInformation.length > 0) {
      let array = [];
      res.courseInformation.forEach((x, i) => {
        array.push(this.formBuilder.group(
          {
            title: x.title,
            summary: x.summary,
            sortOrder: x.sortOrder ? x.sortOrder : 0,
            id: x.id ? x.id : this.guid,
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.courseForm.setControl('courseInformation', FormArray);
    }
    if (res && res.courseSummaries && res.courseSummaries.length > 0) {
      let array = [];
      res.courseSummaries.forEach((x, i) => {
        array.push(this.formBuilder.group(
          {
            summary: x.summary,
            sortOrder: x.sortOrder ? x.sortOrder : 0,
            id: x.id ? x.id : this.guid,
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.courseForm.setControl('courseSummaries', FormArray);
    }
    if (res && res.courseTeachers && res.courseTeachers.length > 0) {
      let array = [];
      res.courseTeachers.forEach((x, i) => {
        array.push(this.formBuilder.group(
          {
            name: x.name,
            description: x.description,
            imageUrl: x.imageUrl ? x.imageUrl : '',
            id: x.id ? x.id : this.guid,
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.courseForm.setControl('courseTeachers', FormArray);
    }
    if (res && res.courseLocations && res.courseLocations.length > 0) {
      let array = [];
      res.courseLocations.forEach((x, i) => {
        array.push(
          this.formBuilder.group({
            locationId: x.locationId,
            id: x.locationId,
            name: x.name,
            title: x.title,
            canonicalUrl: x.canonicalUrl,
            metaDescription: x.metaDescription
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.courseForm.setControl('courseLocations', FormArray);
      this.selectedItems = this.courseLocationsArray.value;
      this.locationArray = this.selectedItems;
    }
    if (res && res.courseContents && res.courseContents.length > 0) {
      let array = [];
      res.courseContents.forEach((x, i) => {
        let data = this.iconList.filter(d => d.url === x.iconUrl)
        array.push(this.formBuilder.group(
          {
            summary: x.summary,
            title: x.title,
            iconId: (data && data.length > 0) ? data[0]?.id : '',
            sortOrder: x.sortOrder ? x.sortOrder : 0,
            id: x.id ? x.id : this.guid,
            courseContentSubTypes: this.setCourseContentSubTypes(x.courseContentSubTypes)
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.courseForm.setControl('courseContents', FormArray);
    }
  }

  setCourseContentSubTypes(x) {
    let arr = new UntypedFormArray([])
    x.forEach((y, j) => {
      let data = this.iconList.filter(d => d.url === y.iconUrl)
      if (data) {
        arr.push(this.formBuilder.group({
          "title": y.title,
          "summary": y.summary,
          "iconId": data[0]?.id,
          "sortOrder": y.sortOrder ? y.sortOrder : 0,
          "id": y?.id ? y.id : this.guid,
          "courseContentSubSubTypes": this.setCourseContentSubSubTypes(y.courseContentSubSubTypes)
        }))

      }
    })
    return arr;
  }

  setCourseContentSubSubTypes(y) {
    let arr = new UntypedFormArray([])
    y.forEach((z, k) => {
      let data = this.iconList.filter(d => d.url === z.iconUrl)
      if (data) {
        arr.push(this.formBuilder.group({
          "title": z.title,
          "summary": z.summary,
          "sortOrder": z.sortOrder ? z.sortOrder : 0,
          "id": z?.id ? z.id : this.guid,
          "iconId": data[0]?.id
        }))

      }
    })
    return arr;
  }

  fetchLocations() {
    this.subscription.add(this.appService.getLocation()
      .subscribe(
        response => {
          this.locations = response;
          if (this.courseData) {
            this.setvalue(this.courseData);
          }
        },
        error => {
          console.log(error);
        }));
  }

  setLocationMetaData(title) {
    if (this.locations && this.locations.length > 0) {
      let courseTitle = title;
      this.locations.forEach(element => {
        element['locationId'] = element.id;
        element['title'] = `${courseTitle} in ${element.name}`;
        element['canonicalUrl'] = (`${element.name}`).split(' ').join('-');
        element['metaDescription'] = `${courseTitle} in ${element.name}`;
      });
    }
  }

  locationMeta() {
    window.sessionStorage.setItem('courseData', JSON.stringify(this.courseForm.value))
    this.router.navigateByUrl('/app/course/location')
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
    if (this.courseData && this.courseData.courseLocations && this.courseData.courseLocations.length > 0) {
      this.locationArray.forEach((element, index) => {
        if (this.courseData.courseLocations[index] && this.courseData.courseLocations[index].id) {
          if (element.id === this.courseData.courseLocations[index].id) {
            this.locationArray[index] = this.courseData.courseLocations[index];
          }
        }
      });
    }
    const FormArray: UntypedFormArray = this.formBuilder.array(this.locationArray);
    this.courseForm.setControl('courseLocations', FormArray);
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

  onReady($event) {
    $event.plugins.get('FileRepository').createUploadAdapter = (loader) => {
      return new MyUploadAdapter(loader);
    };
  }

  goBack() {
    this.location.back();
    window.sessionStorage.clear();
  }

  previewCourse() {
    const modalRef = this.modalService.open(CoursePreviewComponent, { size: 'xl', scrollable: true });
    modalRef.componentInstance.blogDetails = this.courseForm.value;
  }

  fileProgress(fileInput: any) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadTitleImage(this.fileData).subscribe(res => {
      this.uploadedFilePath = res.url;
      this.courseForm.patchValue({
        titleImageUrl: this.uploadedFilePath
      })
    })
  }

  teacherFileProgress(fileInput: any, i) {
    let fileData = <File>fileInput.target.files[0];
    this.appService.uploadTeacherImage(fileData).subscribe(res => {
      let uploadedFilePath = res.url;
      this.courseTeachersArray.at(i).patchValue({
        imageUrl: uploadedFilePath
      })
    })
  }

  preview() {
    // Show preview 
    var mimeType = this.fileData.type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }

    var reader = new FileReader();
    reader.readAsDataURL(this.fileData);
    reader.onload = (_event) => {
      this.previewUrl = reader.result;
    }
  }

  addFaqItems(): void {
    this.frequentlyAskedQuestionsArray.push(this.createFaqItems())
  }

  removeFaqItems(index) {
    this.frequentlyAskedQuestionsArray.removeAt(index);
  }

  createFaqItems() {
    let group = {};
    group['question'] = new UntypedFormControl('');
    group['answer'] = new UntypedFormControl('');
    group['sortOrder'] = new UntypedFormControl(0);
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  addCourseInfoItems(): void {
    this.courseInformationArray.push(this.createCourseInfoItems())
  }

  removeCourseInfoItems(index) {
    this.courseInformationArray.removeAt(index);
  }

  createCourseInfoItems() {
    let group = {};
    group['title'] = new UntypedFormControl('');
    group['summary'] = new UntypedFormControl('');
    group['sortOrder'] = new UntypedFormControl(0);
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  addCourseFeatureItems(): void {
    this.courseFeaturesArray.push(this.createCourseFeatureItems())
    let val = {
      id: '',
      name: '',
      url: '',
      iconId:'7d53ea73-a46d-45c0-a78e-85c83371a8f4'
    }
    this.selectedfeatureitems.push(val);
  }

  removeCourseFeatureItems(index) {
    this.courseFeaturesArray.removeAt(index);
    const ind = this.selectedfeatureitems.indexOf(index, 0);
    if (index > -1) {
      this.selectedfeatureitems.splice(ind, 1);
    }
  }

  createCourseFeatureItems() {
    let group = {};
    group['description'] = new UntypedFormControl('');
    group['iconId'] = new UntypedFormControl('7d53ea73-a46d-45c0-a78e-85c83371a8f4');
    group['sortOrder'] = new UntypedFormControl(0);
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  addCourseSummariesItems(): void {
    this.courseSummariesArray.push(this.createCourseSummariesItems())
  }

  removeCourseSummariesItems(index) {
    this.courseSummariesArray.removeAt(index);
  }

  addCourseTeacherItems(): void {
    this.courseTeachersArray.push(this.createCourseTeacherItems())
  }

  createCourseTeacherItems() {
    let group = {};
    group['name'] = new UntypedFormControl('');
    group['description'] = new UntypedFormControl('');
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  removeCourseTeacherItems(index) {
    this.courseTeachersArray.removeAt(index);
  }

  createCourseSummariesItems() {
    let group = {};
    group['summary'] = new UntypedFormControl('');
    group['sortOrder'] = new UntypedFormControl(0);
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  createCourseContentItems() {
    let group = {};
    group['summary'] = new UntypedFormControl('');
    group['title'] = new UntypedFormControl('');
    group['iconId'] = new UntypedFormControl('');
    group['sortOrder'] = new UntypedFormControl(this.courseContentsArray.length);
    group['id'] = new UntypedFormControl(this.guid);
    group['courseContentSubTypes'] = new UntypedFormArray([]);
    return this.formBuilder.group(group);
  }

  addCourseContentItems(): void {
    this.courseContentsArray.push(this.createCourseContentItems());
  }

  removeCourseContentItems(index) {
    this.courseContentsArray.removeAt(index);
  }

  CourseSubContent(aIndex: number): UntypedFormArray {
    return (this.courseForm.get('courseContents') as UntypedFormArray).controls[aIndex].get('courseContentSubTypes') as UntypedFormArray
  }

  CourseSubSubContent(aIndex, bIndex): UntypedFormArray {
    return ((this.courseForm.get('courseContents') as UntypedFormArray).controls[aIndex].get('courseContentSubTypes') as UntypedFormArray).controls[bIndex].get('courseContentSubSubTypes') as UntypedFormArray
  }

  addCourseSubContent(index: number) {
    this.CourseSubContent(index).push(this.newSubContent());
  }

  addCourseSubSubContent(aIndex, bIndex) {
    this.CourseSubSubContent(aIndex, bIndex).push(this.newSubSubContent())
  }

  removeCourseSubContent(index: number, subIndex: number) {
    this.CourseSubContent(index).removeAt(subIndex);
  }

  removeCourseSubSubContent(index: number, subIndex: number, SubSubIndex) {
    this.CourseSubSubContent(index, subIndex).removeAt(SubSubIndex);
  }

  newSubContent(): UntypedFormGroup {
    let group = {};
    group['title'] = new UntypedFormControl('');
    group['summary'] = new UntypedFormControl('');
    group['iconId'] = new UntypedFormControl('');
    group['sortOrder'] = new UntypedFormControl(0);
    group['courseContentSubSubTypes'] = this.formBuilder.array([]);
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  newSubSubContent() {
    let group = {};
    group['title'] = new UntypedFormControl('');
    group['summary'] = new UntypedFormControl('');
    group['sortOrder'] = new UntypedFormControl(0);
    group['iconId'] = new UntypedFormControl('');
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  onItemSelect(item: any) {
    let array = [];
    this.selectedItems.forEach(element => {
      let arr = this.locations.filter(x => x.name == element.name && x.id == element.id)
      if (arr && arr.length > 0) {
        array.push(arr[0]);
      }
    });
    this.locationArray = array;
    const FormArray: UntypedFormArray = this.formBuilder.array(array);
    this.courseForm.setControl('courseLocations', FormArray);
  }

  get getItems() {
    if (this.iconList && this.iconList.length > 0) {
      return this.iconList.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {});
    }
  }

  onFeatureIconSelect(item: any, i) {
    this.courseFeaturesArray.at(i).patchValue({
      iconId: item.id
    })
  }

  onIconSelect(item: any, i) {
    this.courseContentsArray.at(i).patchValue({
      iconId: item.id
    })
  }

  onSubIconSelect(item: any, i, j) {
    this.CourseSubContent(i).at(j).patchValue({
      iconId: item.id
    })
  }

  onChildIconSelect(item: any, i, j, k) {
    this.CourseSubSubContent(i, j).at(k).patchValue({
      iconId: item.id
    })
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  // isActive = false;

  // toggleClass(): void {
  //   this.isActive = !this.isActive;
  // }
   

}
