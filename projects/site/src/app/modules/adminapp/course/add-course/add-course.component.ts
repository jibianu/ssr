import { environment } from './../../../../../environments/environment';
import { CookieService } from 'src/app/core/services/cookie.service';
import { AdminAppService } from './../../adminapp.service';
import { Component, OnDestroy, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { MyUploadAdapter } from './UploadAdapter';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { StorageUtil } from 'src/app/core/utils/storage.util';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
    selector: 'app-add-course',
    templateUrl: './add-course.component.html',
    styleUrls: ['./add-course.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
      CommonModule,
      NgMultiSelectDropDownModule,
      ReactiveFormsModule,
      FormsModule,
      SharedModule
    ]
  })
export class AddCourseComponent implements OnInit, OnDestroy {

  pageTitle: string;
  btntext: string;
  courseId: string;
  courseForm: UntypedFormGroup;
  submitted = false;
  loading = false; // ✅ FIX: Track loading state to prevent double submissions
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
  // ✅ FIX: Track accordion section states
  accordionStates: { [key: string]: boolean } = {
    'collapse5': false,  // Course Title Summaries
    'collapse3': true,   // Course About Information (default open)
    'collapse7': false,  // Course Curriculum
    'collapse1': false,  // Become Course
    'collapse2': false,  // Frequently Asked Questions
    'collapse6': false,  // Course Trainers
    'collapse4': false   // Course Features
  };
  // ✅ FIX: Initialize dropdown settings with default values to prevent undefined errors
  dropdownSettings: any = {
    singleSelection: false,
    idField: 'id',
    textField: 'name',
    enableCheckAll: false,
    itemsShowLimit: 5,
    defaultOpen: false // ✅ FIX: Initialize defaultOpen to prevent undefined error
  };
  dropdownIconSettings: any = {
    singleSelection: true,
    itemsShowLimit: 5,
    idField: 'id',
    textField: 'url',
    closeDropDownOnSelection: true,
    defaultOpen: false // ✅ FIX: Initialize defaultOpen to prevent undefined error
  };
  courseData: any;
  iconList = [];
  // ✅ FIX: Initialize selectedfeatureitems as empty array to prevent undefined errors
  selectedfeatureitems: any[] = [];
  guid = '00000000-0000-0000-0000-000000000000'
  //formBuilder: any;
  //activatedRoute: any;

  constructor(
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private router: Router,
    private location: Location,
    private cookieService: CookieService,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  // ✅ FIX: Toggle accordion sections manually - CRITICAL FIX
  toggleCollapse(targetId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // ✅ SSR: Only execute DOM operations in browser
    if (typeof document === 'undefined') {
      return;
    }
    
    // Toggle state
    this.accordionStates[targetId] = !this.accordionStates[targetId];
    const isExpanded = this.accordionStates[targetId];
    
    // Update DOM
    setTimeout(() => {
      const collapseElement = document.getElementById(targetId);
      if (!collapseElement) {
        return;
      }
      
      const button = event ? (event.target as HTMLElement).closest('button') : null;
      
      if (isExpanded) {
        collapseElement.classList.add('show');
        if (button) {
          button.setAttribute('aria-expanded', 'true');
          button.classList.remove('collapsed');
        }
      } else {
        collapseElement.classList.remove('show');
        if (button) {
          button.setAttribute('aria-expanded', 'false');
          button.classList.add('collapsed');
        }
      }
    }, 10);
  }
  
  // ✅ FIX: Check if accordion section is expanded
  isExpanded(targetId: string): boolean {
    return this.accordionStates[targetId] || false;
  }

  ngOnInit(): void {
    // ✅ FIX: Initialize form FIRST before any async operations that might use it
    this.formInit();
    
    // IMPROVED: Use utility for safe storage access
    try {
      const currentUserCookie = this.cookieService.getCookie('currentUser');
      if (currentUserCookie) {
        const currentUser = JSON.parse(currentUserCookie);
        this.isAdmin = currentUser?.isAdmin ?? false;
      }
    } catch (error) {
      console.error('Error parsing currentUser cookie:', error);
      this.isAdmin = false;
    }
    
    // Use StorageUtil for safe sessionStorage access
    this.courseData = StorageUtil.getItemFromSession<any>('courseData', null);
    
    // ✅ FIX: Now safe to call async operations that might trigger setvalue()
    this.getIcons();
    this.getCategories();
    this.fetchLocations();
    
    // ✅ FIX: Update dropdown settings (already initialized with defaults above)
    this.dropdownSettings = {
      ...this.dropdownSettings, // Preserve defaults
      singleSelection: false,
      idField: 'id',
      textField: 'name',
      enableCheckAll: false,
      itemsShowLimit: 5
    };
    this.dropdownIconSettings = {
      ...this.dropdownIconSettings, // Preserve defaults
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
      iconId: [''],
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
          iconId: '7D53EA73-A46D-45C0-A78E-85C83371A8F4',
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

  // ✅ TYPE SAFETY: Return FormGroup[] for proper template access
  frequentlyAskedQuestionsArrayControls(): UntypedFormGroup[] {
    return (<UntypedFormArray>this.courseForm.get('frequentlyAskedQuestions')).controls as UntypedFormGroup[];
  }

  courseFeaturesArrayControls(): UntypedFormGroup[] {
    return (<UntypedFormArray>this.courseForm.get('courseFeatures')).controls as UntypedFormGroup[];
  }

  // ✅ TYPE SAFETY: Return FormGroup[] instead of AbstractControl[] for proper template access
  courseInformationArrayControls(): UntypedFormGroup[] {
    return (<UntypedFormArray>this.courseForm.get('courseInformation')).controls as UntypedFormGroup[];
  }

  courseSummariesArrayControls(): UntypedFormGroup[] {
    return (<UntypedFormArray>this.courseForm.get('courseSummaries')).controls as UntypedFormGroup[];
  }

  courseContentsArrayControls(): UntypedFormGroup[] {
    return (<UntypedFormArray>this.courseForm.get('courseContents')).controls as UntypedFormGroup[];
  }

  // ✅ TYPE SAFETY: Return FormGroup[] for proper template access
  courseTeachersArrayControls(): UntypedFormGroup[] {
    return (<UntypedFormArray>this.courseForm.get('courseTeachers')).controls as UntypedFormGroup[];
  }

  courseLocationsArrayControls(): UntypedFormGroup[] {
    return (<UntypedFormArray>this.courseForm.get('courseLocations')).controls as UntypedFormGroup[];
  }

  getCourseById(id) {
    this.subscription.add(this.appService.getCourseById(id).subscribe((res: any) => {
      if (res) {
        this.setvalue(res);
      }
    }));
  }

  // ✅ FIX: Update form immediately with submitted data (optimistic update)
  // This provides instant visual feedback while server reload completes
  updateFormWithSubmittedData(formData: any) {
    try {
      // Update basic form fields immediately for instant UI feedback
      this.courseForm.patchValue({
        title: formData.title || '',
        canonicalUrl: formData.canonicalUrl || '',
        metaDescription: formData.metaDescription || '',
        categoryId: formData.categoryId || '',
        iconId: formData.iconId || '',
        amount: formData.amount || 0,
        showOnDashboard: formData.showOnDashboard || false,
        titleImageUrl: formData.titleImageUrl || ''
      }, { emitEvent: false }); // Don't trigger validation events

      // Update becomeCourse if exists
      if (formData.becomeCourse) {
        const becomeCourseGroup = this.courseForm.get('becomeCourse') as UntypedFormGroup;
        if (becomeCourseGroup) {
          becomeCourseGroup.patchValue({
            title: formData.becomeCourse.title || '',
            description: formData.becomeCourse.description || ''
          }, { emitEvent: false });
        }
      }

      // Update selected course icon immediately
      if (formData.iconId && this.iconList && this.iconList.length > 0) {
        this.selectedCourseIcon = this.iconList.find(icon => icon.id === formData.iconId);
      }

      // Update location selection if provided
      if (formData.courseLocations && Array.isArray(formData.courseLocations)) {
        this.selectedItems = formData.courseLocations.map(loc => ({
          id: loc.locationId || loc.id,
          name: loc.name
        }));
        this.locationArray = formData.courseLocations;
      }

      // Force change detection to update UI immediately
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[AddCourseComponent] Error updating form with submitted data:', error);
    }
  }

  // ✅ FIX: Reload course data after update with retry mechanism
  // Uses exponential backoff to handle cache/backend delays
  reloadCourseDataWithRetry(maxRetries: number = 3, initialDelay: number = 200) {
    if (!this.courseId) return;

    let attempt = 0;
    const attemptReload = () => {
      attempt++;
      // Exponential backoff: 0ms (first), 200ms, 400ms, 800ms
      const delay = attempt === 1 ? 0 : initialDelay * Math.pow(2, attempt - 2);
      
      const performReload = () => {
        // Use cache-busting to ensure fresh data from server
        this.subscription.add(
          this.appService.getCourseByIdWithCacheBust(this.courseId).subscribe({
            next: (res: any) => {
              if (res && res.id) {
                // Successfully received data
                this.courseData = res;
                
                // Reset form arrays to prevent duplicate data
                this.resetFormArrays();
                
                // Re-populate form with fresh data from server
                this.setvalue(res);
                
                // Update selected items for location dropdown
                if (res.courseLocations && res.courseLocations.length > 0) {
                  this.selectedItems = res.courseLocations.map(loc => ({
                    id: loc.locationId || loc.id,
                    name: loc.name
                  }));
                  this.locationArray = res.courseLocations;
                }
                
                // Update selected course icon
                if (res.iconId && this.iconList && this.iconList.length > 0) {
                  this.selectedCourseIcon = this.iconList.find(icon => icon.id === res.iconId);
                }
                
                // Mark form as pristine since we just updated it with fresh data
                this.courseForm.markAsPristine();
                this.submitted = false;
                
                // Force change detection to update UI immediately
                this.cdr.detectChanges();
                console.log(`[AddCourseComponent] Course data reloaded successfully after update (attempt ${attempt})`);
              } else if (attempt < maxRetries) {
                // Retry if no valid data received
                console.log(`[AddCourseComponent] No data received, retrying (attempt ${attempt}/${maxRetries})...`);
                attemptReload();
              } else {
                console.warn('[AddCourseComponent] Failed to reload course data after all retries');
              }
            },
            error: (err) => {
              console.error(`[AddCourseComponent] Error reloading course data (attempt ${attempt}):`, err);
              if (attempt < maxRetries) {
                attemptReload();
              } else {
                console.error('[AddCourseComponent] Failed to reload course data after all retries');
              }
            }
          })
        );
      };

      if (delay === 0) {
        // First attempt: execute immediately
        performReload();
      } else {
        // Subsequent attempts: use delay
        setTimeout(performReload, delay);
      }
    };

    // Start first attempt
    attemptReload();
  }

  // ✅ FIX: Legacy method - kept for backward compatibility
  reloadCourseData() {
    this.reloadCourseDataWithRetry(1, 500);
  }

  // Helper method to reset form arrays before reloading
  resetFormArrays() {
    // Clear all form arrays to prevent duplicate data
    while (this.frequentlyAskedQuestionsArray.length > 0) {
      this.frequentlyAskedQuestionsArray.removeAt(0);
    }
    while (this.courseFeaturesArray.length > 0) {
      this.courseFeaturesArray.removeAt(0);
    }
    while (this.courseInformationArray.length > 0) {
      this.courseInformationArray.removeAt(0);
    }
    while (this.courseSummariesArray.length > 0) {
      this.courseSummariesArray.removeAt(0);
    }
    while (this.courseTeachersArray.length > 0) {
      this.courseTeachersArray.removeAt(0);
    }
    while (this.courseContentsArray.length > 0) {
      this.courseContentsArray.removeAt(0);
    }
    while (this.courseLocationsArray.length > 0) {
      this.courseLocationsArray.removeAt(0);
    }
    // Reset selected items arrays
    this.selectedfeatureitems = [];
    this.selectedItems = [];
    this.locationArray = [];
  }

  getIcons() {
    this.subscription.add(this.appService.getIcon().subscribe((res: any) => {
      if (res) {
        this.iconList = res
      }
      // FIXED: Add route.params subscription to cleanup on destroy
      this.subscription.add(
        this.activatedRoute.params.subscribe(params => {
          if (params['id']) {
            this.courseId = params['id'];
          }
        })
      );
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
    // ✅ FIX: Ensure courseForm is initialized before patching values
    if (!this.courseForm) {
      console.warn('courseForm not initialized yet, skipping setvalue');
      return;
    }

    this.courseForm.patchValue({
      title: res?.title ?? '',
      titleImageUrl: res.titleImageUrl ? res.titleImageUrl : environment.imgUrl,
      canonicalUrl: res.canonicalUrl ? res.canonicalUrl : '',
      amount: res.amount ? res.amount : 0,
      metaDescription: res.metaDescription ? res.metaDescription : '',
      categoryId: (res.category && res.category.id) ? res.category.id : (res.categoryId ? res.categoryId : ''),
      iconId: res.iconId ? res.iconId : '',
      showOnDashboard: res.showOnDashboard ? res.showOnDashboard : false,
    });
    // Set selected course icon if iconId exists
    if (res.iconId && this.iconList && this.iconList.length > 0) {
      this.selectedCourseIcon = this.iconList.find(icon => icon.id === res.iconId);
    }
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
    // IMPROVED: Use StorageUtil for safe storage access
    StorageUtil.setItemToSession('courseData', this.courseForm.value);
    this.router.navigateByUrl('/app/course/location');
  }

  getCategories() {
    this.subscription.add(this.appService.getCategories().subscribe((res: any) => {
      console.log(res);
      if (res) {
        this.categories = res;
      }
    }));
  }

  onSubmit() {
    this.submitted = true;
    
    // ✅ FIX: Prevent double submission
    if (this.loading) {
      console.warn('[AddCourseComponent] Submission already in progress, ignoring duplicate submit');
      return;
    }
    
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
    
    // ✅ FIX: Set loading state before making request
    this.loading = true;
    
    if (this.courseId) {
      // ✅ FIX: Ensure form data includes courseId for update
      const formData = {
        ...this.courseForm.value,
        id: this.courseId
      };
      
      this.subscription.add(this.appService.updateCourse(formData, this.courseId).subscribe({
        next: (response) => {
          this.loading = false;
          this.submitted = false;
          this.toasterService.showSuccess('Course updated successfully');
          
          // ✅ FIX: Immediately update form with submitted data as a fallback
          // This ensures UI reflects changes even before re-fetch completes
          this.updateFormWithSubmittedData(formData);
          
          // ✅ FIX: Reload course data from server to get complete updated data
          // Use multiple attempts with increasing delays to handle cache/backend delays
          this.reloadCourseDataWithRetry(3, 300);
        },
        error: (err) => {
          this.loading = false;
          console.error('[AddCourseComponent] Error updating course:', err);
          this.toasterService.showError(err?.error?.message || 'Failed to update course. Please try again.');
        }
      }));
    } else {
      this.subscription.add(this.appService.addCourse(this.courseForm.value).subscribe({
        next: () => {
          this.loading = false; // ✅ FIX: Reset loading state on success
          this.toasterService.showSuccess('Course created successfully');
          // ✅ FIX: Navigate to course list with refresh flag - use correct path /app/course/list
          this.router.navigate(['/app/course/list'], { queryParams: { refresh: Date.now() } });
        },
        error: (err) => {
          this.loading = false; // ✅ FIX: Reset loading state on error
          console.error('[AddCourseComponent] Error adding course:', err);
          // Error message will be shown by error interceptor
        }
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
    // IMPROVED: Use StorageUtil for safe storage access
    StorageUtil.clearSession();
  }

  fileProgress(fileInput: any) {
    this.fileData = <File>fileInput.target.files[0];
    if (!this.fileData) {
      return;
    }
    
    // Reset progress
    this.fileUploadProgress = '0';
    
    // FIXED: Add subscription to cleanup on destroy
    this.subscription.add(
      this.appService.uploadTitleImage(this.fileData).subscribe({
        next: (res) => {
          this.uploadedFilePath = res.url;
          this.courseForm.patchValue({
            titleImageUrl: this.uploadedFilePath
          });
          this.fileUploadProgress = null; // Clear progress on success
        },
        error: (err) => {
          console.error('Error uploading image:', err);
          this.fileUploadProgress = null;
          this.toasterService.showError('Failed to upload image. Please try again.');
        }
      })
    );
  }

  teacherFileProgress(fileInput: any, i) {
    let fileData = <File>fileInput.target.files[0];
    if (!fileData) {
      return;
    }
    
    // FIXED: Add subscription to cleanup on destroy
    this.subscription.add(
      this.appService.uploadTeacherImage(fileData).subscribe({
        next: (res) => {
          let uploadedFilePath = res.url;
          this.courseTeachersArray.at(i).patchValue({
            imageUrl: uploadedFilePath
          });
        },
        error: (err) => {
          console.error('Error uploading teacher image:', err);
          this.toasterService.showError('Failed to upload teacher image. Please try again.');
        }
      })
    );
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
    this.courseFeaturesArray.push(this.createCourseFeatureItems());
    
    // ✅ FIX: Ensure selectedfeatureitems array has an item for the new index
    // Initialize with empty array if needed, ng-multiselect expects an array
    const val: any[] = [];
    this.selectedfeatureitems.push(val);
  }

  removeCourseFeatureItems(index: number): void {
    // FIXED: Remove from form array first
    this.courseFeaturesArray.removeAt(index);
    // FIXED: Fix logic - remove item at index from selectedfeatureitems array
    if (index >= 0 && index < this.selectedfeatureitems.length) {
      this.selectedfeatureitems.splice(index, 1);
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
    group['iconId'] = new UntypedFormControl('7D53EA73-A46D-45C0-A78E-85C83371A8F4');
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

  // ✅ TYPE SAFETY: Helper method to get FormGroup[] for CourseSubContent
  CourseSubContentControls(aIndex: number): UntypedFormGroup[] {
    return this.CourseSubContent(aIndex).controls as UntypedFormGroup[];
  }

  CourseSubSubContent(aIndex, bIndex): UntypedFormArray {
    return ((this.courseForm.get('courseContents') as UntypedFormArray).controls[aIndex].get('courseContentSubTypes') as UntypedFormArray).controls[bIndex].get('courseContentSubSubTypes') as UntypedFormArray
  }

  // ✅ TYPE SAFETY: Helper method to get FormGroup[] for CourseSubSubContent
  CourseSubSubContentControls(aIndex: number, bIndex: number): UntypedFormGroup[] {
    return this.CourseSubSubContent(aIndex, bIndex).controls as UntypedFormGroup[];
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
    group['iconId'] = new UntypedFormControl('7D53EA73-A46D-45C0-A78E-85C83371A8F4');
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
    group['iconId'] = new UntypedFormControl('7D53EA73-A46D-45C0-A78E-85C83371A8F4');
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

  // New methods for compact icon dropdown
  selectedCourseIcon: any = null;

  onCourseIconChange(event: any) {
    const iconId = event.target.value;
    if (iconId) {
      this.selectedCourseIcon = this.iconList.find(icon => icon.id === iconId);
      this.courseForm.patchValue({ iconId: iconId });
    } else {
      this.selectedCourseIcon = null;
      this.courseForm.patchValue({ iconId: null });
    }
  }

  onIconSelectChange(event: any, i: number) {
    const iconId = event.target.value;
    if (iconId) {
      const icon = this.iconList.find(icon => icon.id === iconId);
      this.onIconSelect(icon, i);
    } else {
      this.courseContentsArray.at(i).patchValue({ iconId: null });
    }
  }

  onSubIconSelectChange(event: any, i: number, j: number) {
    const iconId = event.target.value;
    if (iconId) {
      const icon = this.iconList.find(icon => icon.id === iconId);
      this.onSubIconSelect(icon, i, j);
    } else {
      this.CourseSubContent(i).at(j).patchValue({ iconId: null });
    }
  }

  onChildIconSelectChange(event: any, i: number, j: number, k: number) {
    const iconId = event.target.value;
    if (iconId) {
      const icon = this.iconList.find(icon => icon.id === iconId);
      this.onChildIconSelect(icon, i, j, k);
    } else {
      this.CourseSubSubContent(i, j).at(k).patchValue({ iconId: null });
    }
  }

  onFeatureIconSelectChange(event: any, i: number) {
    const iconId = event.target.value;
    if (iconId) {
      const icon = this.iconList.find(icon => icon.id === iconId);
      this.onFeatureIconSelect(icon, i);
    } else {
      this.courseFeaturesArray.at(i).patchValue({ iconId: null });
    }
  }

  getSelectedIconForContent(i: number): any {
    const iconId = this.courseContentsArray.at(i).get('iconId')?.value;
    if (iconId && this.iconList) {
      return this.iconList.find(icon => icon.id === iconId);
    }
    return null;
  }

  getSelectedIconForSubContent(i: number, j: number): any {
    const iconId = this.CourseSubContent(i).at(j).get('iconId')?.value;
    if (iconId && this.iconList) {
      return this.iconList.find(icon => icon.id === iconId);
    }
    return null;
  }

  getSelectedIconForChildContent(i: number, j: number, k: number): any {
    const iconId = this.CourseSubSubContent(i, j).at(k).get('iconId')?.value;
    if (iconId && this.iconList) {
      return this.iconList.find(icon => icon.id === iconId);
    }
    return null;
  }

  getSelectedIconForFeature(i: number): any {
    const iconId = this.courseFeaturesArray.at(i).get('iconId')?.value;
    if (iconId && this.iconList) {
      return this.iconList.find(icon => icon.id === iconId);
    }
    return null;
  }

  resetForm() {
    if (confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      this.submitted = false;
      this.loading = false;
      this.uploadedFilePath = null;
      this.fileUploadProgress = null;
      this.selectedCourseIcon = null;
      this.courseForm.reset();
      this.formInit();
    }
  }

  // Helper methods to check if sections have data
  hasCourseSummaries(): boolean {
    if (!this.courseSummariesArray || this.courseSummariesArray.length === 0) {
      return false;
    }
    // Check if any summary has actual content
    return this.courseSummariesArray.controls.some(control => {
      const formGroup = control as UntypedFormGroup;
      const summary = formGroup.get('summary')?.value;
      return summary && summary.trim().length > 0;
    });
  }

  hasCourseInformation(): boolean {
    if (!this.courseInformationArray || this.courseInformationArray.length === 0) {
      return false;
    }
    // Check if any information has actual content
    return this.courseInformationArray.controls.some(control => {
      const formGroup = control as UntypedFormGroup;
      const title = formGroup.get('title')?.value;
      const summary = formGroup.get('summary')?.value;
      return (title && title.trim().length > 0) || (summary && summary.trim().length > 0);
    });
  }

  hasCourseContents(): boolean {
    if (!this.courseContentsArray || this.courseContentsArray.length === 0) {
      return false;
    }
    // Check if any content has actual title
    return this.courseContentsArray.controls.some(control => {
      const formGroup = control as UntypedFormGroup;
      const title = formGroup.get('title')?.value;
      return title && title.trim().length > 0;
    });
  }

  hasBecomeCourse(): boolean {
    if (!this.courseForm) return false;
    const becomeCourse = this.courseForm.get('becomeCourse') as UntypedFormGroup;
    if (!becomeCourse) return false;
    const title = becomeCourse.get('title')?.value;
    const description = becomeCourse.get('description')?.value;
    return (title && title.trim().length > 0) || (description && description.trim().length > 0);
  }

  hasFrequentlyAskedQuestions(): boolean {
    if (!this.frequentlyAskedQuestionsArray || this.frequentlyAskedQuestionsArray.length === 0) {
      return false;
    }
    // Check if any FAQ has actual content
    return this.frequentlyAskedQuestionsArray.controls.some(control => {
      const formGroup = control as UntypedFormGroup;
      const question = formGroup.get('question')?.value;
      const answer = formGroup.get('answer')?.value;
      return (question && question.trim().length > 0) || (answer && answer.trim().length > 0);
    });
  }

  hasCourseTeachers(): boolean {
    if (!this.courseTeachersArray || this.courseTeachersArray.length === 0) {
      return false;
    }
    // Check if any teacher has actual content
    return this.courseTeachersArray.controls.some(control => {
      const formGroup = control as UntypedFormGroup;
      const name = formGroup.get('name')?.value;
      const description = formGroup.get('description')?.value;
      return (name && name.trim().length > 0) || (description && description.trim().length > 0);
    });
  }

  hasCourseFeatures(): boolean {
    if (!this.courseFeaturesArray || this.courseFeaturesArray.length === 0) {
      return false;
    }
    // Check if any feature has actual content
    return this.courseFeaturesArray.controls.some(control => {
      const formGroup = control as UntypedFormGroup;
      const description = formGroup.get('description')?.value;
      return description && description.trim().length > 0;
    });
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
