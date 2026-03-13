import { ConfirmationModalComponent } from './../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { AddCurriculumComponent } from '../add-curriculum/add-curriculum.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, Inject, OnInit, AfterViewInit, OnDestroy, ViewChild, TemplateRef, DOCUMENT, NgZone, ChangeDetectorRef } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { CurriculumOpenService } from '../curriculum-open.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { DatePipe, Location } from '@angular/common';
import { AbstractControl, UntypedFormGroup, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { CookieService } from 'src/app/core/services/cookie.service';
import { environment } from 'src/environments/environment';
import { isLessonContentJson } from 'src/app/shared/models/lesson-content.model';
import type { LessonBlockType } from 'src/app/shared/models/lesson-content.model';

/** Tab identifiers for lesson sections; data remains in memory when switching */
export type LessonTab = 'concepts' | 'questions' | 'studyMaterials' | 'videoLectures';

@Component({
    selector: 'app-curriculum-list',
    templateUrl: './curriculum-list.component.html',
    styleUrls: ['./curriculum-list.component.scss'],
    standalone: false
})
export class CurriculumListComponent implements OnInit, AfterViewInit, OnDestroy {
  courseId: string;
  curriculumList = [];
  subscription: Subscription = new Subscription();
  config: any;
  tableSizes = [5, 10, 20, 25, 50];
  term = '';
  sortDir = 1;
  txtRoute: string;
  modalReference: NgbModalRef;
  curriculumId: string;
  questionLength:number = 0;
  questionItem:any;
  showQuestionTab: boolean = false;
  showConceptTab: boolean = false;
  showStudyTab: boolean = false;
  showVideoTab: boolean = false;
  curriculumDetailstitle:string;
  studyMaterials = [];
  concepts = [];
  videos = [];
  videoObj = {};
  index:number = 0;
  selectedCurriculumItem:any;
  operationOnModal:string;
  /** Active lesson tab; only this section's content is shown. Data for other sections is preserved. */
  currentTab: LessonTab = 'concepts';
  /** Active page tab: 'concepts' | 'questionset' | 'question' | 'prices' (synced with topbar). */
  activeTabId = 'concepts';
  /** Inline curriculum edit state */
  isEditingCurriculum = false;
  editCurriculumTitle = '';
  editCurriculumDescription = '';
  uploadedFilePath: string = null;
  fileData: File = null;
  selectedContent:string;
  /** Per-section view mode for lesson editor: 'author' | 'preview' (keys: 'sm-' + i, 'c-' + i) */
  sectionViewModes: { [key: string]: 'author' | 'preview' } = {};
  isLessonContent = isLessonContentJson;
  /** Only text block for question Solution and Answer text (no video/assignment). */
  questionEditorBlockTypes: LessonBlockType[] = ['text'];

  uploadImageFn = (file: File) =>
    this.appService.uploadImage(file).pipe(map((res: any) => res?.url || res?.Url || res?.documentPath || ''));

  deleteImageFn = (url: string) => this.appService.deleteImage(url);

  uploadInProgress = false;
  /** Number of video file uploads currently in progress; Update is disabled while > 0. */
  videoUploadsInProgress = 0;

  private initialConceptDescriptions: string[] = [];
  private initialStudyMaterialDescriptions: string[] = [];

  //curriculum study-material
  studyMaterialForm: UntypedFormGroup;
  guid = '00000000-0000-0000-0000-000000000000';
  submitted: boolean = false;
  btntext:string;

  //curriculum concepts
  conceptForm: UntypedFormGroup;

  //curriculum videos
  videoForm: UntypedFormGroup;

  //curriculum questions
  questionForm: UntypedFormGroup;
  courseInfo;
  coursePrice;
  courseForm: UntypedFormGroup;
  categories = [];
  priceForm: UntypedFormGroup;

  @ViewChild('content') contentTemplate: TemplateRef<any>;
  @ViewChild('cContent') cContentRef: TemplateRef<any>;
  @ViewChild('pContent') pContentRef: TemplateRef<any>;
  @ViewChild('publicLandingSidebar') publicLandingSidebarRef: TemplateRef<any>;
  @ViewChild('landingUpdateSuccessModal') landingUpdateSuccessModalRef: TemplateRef<any>;
  private pendingOpenCurriculumId: string;
  private publicLandingModalRef: NgbModalRef | null = null;

  /** Public landing sidebar: in-place Edit / Add / Remove (no new page) */
  showLandingEditPanel = false;
  showLandingAddPanel = false;
  showLandingAboutPanel = false;
  landingEditForm: { title: string; canonicalUrl: string; imageLink: string; promoVideoUrl: string; metaDescription: string; categoryId: string } = { title: '', canonicalUrl: '', imageLink: '', promoVideoUrl: '', metaDescription: '', categoryId: '' };
  landingAddForm: { title: string; imageLink: string; description: string; categoryId: string } = { title: '', imageLink: '', description: '', categoryId: '' };
  landingCategories: any[] = [];
  landingIframeKey = 0;
  landingSaveInProgress = false;
  titleImageUploading = false;
  titleImageUploadError: string | null = null;
  titleImageRemoveInProgress = false;
  promoVideoUploading = false;
  promoVideoUploadError: string | null = null;
  promoVideoRemoveInProgress = false;
  landingAddInProgress = false;
  /** True while loading course data for the Edit panel so existing page data can be shown. */
  landingEditLoadInProgress = false;
  /** About & Description panel */
  landingAboutDescription = '';
  landingAboutSaveInProgress = false;
  /** FAQ panel */
  showLandingFaqPanel = false;
  landingFaqList: any[] = [];
  landingFaqEditId: string | null = null;
  landingFaqQuestion = '';
  landingFaqAnswer = '';
  landingFaqSaveInProgress = false;
  landingNewFaqQuestion = '';
  landingNewFaqAnswer = '';
  landingFaqAddInProgress = false;
  /** Trainers panel */
  showLandingTrainersPanel = false;
  landingTrainersList: any[] = [];
  landingTrainerEditId: string | null = null;
  landingTrainerName = '';
  landingTrainerImageUrl = '';
  landingTrainerDescription = '';
  landingTrainerSaveInProgress = false;
  landingNewTrainerName = '';
  landingNewTrainerImageUrl = '';
  landingNewTrainerDescription = '';
  landingTrainerAddInProgress = false;
  /** Pricing panel */
  showLandingPricingPanel = false;
  landingPricesList: any[] = [];
  landingPriceEditId: string | null = null;
  landingPriceOriginalPrice: number | null = null;
  landingPriceDiscountedPrice: number | null = null;
  landingPriceStartDate = '';
  landingPriceEndDate = '';
  landingPriceSaveInProgress = false;
  landingNewPriceOriginalPrice: number | null = null;
  landingNewPriceDiscountedPrice: number | null = null;
  landingNewPriceStartDate = '';
  landingNewPriceEndDate = '';
  landingPriceAddInProgress = false;
  /** Contents (Curriculum) panel */
  showLandingContentsPanel = false;
  landingCurriculumsList: any[] = [];
  landingContentsLoadInProgress = false;
  /** Edit landing page accordion: which section is open (basic | category | media | pricing | description). */
  landingAccordionOpen: string = 'basic';
  /** Course Description sub-accordion (about | summaries | aboutinfo | features | become | curriculum | faq | trainers). */
  landingDescAccordionOpen: string = 'summaries';
  /** Course Title Summaries */
  landingSummariesList: any[] = [];
  landingSummaryEditId: string | null = null;
  landingSummaryTitle = '';
  landingSummarySummary = '';
  landingSummarySaveInProgress = false;
  landingNewSummaryTitle = '';
  landingNewSummarySummary = '';
  landingSummaryAddInProgress = false;
  /** Course About Information (info sections) */
  landingInfoList: any[] = [];
  landingInfoEditId: string | null = null;
  landingInfoTitle = '';
  landingInfoSummary = '';
  landingInfoSaveInProgress = false;
  landingNewInfoTitle = '';
  landingNewInfoSummary = '';
  landingInfoAddInProgress = false;
  /** Course Features */
  landingFeaturesList: any[] = [];
  landingFeatureEditId: string | null = null;
  landingFeatureDescription = '';
  landingFeatureSaveInProgress = false;
  landingNewFeatureDescription = '';
  landingFeatureAddInProgress = false;
  /** Become Course */
  landingBecomeCourse: any = null;
  landingBecomeTitle = '';
  landingBecomeDescription = '';
  landingBecomeSaveInProgress = false;

  constructor(
    private appService: AdminAppService,
    private curriculumOpenService: CurriculumOpenService,
    private sharedService: SharedService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private formBuilder: UntypedFormBuilder,
    private location: Location,
    private datePipe:DatePipe,
    private cookieService: CookieService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.config = {
      itemsPerPage: 20,
      currentPage: 1,
    };
    this.activatedRoute.params.subscribe(params => {
      if (params.courseId) {
        this.courseId = params.courseId;
        this.getCurriculumList(this.courseId);
        this.getCourseById(this.courseId);
        this.getAllPricesByCourseId(this.courseId);
      }
    });
    this.pendingOpenCurriculumId = this.curriculumOpenService.getAndClearCurriculumToOpen()
      || this.activatedRoute.snapshot.queryParams?.openCurriculum || null;
    this.activatedRoute.queryParams.subscribe(q => {
      if (q?.openCurriculum) this.pendingOpenCurriculumId = q.openCurriculum;
    });
    let routeData = this.document.location.href.includes('management');
    if (routeData) {
      this.txtRoute = 'management';
    } else {
      this.txtRoute = 'admin';
    }
    this.sharedService.showCurriculumToolbar.next(true);
    this.sharedService.curriculumActiveTab$.next('concepts');
    this.subscription.add(
      this.sharedService.curriculumActiveTab$.subscribe((tabId) => {
        this.activeTabId = tabId;
        this.cdr.markForCheck();
      })
    );
    this.subscription.add(
      this.sharedService.curriculumSearchTerm$.subscribe((value) => {
        this.term = value;
        this.cdr.markForCheck();
      })
    );
    this.subscription.add(
      this.sharedService.curriculumCheckCourseClick$.subscribe(() => {
        if (this.contentTemplate) this.checkCourse(this.contentTemplate, 0);
      })
    );
    this.subscription.add(
      this.sharedService.curriculumAddCurriculumClick$.subscribe(() => this.openAddCurriculumModal())
    );
    this.subscription.add(
      this.sharedService.curriculumEditCourseClick$.subscribe(() => {
        if (this.cContentRef && this.courseInfo) this.courseContent(this.cContentRef, this.courseInfo);
      })
    );
    this.subscription.add(
      this.sharedService.curriculumEditPriceClick$.subscribe(() => {
        if (this.pContentRef) this.priceContent(this.pContentRef, this.coursePrice || null);
      })
    );
    this.editCurriculum('view');
    this.formInit();
    this.courseFormInit();
    this.priceFormInit();
  }

  /** Course pricing type: 'free' | 'paid' (Udemy-style) */
  readonly PRICING_TYPE_FREE = 'free';
  readonly PRICING_TYPE_PAID = 'paid';

  priceFormInit() {
    this.priceForm = this.formBuilder.group({
      coursePricingType: ['paid'],
      originalPrice: [''],
      discountedPrice: [''],
      startDate: [''],
      endDate: [''],
      courseId: [this.courseId ? this.courseId : this.guid],
      id: ['']
    });
    this.updatePriceValidatorsForType(this.priceForm.get('coursePricingType')?.value);
    this.priceForm.get('coursePricingType')?.valueChanges.subscribe((t: string) => this.updatePriceValidatorsForType(t));
    this.priceForm.get('originalPrice')?.valueChanges.subscribe(() => this.priceForm.get('discountedPrice')?.updateValueAndValidity());
  }

  private updatePriceValidatorsForType(pricingType: string): void {
    const isFree = pricingType === this.PRICING_TYPE_FREE;
    const originalPrice = this.priceForm.get('originalPrice');
    const discountedPrice = this.priceForm.get('discountedPrice');
    const startDate = this.priceForm.get('startDate');
    const endDate = this.priceForm.get('endDate');
    if (isFree) {
      originalPrice?.clearValidators();
      discountedPrice?.clearValidators();
      startDate?.clearValidators();
      endDate?.clearValidators();
      this.priceForm.patchValue({
        originalPrice: 0,
        discountedPrice: 0,
        startDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
        endDate: this.datePipe.transform(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      }, { emitEvent: false });
    } else {
      originalPrice?.setValidators([Validators.required, Validators.min(0)]);
      discountedPrice?.setValidators([
        Validators.min(0),
        (control) => {
          const orig = Number(this.priceForm.get('originalPrice')?.value);
          const disc = Number(control?.value);
          if (orig > 0 && disc > 0 && disc >= orig) {
            return { discountMustBeLower: true };
          }
          return null;
        }
      ]);
      startDate?.clearValidators();
      endDate?.clearValidators();
    }
    originalPrice?.updateValueAndValidity();
    discountedPrice?.updateValueAndValidity();
    startDate?.updateValueAndValidity();
    endDate?.updateValueAndValidity();
  }

  priceSetvalue(res: any) {
    const orig = res?.originalPrice ?? res?.OriginalPrice ?? 0;
    const disc = res?.discountedPrice ?? res?.DiscountedPrice ?? 0;
    const isFree = orig === 0 && disc === 0;
    const startVal = res?.startDate ?? res?.StartDate;
    const endVal = res?.endDate ?? res?.EndDate;
    this.priceForm.patchValue({
      id: res?.id ? res.id : this.guid,
      coursePricingType: isFree ? this.PRICING_TYPE_FREE : this.PRICING_TYPE_PAID,
      originalPrice: orig,
      discountedPrice: disc,
      courseId: res?.courseId ?? res?.CourseId ?? this.courseId,
      startDate: startVal ? this.datePipe.transform(startVal, 'yyyy-MM-dd') : this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      endDate: endVal ? this.datePipe.transform(endVal, 'yyyy-MM-dd') : this.datePipe.transform(new Date(), 'yyyy-MM-dd')
    }, { emitEvent: false });
    this.updatePriceValidatorsForType(isFree ? this.PRICING_TYPE_FREE : this.PRICING_TYPE_PAID);
  }
  get priceF() { return this.priceForm.controls; }

  courseFormInit() {
    this.courseForm = this.formBuilder.group({
      title: ['', Validators.required],
      imageLink: [''],
      description: ['', Validators.required],
      categoryId: ['', Validators.required],
    })
  }

  get courseF() { return this.courseForm.controls; }

  courseSetvalue(res) {
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

  getCourseById(id) {
    this.subscription.add(this.appService.getCourseById(id).subscribe((res: any) => {
      if (res) {
        this.courseInfo = res;
        this.cdr.markForCheck();
      }
    }));
  }

  /** URL of the site public course page for this course. Prefer course ID so preview always works (backend returns course by ID even when slug not set or not published). */
  get publicLandingPageUrl(): string | null {
    if (!this.courseId) return null;
    const configured = (environment as any).publicCourseSiteUrl;
    const base = (typeof configured === 'string' && configured.trim() !== '') ? configured : (typeof window !== 'undefined' ? window.location.origin : '');
    if (!base) return null;
    // Use course ID so backend GET page/course/course/{id} returns the course (no 404 when slug missing or unpublished)
    const path = '/' + encodeURIComponent(this.courseId);
    const url = base.replace(/\/$/, '') + path;
    return url + (url.includes('?') ? '&embed=1' : '?embed=1');
  }

  /** Opens the editable sidenav (right-side panel) with the public landing page in an iframe. */
  openPublicLandingPageSidebar(): void {
    if (!this.publicLandingSidebarRef) return;
    if (this.publicLandingModalRef) {
      this.publicLandingModalRef.close();
      this.publicLandingModalRef = null;
    }
    this.showLandingEditPanel = false;
    this.showLandingAddPanel = false;
    this.showLandingAboutPanel = false;
    this.showLandingFaqPanel = false;
    this.showLandingTrainersPanel = false;
    this.loadLandingCourseData();
    // Ensure course info is loaded so Edit/About panels and iframe have current data (e.g. when opening before list loaded)
    if (this.courseId && !this.courseInfo) {
      this.subscription.add(this.appService.getCourseById(this.courseId).subscribe((res: any) => {
        if (res) { this.courseInfo = res; this.cdr.markForCheck(); }
      }));
    }
    this.publicLandingModalRef = this.modalService.open(this.publicLandingSidebarRef, {
      size: 'xl',
      scrollable: true,
      windowClass: 'modal-right public-landing-sidenav-modal',
      backdrop: true,
      keyboard: true
    });
    this.publicLandingModalRef.result.then(() => {}, () => {}).finally(() => {
      this.publicLandingModalRef = null;
      this.showLandingEditPanel = false;
      this.showLandingAddPanel = false;
      this.showLandingAboutPanel = false;
      this.cdr.markForCheck();
    });
    // Open edit panel and load course data immediately (edit-only view, no preview)
    this.openLandingEdit();
    this.cdr.markForCheck();
  }

  /** Load course and categories for sidebar edit/add panels. */
  loadLandingCourseData(): void {
    this.applyCourseInfoToLandingEditForm(this.courseInfo);
    this.subscription.add(this.appService.getCategories().subscribe((res: any) => {
      this.landingCategories = res || [];
      this.cdr.markForCheck();
    }));
  }

  /** Populate landing edit form from a course object (handles camelCase and PascalCase). Patches in place so ngModel bindings update. */
  private applyCourseInfoToLandingEditForm(course: any): void {
    if (!course) return;
    const cat = course.category || course.Category;
    const categoryId = (cat && (cat.id || cat.Id)) ? (cat.id || cat.Id) : (course.categoryId || course.CategoryId || '');
    this.landingEditForm.title = course.title ?? course.Title ?? '';
    this.landingEditForm.canonicalUrl = course.slug ?? course.Slug ?? '';
    this.landingEditForm.imageLink = course.imageLink ?? course.ImageLink ?? '';
    this.landingEditForm.promoVideoUrl = course.promoVideoUrl ?? course.PromoVideoUrl ?? '';
    this.landingEditForm.metaDescription = course.description ?? course.Description ?? '';
    this.landingEditForm.categoryId = typeof categoryId === 'string' ? categoryId : (categoryId ? String(categoryId) : '');
  }

  /** Show edit panel, fetch course data so existing page data loads and is editable. */
  openLandingEdit(): void {
    if (!this.courseId) {
      this.showLandingEditPanel = true;
      this.cdr.markForCheck();
      return;
    }
    this.showLandingAddPanel = false;
    this.showLandingAboutPanel = false;
    this.showLandingFaqPanel = false;
    this.showLandingTrainersPanel = false;
    this.showLandingPricingPanel = false;
    this.showLandingContentsPanel = false;
    this.showLandingEditPanel = true;
    this.landingEditLoadInProgress = true;
    this.cdr.markForCheck();
    // Load course so the form shows current values (existing page data visible and editable)
    this.subscription.add(this.appService.getCourseById(this.courseId).subscribe({
      next: (res: any) => {
        this.landingEditLoadInProgress = false;
        if (res) {
          this.courseInfo = res;
          this.applyCourseInfoToLandingEditForm(res);
        }
        if (!this.landingCategories || this.landingCategories.length === 0) {
          this.subscription.add(this.appService.getCategories().subscribe((cats: any) => {
            this.landingCategories = cats || [];
            this.cdr.markForCheck();
          }));
        }
        this.loadLandingFaqList();
        this.loadLandingTrainersList();
        this.loadLandingPricesList();
        this.loadLandingSummariesList();
        this.loadLandingInfoList();
        this.loadLandingFeaturesList();
        this.loadBecomeCourse();
        this.cdr.markForCheck();
      },
      error: () => {
        this.landingEditLoadInProgress = false;
        this.cdr.markForCheck();
      }
    }));
  }

  setLandingAccordion(section: string): void {
    this.landingAccordionOpen = this.landingAccordionOpen === section ? '' : section;
    this.cdr.markForCheck();
  }

  setLandingDescAccordion(section: string): void {
    this.landingDescAccordionOpen = this.landingDescAccordionOpen === section ? '' : section;
    this.cdr.markForCheck();
  }

  cancelLandingEdit(): void {
    this.showLandingEditPanel = false;
    this.landingEditLoadInProgress = false;
    if (this.publicLandingModalRef) {
      this.publicLandingModalRef.close();
      this.publicLandingModalRef = null;
    }
    this.cdr.markForCheck();
  }

  /** Reload course from server and re-apply to form (Reset). */
  resetLandingEdit(): void {
    if (!this.courseId || this.landingEditLoadInProgress) return;
    this.landingEditLoadInProgress = true;
    this.cdr.markForCheck();
    this.subscription.add(this.appService.getCourseById(this.courseId).subscribe({
      next: (res: any) => {
        this.landingEditLoadInProgress = false;
        if (res) {
          this.courseInfo = res;
          this.applyCourseInfoToLandingEditForm(res);
        }
        this.loadLandingFaqList();
        this.loadLandingTrainersList();
        this.loadLandingPricesList();
        this.loadLandingSummariesList();
        this.loadLandingInfoList();
        this.loadLandingFeaturesList();
        this.loadBecomeCourse();
        this.cdr.markForCheck();
      },
      error: () => {
        this.landingEditLoadInProgress = false;
        this.cdr.markForCheck();
      }
    }));
  }

  saveLandingCourse(): void {
    if (!this.courseId || this.landingSaveInProgress) return;
    this.landingSaveInProgress = true;
    this.cdr.markForCheck();
    const payload = {
      title: this.landingEditForm.title?.trim() ?? '',
      canonicalUrl: this.landingEditForm.canonicalUrl?.trim() ?? '',
      categoryId: this.landingEditForm.categoryId ?? '',
      metaDescription: this.landingEditForm.metaDescription?.trim() ?? '',
      titleImageUrl: this.landingEditForm.imageLink?.trim() ?? '',
      promoVideoUrl: this.landingEditForm.promoVideoUrl?.trim() ?? ''
    };
    this.subscription.add(this.appService.updateCourseFromLanding(this.courseId, payload).subscribe({
      next: () => {
        this.landingSaveInProgress = false;
        this.showLandingEditPanel = false;
        this.getCourseById(this.courseId);
        this.landingIframeKey++;
        this.toasterService.showSuccess('Course updated successfully');
        if (this.landingUpdateSuccessModalRef) {
          this.modalService.open(this.landingUpdateSuccessModalRef, { centered: true, size: 'sm' });
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.landingSaveInProgress = false;
        this.toasterService.showError('Failed to update course');
        this.cdr.markForCheck();
      }
    }));
  }

  /** Title image: upload file to S3, then save URL to DB. */
  onTitleImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file || !this.courseId) return;
    if (!file.type.startsWith('image/')) {
      this.toasterService.showError('Please select an image (PNG, JPG, GIF).');
      return;
    }
    this.titleImageUploadError = null;
    this.titleImageUploading = true;
    this.cdr.markForCheck();
    this.subscription.add(this.appService.uploadCourseTitleImage(this.courseId, file).subscribe({
      next: (res) => {
        const url = (res && (res.url ?? res.Url)) ? (res.url ?? res.Url) : '';
        if (input) input.value = '';
        if (url) {
          this.landingEditForm.imageLink = url;
          this.subscription.add(this.appService.updateCourseFromLanding(this.courseId, {
            title: this.landingEditForm.title?.trim() ?? '',
            canonicalUrl: this.landingEditForm.canonicalUrl?.trim() ?? '',
            categoryId: this.landingEditForm.categoryId ?? '',
            metaDescription: this.landingEditForm.metaDescription?.trim() ?? '',
            titleImageUrl: url,
            promoVideoUrl: this.landingEditForm.promoVideoUrl?.trim() ?? ''
          }).subscribe({
            next: () => {
              this.titleImageUploading = false;
              this.getCourseById(this.courseId);
              this.toasterService.showSuccess('Image uploaded and saved to DB.');
              this.cdr.markForCheck();
            },
            error: () => {
              this.titleImageUploading = false;
              this.toasterService.showError('Image uploaded but failed to save URL to DB.');
              this.cdr.markForCheck();
            }
          }));
        } else {
          this.titleImageUploading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.titleImageUploadError = err?.error?.message || err?.message || 'Upload failed.';
        this.titleImageUploading = false;
        if (input) input.value = '';
        this.toasterService.showError(this.titleImageUploadError || 'Upload failed.');
        this.cdr.markForCheck();
      }
    }));
  }

  /** Promo video: upload file to S3, then save URL to DB. */
  onPromoVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file || !this.courseId) return;
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!videoTypes.includes(file.type) && !file.name?.toLowerCase().match(/\.(mp4|webm|mov)$/)) {
      this.toasterService.showError('Please select a video (MP4, WebM, MOV).');
      return;
    }
    this.promoVideoUploadError = null;
    this.promoVideoUploading = true;
    this.cdr.markForCheck();
    this.subscription.add(this.appService.uploadCoursePromoVideo(this.courseId, file).subscribe({
      next: (res) => {
        const url = (res && (res.url ?? res.Url)) ? (res.url ?? res.Url) : '';
        if (input) input.value = '';
        if (url) {
          this.landingEditForm.promoVideoUrl = url;
          this.subscription.add(this.appService.updateCourseFromLanding(this.courseId, {
            title: this.landingEditForm.title?.trim() ?? '',
            canonicalUrl: this.landingEditForm.canonicalUrl?.trim() ?? '',
            categoryId: this.landingEditForm.categoryId ?? '',
            metaDescription: this.landingEditForm.metaDescription?.trim() ?? '',
            titleImageUrl: this.landingEditForm.imageLink?.trim() ?? '',
            promoVideoUrl: url
          }).subscribe({
            next: () => {
              this.promoVideoUploading = false;
              this.getCourseById(this.courseId);
              this.toasterService.showSuccess('Video uploaded and saved to DB.');
              this.cdr.markForCheck();
            },
            error: () => {
              this.promoVideoUploading = false;
              this.toasterService.showError('Video uploaded but failed to save URL to DB.');
              this.cdr.markForCheck();
            }
          }));
        } else {
          this.promoVideoUploading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.promoVideoUploadError = err?.error?.message || err?.message || 'Upload failed.';
        this.promoVideoUploading = false;
        if (input) input.value = '';
        this.toasterService.showError(this.promoVideoUploadError || 'Upload failed.');
        this.cdr.markForCheck();
      }
    }));
  }

  /** Remove title image: delete from S3 and clear URL in DB, then refresh form. */
  removeTitleImage(): void {
    if (!this.courseId || this.titleImageRemoveInProgress) return;
    this.titleImageRemoveInProgress = true;
    this.titleImageUploadError = null;
    this.cdr.markForCheck();
    this.subscription.add(this.appService.deleteCourseTitleImage(this.courseId).subscribe({
      next: () => {
        this.landingEditForm.imageLink = '';
        if (this.courseInfo) this.courseInfo = { ...this.courseInfo, imageLink: '', ImageLink: '' };
        this.titleImageRemoveInProgress = false;
        this.getCourseById(this.courseId);
        this.landingIframeKey++;
        this.toasterService.showSuccess('Title image removed from S3 and database.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.titleImageRemoveInProgress = false;
        const msg = err?.error?.message || err?.message || 'Failed to remove image';
        this.toasterService.showError(typeof msg === 'string' ? msg : 'Failed to remove image');
        this.cdr.markForCheck();
      }
    }));
  }

  /** Remove promo video: delete from S3 and clear URL in DB, then refresh form. */
  removePromoVideo(): void {
    if (!this.courseId || this.promoVideoRemoveInProgress) return;
    this.promoVideoRemoveInProgress = true;
    this.promoVideoUploadError = null;
    this.cdr.markForCheck();
    this.subscription.add(this.appService.deleteCoursePromoVideo(this.courseId).subscribe({
      next: () => {
        this.landingEditForm.promoVideoUrl = '';
        if (this.courseInfo) this.courseInfo = { ...this.courseInfo, promoVideoUrl: '', PromoVideoUrl: '' };
        this.promoVideoRemoveInProgress = false;
        this.getCourseById(this.courseId);
        this.landingIframeKey++;
        this.toasterService.showSuccess('Promo video removed from S3 and database.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.promoVideoRemoveInProgress = false;
        const msg = err?.error?.message || err?.message || 'Failed to remove video';
        this.toasterService.showError(typeof msg === 'string' ? msg : 'Failed to remove video');
        this.cdr.markForCheck();
      }
    }));
  }

  /** Show add course panel. */
  openLandingAdd(): void {
    this.landingAddForm = { title: '', imageLink: '', description: '', categoryId: '' };
    if (this.landingCategories.length === 0) this.loadLandingCourseData();
    this.showLandingEditPanel = false;
    this.showLandingAboutPanel = false;
    this.showLandingFaqPanel = false;
    this.showLandingTrainersPanel = false;
    this.showLandingPricingPanel = false;
    this.showLandingContentsPanel = false;
    this.showLandingAddPanel = true;
    this.cdr.markForCheck();
  }

  cancelLandingAdd(): void {
    this.showLandingAddPanel = false;
    this.cdr.markForCheck();
  }

  addLandingCourseSubmit(): void {
    if (!this.landingAddForm.title?.trim() || !this.landingAddForm.categoryId || !this.landingAddForm.description?.trim() || this.landingAddInProgress) return;
    this.landingAddInProgress = true;
    this.cdr.markForCheck();
    this.subscription.add(this.appService.addCourse(this.landingAddForm).subscribe({
      next: (res: any) => {
        this.landingAddInProgress = false;
        this.showLandingAddPanel = false;
        this.toasterService.showSuccess('Course created successfully');
        const newId = res?.id ?? res?.Id;
        if (newId) this.router.navigate(['/app/admin/course/curriculum/list', newId]);
        this.cdr.markForCheck();
      },
      error: () => {
        this.landingAddInProgress = false;
        this.toasterService.showError('Failed to create course');
        this.cdr.markForCheck();
      }
    }));
  }

  /** About & Description panel: edit course description in sidebar. */
  openLandingAboutPanel(): void {
    this.landingAboutDescription = this.courseInfo?.description || this.courseInfo?.Description || '';
    this.showLandingEditPanel = false;
    this.showLandingAddPanel = false;
    this.showLandingAboutPanel = true;
    this.showLandingFaqPanel = false;
    this.showLandingTrainersPanel = false;
    this.showLandingPricingPanel = false;
    this.showLandingContentsPanel = false;
    this.cdr.markForCheck();
  }

  cancelLandingAbout(): void {
    this.showLandingAboutPanel = false;
    this.cdr.markForCheck();
  }

  saveLandingAbout(): void {
    if (!this.courseId || this.landingAboutSaveInProgress) return;
    this.landingAboutSaveInProgress = true;
    const cat = this.courseInfo?.category || this.courseInfo?.Category;
    const categoryId = (cat && (cat.id || cat.Id)) ? (cat.id || cat.Id) : (this.courseInfo?.categoryId || this.courseInfo?.CategoryId || '');
    const payload = {
      title: (this.courseInfo?.title ?? this.courseInfo?.Title ?? '').toString().trim(),
      canonicalUrl: (this.courseInfo?.slug ?? this.courseInfo?.Slug ?? '').toString().trim(),
      categoryId: typeof categoryId === 'string' ? categoryId : (categoryId ? String(categoryId) : ''),
      metaDescription: (this.landingAboutDescription ?? '').toString().trim(),
      titleImageUrl: (this.courseInfo?.imageLink ?? this.courseInfo?.ImageLink ?? '').toString().trim(),
      promoVideoUrl: (this.courseInfo?.promoVideoUrl ?? this.courseInfo?.PromoVideoUrl ?? '').toString().trim()
    };
    this.subscription.add(this.appService.updateCourseFromLanding(this.courseId, payload).subscribe({
      next: () => {
        this.landingAboutSaveInProgress = false;
        this.showLandingAboutPanel = false;
        this.getCourseById(this.courseId);
        this.landingIframeKey++;
        this.toasterService.showSuccess('About & description updated');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.landingAboutSaveInProgress = false;
        const msg = err?.error?.message || err?.message || 'Failed to update';
        this.toasterService.showError(typeof msg === 'string' ? msg : 'Failed to update');
        this.cdr.markForCheck();
      }
    }));
  }

  /** FAQ panel */
  openLandingFaqPanel(): void {
    this.showLandingEditPanel = false;
    this.showLandingAddPanel = false;
    this.showLandingAboutPanel = false;
    this.showLandingFaqPanel = true;
    this.showLandingTrainersPanel = false;
    this.showLandingPricingPanel = false;
    this.showLandingContentsPanel = false;
    this.landingFaqEditId = null;
    this.landingNewFaqQuestion = '';
    this.landingNewFaqAnswer = '';
    this.loadLandingFaqList();
    this.cdr.markForCheck();
  }

  loadLandingFaqList(): void {
    if (!this.courseId) return;
    this.subscription.add(this.appService.getCourseFaqsByCourseId(this.courseId).subscribe({
      next: (res) => { this.landingFaqList = Array.isArray(res) ? res : []; this.cdr.markForCheck(); },
      error: () => { this.landingFaqList = []; this.cdr.markForCheck(); }
    }));
  }

  cancelLandingFaq(): void {
    this.showLandingFaqPanel = false;
    this.landingFaqEditId = null;
    this.cdr.markForCheck();
  }

  addLandingFaq(): void {
    if (!this.courseId || !this.landingNewFaqQuestion?.trim() || this.landingFaqAddInProgress) return;
    this.landingFaqAddInProgress = true;
    this.subscription.add(this.appService.addCourseFaq(this.courseId, { question: this.landingNewFaqQuestion.trim(), answer: this.landingNewFaqAnswer?.trim() || '' }).subscribe({
      next: () => {
        this.landingFaqAddInProgress = false;
        this.landingNewFaqQuestion = '';
        this.landingNewFaqAnswer = '';
        this.loadLandingFaqList();
        this.landingIframeKey++;
        this.toasterService.showSuccess('FAQ added');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.landingFaqAddInProgress = false;
        const msg = err?.error?.message || err?.error?.error || err?.message || 'Failed to add FAQ';
        this.toasterService.showError(typeof msg === 'string' ? msg : 'Failed to add FAQ');
        this.cdr.markForCheck();
      }
    }));
  }

  startEditLandingFaq(item: any): void {
    this.landingFaqEditId = item?.id ?? item?.Id;
    this.landingFaqQuestion = item?.question ?? item?.Question ?? '';
    this.landingFaqAnswer = item?.answer ?? item?.Answer ?? '';
    this.cdr.markForCheck();
  }

  cancelEditLandingFaq(): void {
    this.landingFaqEditId = null;
    this.cdr.markForCheck();
  }

  saveLandingFaqEdit(): void {
    if (!this.landingFaqEditId || this.landingFaqSaveInProgress) return;
    this.landingFaqSaveInProgress = true;
    this.subscription.add(this.appService.updateCourseFaq(this.landingFaqEditId, { question: this.landingFaqQuestion?.trim(), answer: this.landingFaqAnswer?.trim() }).subscribe({
      next: () => {
        this.landingFaqSaveInProgress = false;
        this.landingFaqEditId = null;
        this.loadLandingFaqList();
        this.landingIframeKey++;
        this.toasterService.showSuccess('FAQ updated');
        this.cdr.markForCheck();
      },
      error: () => { this.landingFaqSaveInProgress = false; this.toasterService.showError('Failed to update FAQ'); this.cdr.markForCheck(); }
    }));
  }

  removeLandingFaq(item: any): void {
    const id = item?.id ?? item?.Id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Remove FAQ';
    modalRef.componentInstance.descText = 'Remove this question?';
    modalRef.componentInstance.confirmLabel = 'Remove';
    modalRef.result.then((result: string) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCourseFaq(id).subscribe({
          next: () => {
            this.loadLandingFaqList();
            this.landingIframeKey++;
            if (this.landingFaqEditId === id) this.landingFaqEditId = null;
            this.toasterService.showSuccess('FAQ removed');
            this.cdr.markForCheck();
          },
          error: () => { this.toasterService.showError('Failed to remove'); this.cdr.markForCheck(); }
        }));
      }
    }, () => {});
  }

  /** Course Title Summaries */
  loadLandingSummariesList(afterLoaded?: () => void): void {
    if (!this.courseId) return;
    this.subscription.add(this.appService.getCourseSummariesByCourseId(this.courseId).subscribe({
      next: (res) => {
        this.landingSummariesList = Array.isArray(res) ? res : [];
        if (this.landingSummariesList.length === 0 && this.courseInfo) {
          this.landingNewSummaryTitle = this.courseInfo.title ?? this.courseInfo.Title ?? '';
          this.landingNewSummarySummary = this.landingEditForm.metaDescription || (this.courseInfo.description ?? this.courseInfo.Description ?? '');
        }
        if (afterLoaded) afterLoaded();
        this.cdr.markForCheck();
      },
      error: () => { this.landingSummariesList = []; if (afterLoaded) afterLoaded(); this.cdr.markForCheck(); }
    }));
  }
  /** Push first summary to course About/Description so other sections (About, DESCRIPTION tab) stay in sync. */
  private syncFirstSummaryToCourseDescription(): void {
    const first = this.landingSummariesList && this.landingSummariesList[0];
    const summaryText = first ? (first.summary ?? first.Summary ?? '') : '';
    this.landingEditForm.metaDescription = summaryText;
    if (!this.courseId || this.landingSaveInProgress) return;
    this.subscription.add(this.appService.updateCourseFromLanding(this.courseId, {
      title: this.landingEditForm.title,
      canonicalUrl: this.landingEditForm.canonicalUrl,
      categoryId: this.landingEditForm.categoryId,
      metaDescription: summaryText,
      titleImageUrl: this.landingEditForm.imageLink,
      promoVideoUrl: this.landingEditForm.promoVideoUrl?.trim() ?? ''
    }).subscribe({
      next: () => { this.courseInfo = { ...this.courseInfo, description: summaryText }; this.cdr.markForCheck(); },
      error: () => { this.cdr.markForCheck(); }
    }));
  }
  addLandingSummary(): void {
    if (!this.courseId || this.landingSummaryAddInProgress) return;
    this.landingSummaryAddInProgress = true;
    const title = this.landingNewSummaryTitle?.trim() || ('Summary ' + ((this.landingSummariesList?.length ?? 0) + 1));
    const summary = this.landingNewSummarySummary?.trim() || '';
    this.subscription.add(this.appService.addCourseSummary(this.courseId, { title, summary }).subscribe({
      next: () => {
        this.landingSummaryAddInProgress = false;
        this.landingNewSummaryTitle = '';
        this.landingNewSummarySummary = '';
        this.loadLandingSummariesList(() => this.syncFirstSummaryToCourseDescription());
        this.toasterService.showSuccess('Summary added');
        this.cdr.markForCheck();
      },
      error: () => { this.landingSummaryAddInProgress = false; this.toasterService.showError('Failed to add summary'); this.cdr.markForCheck(); }
    }));
  }
  startEditLandingSummary(item: any): void { this.landingSummaryEditId = item?.id ?? item?.Id; this.landingSummaryTitle = item?.title ?? item?.Title ?? ''; this.landingSummarySummary = item?.summary ?? item?.Summary ?? ''; this.cdr.markForCheck(); }
  cancelEditLandingSummary(): void { this.landingSummaryEditId = null; this.cdr.markForCheck(); }
  saveLandingSummaryEdit(): void {
    if (!this.landingSummaryEditId || this.landingSummarySaveInProgress) return;
    this.landingSummarySaveInProgress = true;
    this.subscription.add(this.appService.updateCourseSummary(this.landingSummaryEditId, { title: this.landingSummaryTitle?.trim(), summary: this.landingSummarySummary?.trim() }).subscribe({
      next: () => {
        this.landingSummarySaveInProgress = false;
        this.landingSummaryEditId = null;
        this.loadLandingSummariesList(() => this.syncFirstSummaryToCourseDescription());
        this.toasterService.showSuccess('Summary updated');
        this.cdr.markForCheck();
      },
      error: () => { this.landingSummarySaveInProgress = false; this.toasterService.showError('Failed to update'); this.cdr.markForCheck(); }
    }));
  }
  removeLandingSummary(item: any): void {
    const id = item?.id ?? item?.Id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Remove summary'; modalRef.componentInstance.descText = 'Remove this summary section?'; modalRef.componentInstance.confirmLabel = 'Remove';
    modalRef.result.then((result: string) => {
      if (result === 'ok') this.subscription.add(this.appService.deleteCourseSummary(id).subscribe({
        next: () => {
          this.loadLandingSummariesList(() => this.syncFirstSummaryToCourseDescription());
          if (this.landingSummaryEditId === id) this.landingSummaryEditId = null;
          this.toasterService.showSuccess('Summary removed');
          this.cdr.markForCheck();
        },
        error: () => { this.toasterService.showError('Failed to remove'); this.cdr.markForCheck(); }
      }));
    }, () => {});
  }

  /** Course About Information */
  loadLandingInfoList(): void {
    if (!this.courseId) return;
    this.subscription.add(this.appService.getCourseInformationByCourseId(this.courseId).subscribe({
      next: (res) => { this.landingInfoList = Array.isArray(res) ? res : []; this.cdr.markForCheck(); },
      error: () => { this.landingInfoList = []; this.cdr.markForCheck(); }
    }));
  }
  addLandingInfo(): void {
    if (!this.courseId || this.landingInfoAddInProgress) return;
    this.landingInfoAddInProgress = true;
    this.subscription.add(this.appService.addCourseInformation(this.courseId, { title: this.landingNewInfoTitle?.trim() || '', summary: this.landingNewInfoSummary?.trim() || '' }).subscribe({
      next: () => { this.landingInfoAddInProgress = false; this.landingNewInfoTitle = ''; this.landingNewInfoSummary = ''; this.loadLandingInfoList(); this.toasterService.showSuccess('Info section added'); this.cdr.markForCheck(); },
      error: () => { this.landingInfoAddInProgress = false; this.toasterService.showError('Failed to add'); this.cdr.markForCheck(); }
    }));
  }
  startEditLandingInfo(item: any): void { this.landingInfoEditId = item?.id ?? item?.Id; this.landingInfoTitle = item?.title ?? item?.Title ?? ''; this.landingInfoSummary = item?.summary ?? item?.Summary ?? ''; this.cdr.markForCheck(); }
  cancelEditLandingInfo(): void { this.landingInfoEditId = null; this.cdr.markForCheck(); }
  saveLandingInfoEdit(): void {
    if (!this.landingInfoEditId || this.landingInfoSaveInProgress) return;
    this.landingInfoSaveInProgress = true;
    this.subscription.add(this.appService.updateCourseInformation(this.landingInfoEditId, { title: this.landingInfoTitle?.trim(), summary: this.landingInfoSummary?.trim() }).subscribe({
      next: () => { this.landingInfoSaveInProgress = false; this.landingInfoEditId = null; this.loadLandingInfoList(); this.toasterService.showSuccess('Info section updated'); this.cdr.markForCheck(); },
      error: () => { this.landingInfoSaveInProgress = false; this.toasterService.showError('Failed to update'); this.cdr.markForCheck(); }
    }));
  }
  removeLandingInfo(item: any): void {
    const id = item?.id ?? item?.Id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Remove info section'; modalRef.componentInstance.descText = 'Remove this section?'; modalRef.componentInstance.confirmLabel = 'Remove';
    modalRef.result.then((result: string) => {
      if (result === 'ok') this.subscription.add(this.appService.deleteCourseInformation(id).subscribe({
        next: () => { this.loadLandingInfoList(); if (this.landingInfoEditId === id) this.landingInfoEditId = null; this.toasterService.showSuccess('Section removed'); this.cdr.markForCheck(); },
        error: () => { this.toasterService.showError('Failed to remove'); this.cdr.markForCheck(); }
      }));
    }, () => {});
  }

  /** Course Features */
  loadLandingFeaturesList(): void {
    if (!this.courseId) return;
    this.subscription.add(this.appService.getCourseFeaturesByCourseId(this.courseId).subscribe({
      next: (res) => { this.landingFeaturesList = Array.isArray(res) ? res : []; this.cdr.markForCheck(); },
      error: () => { this.landingFeaturesList = []; this.cdr.markForCheck(); }
    }));
  }
  addLandingFeature(): void {
    if (!this.courseId || this.landingFeatureAddInProgress) return;
    this.landingFeatureAddInProgress = true;
    this.subscription.add(this.appService.addCourseFeature(this.courseId, { description: this.landingNewFeatureDescription?.trim() || '' }).subscribe({
      next: () => { this.landingFeatureAddInProgress = false; this.landingNewFeatureDescription = ''; this.loadLandingFeaturesList(); this.toasterService.showSuccess('Feature added'); this.cdr.markForCheck(); },
      error: () => { this.landingFeatureAddInProgress = false; this.toasterService.showError('Failed to add feature'); this.cdr.markForCheck(); }
    }));
  }
  startEditLandingFeature(item: any): void { this.landingFeatureEditId = item?.id ?? item?.Id; this.landingFeatureDescription = item?.description ?? item?.Description ?? ''; this.cdr.markForCheck(); }
  cancelEditLandingFeature(): void { this.landingFeatureEditId = null; this.cdr.markForCheck(); }
  saveLandingFeatureEdit(): void {
    if (!this.landingFeatureEditId || this.landingFeatureSaveInProgress) return;
    this.landingFeatureSaveInProgress = true;
    this.subscription.add(this.appService.updateCourseFeature(this.landingFeatureEditId, { description: this.landingFeatureDescription?.trim() }).subscribe({
      next: () => { this.landingFeatureSaveInProgress = false; this.landingFeatureEditId = null; this.loadLandingFeaturesList(); this.toasterService.showSuccess('Feature updated'); this.cdr.markForCheck(); },
      error: () => { this.landingFeatureSaveInProgress = false; this.toasterService.showError('Failed to update'); this.cdr.markForCheck(); }
    }));
  }
  removeLandingFeature(item: any): void {
    const id = item?.id ?? item?.Id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Remove feature'; modalRef.componentInstance.descText = 'Remove this feature?'; modalRef.componentInstance.confirmLabel = 'Remove';
    modalRef.result.then((result: string) => {
      if (result === 'ok') this.subscription.add(this.appService.deleteCourseFeature(id).subscribe({
        next: () => { this.loadLandingFeaturesList(); if (this.landingFeatureEditId === id) this.landingFeatureEditId = null; this.toasterService.showSuccess('Feature removed'); this.cdr.markForCheck(); },
        error: () => { this.toasterService.showError('Failed to remove'); this.cdr.markForCheck(); }
      }));
    }, () => {});
  }

  /** Become Course */
  loadBecomeCourse(): void {
    if (!this.courseId) return;
    this.subscription.add(this.appService.getBecomeCourseByCourseId(this.courseId).subscribe({
      next: (res) => {
        this.landingBecomeCourse = res && (res.title !== undefined || res.Title !== undefined) ? res : null;
        this.landingBecomeTitle = this.landingBecomeCourse?.title ?? this.landingBecomeCourse?.Title ?? '';
        this.landingBecomeDescription = this.landingBecomeCourse?.description ?? this.landingBecomeCourse?.Description ?? '';
        this.cdr.markForCheck();
      },
      error: () => { this.landingBecomeCourse = null; this.landingBecomeTitle = ''; this.landingBecomeDescription = ''; this.cdr.markForCheck(); }
    }));
  }
  saveBecomeCourse(): void {
    if (!this.courseId || this.landingBecomeSaveInProgress) return;
    this.landingBecomeSaveInProgress = true;
    this.subscription.add(this.appService.upsertBecomeCourse(this.courseId, { title: this.landingBecomeTitle?.trim() || '', description: this.landingBecomeDescription?.trim() || '' }).subscribe({
      next: () => { this.landingBecomeSaveInProgress = false; this.loadBecomeCourse(); this.toasterService.showSuccess('Become course saved'); this.cdr.markForCheck(); },
      error: () => { this.landingBecomeSaveInProgress = false; this.toasterService.showError('Failed to save'); this.cdr.markForCheck(); }
    }));
  }

  /** Trainers panel */
  openLandingTrainersPanel(): void {
    this.showLandingEditPanel = false;
    this.showLandingAddPanel = false;
    this.showLandingAboutPanel = false;
    this.showLandingFaqPanel = false;
    this.showLandingTrainersPanel = true;
    this.showLandingPricingPanel = false;
    this.showLandingContentsPanel = false;
    this.landingTrainerEditId = null;
    this.landingNewTrainerName = '';
    this.landingNewTrainerImageUrl = '';
    this.landingNewTrainerDescription = '';
    this.loadLandingTrainersList();
    this.cdr.markForCheck();
  }

  loadLandingTrainersList(): void {
    if (!this.courseId) return;
    this.subscription.add(this.appService.getCourseTrainersByCourseId(this.courseId).subscribe({
      next: (res) => { this.landingTrainersList = Array.isArray(res) ? res : []; this.cdr.markForCheck(); },
      error: () => { this.landingTrainersList = []; this.cdr.markForCheck(); }
    }));
  }

  cancelLandingTrainers(): void {
    this.showLandingTrainersPanel = false;
    this.landingTrainerEditId = null;
    this.cdr.markForCheck();
  }

  addLandingTrainer(): void {
    if (!this.courseId || !this.landingNewTrainerName?.trim() || this.landingTrainerAddInProgress) return;
    this.landingTrainerAddInProgress = true;
    this.subscription.add(this.appService.addCourseTrainer(this.courseId, {
      name: this.landingNewTrainerName.trim(),
      imageUrl: this.landingNewTrainerImageUrl?.trim() || '',
      description: this.landingNewTrainerDescription?.trim() || ''
    }).subscribe({
      next: () => {
        this.landingTrainerAddInProgress = false;
        this.landingNewTrainerName = '';
        this.landingNewTrainerImageUrl = '';
        this.landingNewTrainerDescription = '';
        this.loadLandingTrainersList();
        this.landingIframeKey++;
        this.toasterService.showSuccess('Trainer added');
        this.cdr.markForCheck();
      },
      error: () => { this.landingTrainerAddInProgress = false; this.toasterService.showError('Failed to add trainer'); this.cdr.markForCheck(); }
    }));
  }

  startEditLandingTrainer(item: any): void {
    this.landingTrainerEditId = item?.id ?? item?.Id;
    this.landingTrainerName = item?.name ?? item?.Name ?? '';
    this.landingTrainerImageUrl = item?.imageUrl ?? item?.ImageUrl ?? '';
    this.landingTrainerDescription = item?.description ?? item?.Description ?? '';
    this.cdr.markForCheck();
  }

  cancelEditLandingTrainer(): void {
    this.landingTrainerEditId = null;
    this.cdr.markForCheck();
  }

  saveLandingTrainerEdit(): void {
    if (!this.landingTrainerEditId || this.landingTrainerSaveInProgress) return;
    this.landingTrainerSaveInProgress = true;
    this.subscription.add(this.appService.updateCourseTrainer(this.landingTrainerEditId, {
      name: this.landingTrainerName?.trim(),
      imageUrl: this.landingTrainerImageUrl?.trim(),
      description: this.landingTrainerDescription?.trim()
    }).subscribe({
      next: () => {
        this.landingTrainerSaveInProgress = false;
        this.landingTrainerEditId = null;
        this.loadLandingTrainersList();
        this.landingIframeKey++;
        this.toasterService.showSuccess('Trainer updated');
        this.cdr.markForCheck();
      },
      error: () => { this.landingTrainerSaveInProgress = false; this.toasterService.showError('Failed to update trainer'); this.cdr.markForCheck(); }
    }));
  }

  removeLandingTrainer(item: any): void {
    const id = item?.id ?? item?.Id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Remove trainer';
    modalRef.componentInstance.descText = 'Remove this trainer?';
    modalRef.componentInstance.confirmLabel = 'Remove';
    modalRef.result.then((result: string) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCourseTrainer(id).subscribe({
          next: () => {
            this.loadLandingTrainersList();
            this.landingIframeKey++;
            if (this.landingTrainerEditId === id) this.landingTrainerEditId = null;
            this.toasterService.showSuccess('Trainer removed');
            this.cdr.markForCheck();
          },
          error: () => { this.toasterService.showError('Failed to remove'); this.cdr.markForCheck(); }
        }));
      }
    }, () => {});
  }

  /** Pricing panel */
  openLandingPricingPanel(): void {
    this.showLandingEditPanel = false;
    this.showLandingAddPanel = false;
    this.showLandingAboutPanel = false;
    this.showLandingFaqPanel = false;
    this.showLandingTrainersPanel = false;
    this.showLandingContentsPanel = false;
    this.showLandingPricingPanel = true;
    this.landingPriceEditId = null;
    this.loadLandingPricesList();
    this.cdr.markForCheck();
  }

  loadLandingPricesList(): void {
    if (!this.courseId) return;
    this.subscription.add(this.appService.getCoursePrices(this.courseId).subscribe({
      next: (res) => { this.landingPricesList = Array.isArray(res) ? res : []; this.cdr.markForCheck(); },
      error: () => { this.landingPricesList = []; this.cdr.markForCheck(); }
    }));
  }

  cancelLandingPricing(): void {
    this.showLandingPricingPanel = false;
    this.landingPriceEditId = null;
    this.cdr.markForCheck();
  }

  private formatDateForApi(d: string): string {
    if (!d?.trim()) return '';
    const date = new Date(d.trim());
    return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  addLandingPrice(): void {
    if (!this.courseId || this.landingPriceAddInProgress) return;
    const originalPrice = this.landingNewPriceOriginalPrice ?? 0;
    const discountedPrice = this.landingNewPriceDiscountedPrice ?? 0;
    const startDate = this.formatDateForApi(this.landingNewPriceStartDate);
    const endDate = this.formatDateForApi(this.landingNewPriceEndDate);
    if (!startDate || !endDate) {
      this.toasterService.showError('Start date and End date are required');
      return;
    }
    this.landingPriceAddInProgress = true;
    this.subscription.add(this.appService.addCoursePrices(this.courseId, {
      courseId: this.courseId,
      originalPrice,
      discountedPrice,
      startDate,
      endDate
    }).subscribe({
      next: () => {
        this.landingPriceAddInProgress = false;
        this.landingNewPriceOriginalPrice = null;
        this.landingNewPriceDiscountedPrice = null;
        this.landingNewPriceStartDate = '';
        this.landingNewPriceEndDate = '';
        this.loadLandingPricesList();
        this.landingIframeKey++;
        this.toasterService.showSuccess('Price added');
        this.cdr.markForCheck();
      },
      error: () => { this.landingPriceAddInProgress = false; this.toasterService.showError('Failed to add price'); this.cdr.markForCheck(); }
    }));
  }

  startEditLandingPrice(item: any): void {
    this.landingPriceEditId = item?.id ?? item?.Id;
    this.landingPriceOriginalPrice = item?.originalPrice ?? item?.OriginalPrice ?? null;
    this.landingPriceDiscountedPrice = item?.discountedPrice ?? item?.DiscountedPrice ?? null;
    const start = item?.startDate ?? item?.StartDate;
    const end = item?.endDate ?? item?.EndDate;
    this.landingPriceStartDate = start ? (typeof start === 'string' ? start.slice(0, 10) : new Date(start).toISOString().slice(0, 10)) : '';
    this.landingPriceEndDate = end ? (typeof end === 'string' ? end.slice(0, 10) : new Date(end).toISOString().slice(0, 10)) : '';
    this.cdr.markForCheck();
  }

  cancelEditLandingPrice(): void {
    this.landingPriceEditId = null;
    this.cdr.markForCheck();
  }

  saveLandingPriceEdit(): void {
    if (!this.landingPriceEditId || this.landingPriceSaveInProgress) return;
    const startDate = this.formatDateForApi(this.landingPriceStartDate);
    const endDate = this.formatDateForApi(this.landingPriceEndDate);
    if (!startDate || !endDate) {
      this.toasterService.showError('Start date and End date are required');
      return;
    }
    this.landingPriceSaveInProgress = true;
    this.subscription.add(this.appService.updateCoursePrices({
      courseId: this.courseId,
      originalPrice: this.landingPriceOriginalPrice ?? 0,
      discountedPrice: this.landingPriceDiscountedPrice ?? 0,
      startDate,
      endDate
    }, this.landingPriceEditId).subscribe({
      next: () => {
        this.landingPriceSaveInProgress = false;
        this.landingPriceEditId = null;
        this.loadLandingPricesList();
        this.landingIframeKey++;
        this.toasterService.showSuccess('Price updated');
        this.cdr.markForCheck();
      },
      error: () => { this.landingPriceSaveInProgress = false; this.toasterService.showError('Failed to update price'); this.cdr.markForCheck(); }
    }));
  }

  removeLandingPrice(item: any): void {
    const id = item?.id ?? item?.Id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Remove price';
    modalRef.componentInstance.descText = 'Remove this price entry?';
    modalRef.componentInstance.confirmLabel = 'Remove';
    modalRef.result.then((result: string) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCoursePrices(id).subscribe({
          next: () => {
            this.loadLandingPricesList();
            this.landingIframeKey++;
            if (this.landingPriceEditId === id) this.landingPriceEditId = null;
            this.toasterService.showSuccess('Price removed');
            this.cdr.markForCheck();
          },
          error: () => { this.toasterService.showError('Failed to remove'); this.cdr.markForCheck(); }
        }));
      }
    }, () => {});
  }

  /** Contents (Curriculum) panel */
  openLandingContentsPanel(): void {
    this.showLandingEditPanel = false;
    this.showLandingAddPanel = false;
    this.showLandingAboutPanel = false;
    this.showLandingFaqPanel = false;
    this.showLandingTrainersPanel = false;
    this.showLandingPricingPanel = false;
    this.showLandingContentsPanel = true;
    this.landingContentsLoadInProgress = true;
    this.landingCurriculumsList = [];
    this.cdr.markForCheck();
    if (!this.courseId) {
      this.landingContentsLoadInProgress = false;
      this.cdr.markForCheck();
      return;
    }
    this.subscription.add(this.appService.getCurriculumByCourseId(this.courseId).subscribe({
      next: (res) => {
        this.landingCurriculumsList = Array.isArray(res) ? res : (res?.results ? res.results : []);
        this.landingContentsLoadInProgress = false;
        this.cdr.markForCheck();
      },
      error: () => { this.landingCurriculumsList = []; this.landingContentsLoadInProgress = false; this.cdr.markForCheck(); }
    }));
  }

  cancelLandingContents(): void {
    this.showLandingContentsPanel = false;
    this.cdr.markForCheck();
  }

  navigateToFullCurriculum(): void {
    if (this.courseId) {
      if (this.publicLandingModalRef) {
        this.publicLandingModalRef.close();
        this.publicLandingModalRef = null;
      }
      this.router.navigate(['/app/admin/course/curriculum/list', this.courseId]);
    }
  }

  /** Confirm and remove course from sidebar; then close sidebar and go to course list. */
  openLandingRemoveConfirm(): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Remove course';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this course? This cannot be undone.';
    modalRef.componentInstance.confirmLabel = 'Remove';
    modalRef.result.then((result: string) => {
      if (result === 'ok' && this.courseId) {
        this.subscription.add(this.appService.deleteCourseById(this.courseId).subscribe({
          next: () => {
            this.toasterService.showSuccess('Course deleted successfully');
            if (this.publicLandingModalRef) {
              this.publicLandingModalRef.close();
              this.publicLandingModalRef = null;
            }
            this.router.navigate(['/app/admin/course/list']);
          },
          error: () => this.toasterService.showError('Failed to delete course')
        }));
      }
    }, () => {});
  }

  getAllPricesByCourseId(id) {
    this.subscription.add(this.appService.getCoursePrices(id).subscribe((res: any) => {
      if (res) {
        this.coursePrice = res[0];
      }
    }));
  }

  getCurriculumList(courseId: string) {
    if (!courseId) return;
    this.subscription.add(this.appService.getCurriculumByCourseId(courseId).subscribe({
      next: (res: any) => {
        this.curriculumList = res?.curriculumResponseList ?? [];
        if (this.curriculumId && this.selectedCurriculumItem?.id) {
          const updated = this.curriculumList.find((c: any) => c.id === this.selectedCurriculumItem.id);
          if (updated) this.selectedCurriculumItem = updated;
        }
        this.tryOpenSidebarForNewCurriculum();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    }));
  }

  ngAfterViewInit(): void {
    this.tryOpenSidebarForNewCurriculum();
    this.tryOpenAddCurriculumModal();
  }

  private tryOpenAddCurriculumModal(): void {
    const addCurriculum = this.activatedRoute.snapshot.queryParams?.addCurriculum === 'true';
    const cId = this.activatedRoute.snapshot.params?.courseId || this.courseId;
    if (!addCurriculum || !cId) return;
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParams: {}, queryParamsHandling: '' });
    setTimeout(() => {
      const modalRef = this.modalService.open(AddCurriculumComponent, {
        size: 'lg',
        scrollable: true,
        windowClass: 'modal-right add-curriculum-modal',
        backdrop: 'static',
        keyboard: false
      });
      modalRef.componentInstance.setCourseId(cId);
      modalRef.result.then(() => {
        this.getCurriculumList(this.courseId || cId);
      }, () => {});
    }, 100);
  }

  private tryOpenSidebarForNewCurriculum(): void {
    const idToOpen = this.pendingOpenCurriculumId || this.curriculumOpenService.getAndClearCurriculumToOpen();
    if (!idToOpen || !this.contentTemplate || !this.curriculumList?.length) {
      return;
    }
    const item = this.curriculumList.find((c: any) => String(c.id) === String(idToOpen));
    if (item) {
      this.pendingOpenCurriculumId = null;
      if (this.activatedRoute.snapshot.queryParams?.openCurriculum) {
        this.router.navigate([], { relativeTo: this.activatedRoute, queryParams: {}, queryParamsHandling: '' });
      }
      // Close existing curriculum detail modal so the new one shows fresh data
      if (this.modalReference) {
        this.modalReference.close();
        this.modalReference = null;
      }
      setTimeout(() => this.checkCourse(this.contentTemplate, item), 0);
    }
  }

  pageChanged(event) {
    this.config.currentPage = event;
  }

  onTableSizeChange(event): void {
    this.config.itemsPerPage = event.target.value;
    this.config.currentPage = 1;
  }

  deleteCurriculumById(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Curriculum Deletion';
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong>'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculum(id)
          .subscribe({
            next: () => {
              this.toasterService.showSuccess('Curriculum deleted successfully');
              if (this.selectedCurriculumItem?.id === id && this.modalReference) {
                this.modalReference.close();
                this.modalReference = null;
                this.selectedCurriculumItem = null;
                this.curriculumId = null;
              }
              const cId = this.activatedRoute.snapshot.params?.courseId || this.courseId;
              if (cId) {
                this.courseId = cId;
                this.ngZone.run(() => this.getCurriculumList(cId));
              }
            },
            error: (err) => {
              console.log(err);
              this.toasterService.showError('Something went wrong');
            }
          }));
      }
    }, () => {});
  }

  /** Delete key point / curriculum concept (DB + S3). Confirms then calls API; backend removes images from S3. */
  deleteConcept(item: any): void {
    const id = item?.id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Delete Key Point';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this key point? Associated images will be removed from storage.';
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumConcept(id).subscribe({
          next: () => {
            this.toasterService.showSuccess('Key point deleted successfully');
            this.getConceptByCurriculumId(this.curriculumId);
            this.getCurriculumList(this.courseId);
          },
          error: () => this.toasterService.showError('Failed to delete key point')
        }));
      }
    }).catch(() => {});
  }

  /** Delete study material (DB + S3). Confirms then calls API; backend removes images from S3. */
  deleteStudyMaterial(item: any): void {
    const id = item?.id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Delete Study Material';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this study material? Associated images will be removed from storage.';
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumStudyMaterial(id).subscribe({
          next: () => {
            this.toasterService.showSuccess('Study material deleted successfully');
            this.getStudyMaterialByCurriculumId(this.curriculumId);
            this.getCurriculumList(this.courseId);
          },
          error: () => this.toasterService.showError('Failed to delete study material')
        }));
      }
    }).catch(() => {});
  }

  /** Delete video lecture (DB + S3). Confirms then calls API; backend removes videos from S3. */
  deleteVideoLecture(item: any): void {
    const id = item?.id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Delete Video Lecture';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this video lecture? Associated videos will be removed from storage.';
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumVideo(id).subscribe({
          next: () => {
            this.toasterService.showSuccess('Video lecture deleted successfully');
            this.getvideoByCurriculumId(this.curriculumId);
            this.getCurriculumList(this.courseId);
          },
          error: () => this.toasterService.showError('Failed to delete video lecture')
        }));
      }
    }).catch(() => {});
  }

  onSortClick(event, colName) {
    let target = event.currentTarget,
      classList = target.classList;

    if (classList.contains('fa-caret-up')) {
      classList.remove('fa-caret-up');
      classList.add('fa-caret-down');
      this.sortDir = -1;
    } else {
      classList.add('fa-caret-up');
      classList.remove('fa-caret-down');
      this.sortDir = 1;
    }
    this.sortArr(colName);
  }

  sortArr(colName: any) {
    this.curriculumList.sort((a, b) => {
      a = a[colName].toLowerCase();
      b = b[colName].toLowerCase();
      if (a < b) {
        return -1 * this.sortDir;
      }
      else if (a > b) {
        return 1 * this.sortDir;
      }
      else {
        return 0;
      }
    });
  }

  openAddCurriculumModal(): void {
    const cId = this.activatedRoute.snapshot.params?.courseId || this.courseId;
    if (!cId) {
      this.toasterService.showError('Course context is missing. Please open the curriculum list from a course first.');
      return;
    }
    const modalRef = this.modalService.open(AddCurriculumComponent, {
      size: 'lg',
      scrollable: true,
      windowClass: 'modal-right add-curriculum-modal',
      backdrop: 'static',
      keyboard: false
    });
    setTimeout(() => {
      if (modalRef.componentInstance && typeof modalRef.componentInstance.setCourseId === 'function') {
        modalRef.componentInstance.setCourseId(cId);
      }
    }, 0);
    const refreshList = () => {
      this.ngZone.run(() => {
        this.getCurriculumList(this.courseId || cId);
      });
    };
    modalRef.result.then(refreshList, refreshList);
  }

  checkCourse(content, item) {
    if (this.curriculumList) {
      this.selectedCurriculumItem= item? item : this.curriculumList[0];
      this.operationOnModal = 'view';
      this.currentTab = this.getInitialTab();
      this.modalReference = this.modalService.open(content, { size: 'xl', scrollable: true, windowClass: 'modal-right curriculum-detail-modal', backdrop: 'static', keyboard: false });
      this.tabData();
    }
  }

  /** First section with data, or concepts. No API call. */
  private getInitialTab(): LessonTab {
    const c = this.selectedCurriculumItem;
    if (!c) return 'concepts';
    if ((c.curriculumConceptCount ?? 0) > 0) return 'concepts';
    if ((c.curriculumStudyMaterialCount ?? 0) > 0) return 'studyMaterials';
    if ((c.curriculumVideoLectureCount ?? 0) > 0) return 'videoLectures';
    if ((c.curriculumQuestionCount ?? 0) > 0) return 'questions';
    return 'concepts';
  }

  /** Tab click: switch visible section only. Data is not cleared or refetched. */
  onTabClick(tab: LessonTab): void {
    this.currentTab = tab;
  }

  /** Add New button click: open add form for current tab. */
  onAddNew(): void {
    switch (this.currentTab) {
      case 'concepts':
        this.editCurriculum('add-concepts');
        break;
      case 'questions':
        this.editCurriculum('add-questions');
        break;
      case 'studyMaterials':
        this.editCurriculum('add-study-material');
        break;
      case 'videoLectures':
        this.editCurriculum('add-videos');
        break;
    }
  }

  /** Label for Add New button based on active tab. */
  getAddNewButtonText(): string {
    switch (this.currentTab) {
      case 'concepts': return 'Add Concept';
      case 'questions': return 'Add Question';
      case 'studyMaterials': return 'Add Study Material';
      case 'videoLectures': return 'Add Video Lecture';
      default: return 'Add';
    }
  }

  /** Start inline edit for curriculum title/description */
  startCurriculumEdit(): void {
    this.isEditingCurriculum = true;
    this.editCurriculumTitle = this.selectedCurriculumItem?.title || '';
    this.editCurriculumDescription = this.selectedCurriculumItem?.description || '';
  }

  /** Cancel inline curriculum edit */
  cancelCurriculumEdit(): void {
    this.isEditingCurriculum = false;
    this.editCurriculumTitle = '';
    this.editCurriculumDescription = '';
  }

  /** Save inline curriculum edit */
  saveCurriculumEdit(): void {
    if (!this.editCurriculumTitle.trim()) {
      this.toasterService.showError('Title is required');
      return;
    }
    const payload = {
      title: this.editCurriculumTitle.trim(),
      description: this.editCurriculumDescription.trim(),
      sortOrder: this.selectedCurriculumItem?.sortOrder || 0,
      courseId: this.courseId
    };
    this.subscription.add(this.appService.updateCurriculum(payload, this.curriculumId).subscribe(() => {
      this.toasterService.showSuccess('Curriculum updated successfully');
      this.curriculumDetailstitle = payload.title;
      this.selectedCurriculumItem.title = payload.title;
      this.selectedCurriculumItem.description = payload.description;
      this.isEditingCurriculum = false;
      this.getCurriculumList(this.courseId);
    }));
  }

  courseContent(content:any,item:any) {
    this.getCategories();
    this.courseSetvalue(item);
    this.modalReference = this.modalService.open(content, { size: 'lg', scrollable: true, windowClass: 'modal-right update-course-modal', backdrop: 'static', keyboard: false });

  }
  priceContent(content:any, item:any) {
    this.priceSetvalue(item);
    this.modalReference = this.modalService.open(content, { size: 'lg', scrollable: true, windowClass: 'modal-right update-price-modal', backdrop: 'static', keyboard: false });  
  }

  tabData(){
    this.curriculumId = this.selectedCurriculumItem.id;
    this.curriculumDetailstitle = this.selectedCurriculumItem.title;

    this.selectedCurriculumItem = this.selectedCurriculumItem;
    this.showConceptTab = this.selectedCurriculumItem.curriculumConceptCount > 0 ? true : false;
    this.showStudyTab = this.selectedCurriculumItem.curriculumStudyMaterialCount > 0 ? true : false;
    this.showVideoTab = this.selectedCurriculumItem.curriculumVideoLectureCount > 0 ? true : false;
    this.showQuestionTab = this.selectedCurriculumItem.curriculumQuestionCount > 0 ? true : false;

    // Clear previous curriculum's data so a new/empty curriculum doesn't show another curriculum's content
    this.concepts = [];
    this.studyMaterials = [];
    this.videos = [];
    this.questionItem = null;
    this.questionLength = 0;

    // Always load section data for this curriculum (new ones get empty arrays from API)
    this.getStudyMaterialByCurriculumId(this.curriculumId);
    this.getConceptByCurriculumId(this.curriculumId);
    this.getvideoByCurriculumId(this.curriculumId);
    this.subscription.add(
      this.appService.getQuestionsByCurriculumId(this.curriculumId).subscribe((res: any) => {
        this.questionLength = res?.length ?? 0;
        this.questionItem = res ?? null;
      })
    );
  }

  getStudyMaterialByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumStudyMaterialByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        this.studyMaterials = res;
      }
    }));
  }
  getConceptByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumConceptByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        this.concepts = res;
      }
    }));
  }

  getvideoByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumVideoByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        this.videos = res;
        for(let i of this.videos){
          for(let it of i.videoLectures){
            it.providerType=it.videoLink.includes("youtube")?'youtube':'local'
          }
        }
      }
    }));
  }

  prevItem(){
    this.index--;
    this.selectedCurriculumItem= this.curriculumList[this.index];
    this.tabData();
  }
  nextItem(){
    this.index++;
    this.selectedCurriculumItem= this.curriculumList[this.index];
    this.tabData();
  }
  videoLoadError = false;

  loadVideo(item){
    this.videoLoadError = false;
    this.videoObj['videoLink'] = item.videoLink;
    this.videoObj['title'] = item.title;
    this.videoObj['description'] = item.description;
    this.videoObj['providerType'] = item.videoLink.includes("https://www.youtube.com")?'youtube':'local';
    // this.modalReference = this.modalService.open(content, { size: 'xl', windowClass: 'video-modal' });
  }

  onVideoError() {
    this.videoLoadError = true;
    this.cdr.markForCheck();
  }

  onVideoLoaded() {
    this.videoLoadError = false;
    this.cdr.markForCheck();
  }

  /** Use proxy URL for S3 videos to avoid CORS; return original URL for YouTube etc. */
  getVideoSrc(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
      return this.appService.apiUrl + 'api/CurriculumVideoLecture/StreamVideo?url=' + encodeURIComponent(url);
    }
    return url;
  }

  fnQuestion(entityType) {
  }
  editSpecificCurriculum(task: string, item: any) {
    this.operationOnModal = task;
    this.btntext = 'Update';
    switch (task) {
      case 'concepts':
        this.setConceptvalue(item);
        break;
      case 'study-material':
        this.setvalue(item);
        break;
      case 'videos':
        this.setVideovalue(item);
        break;
      case 'questions':
        this.setQuestionvalue(item);
        break;
      default:
        break;
    }
    this.scrollModalBodyToTop();
  }

  editCurriculum(task: string) {
    this.operationOnModal = task;
    this.btntext = 'Save';
    switch (task) {
      case 'add-concepts':
        this.setConceptvalue(null);
        break;
      case 'add-study-material':
        this.setvalue(null);
        break;
      case 'add-videos':
        this.setVideovalue(null);
        break;
      case 'add-questions':
        this.setQuestionvalue(null);
        break;
      default:
        break;
    }
    this.scrollModalBodyToTop();
  }

  private scrollModalBodyToTop(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        const body = this.document.querySelector('.modal-body') as HTMLElement;
        if (body) body.scrollTop = 0;
      }, 0);
    });
  }

  formInit() {
    this.studyMaterialForm = this.formBuilder.group({
      title: [''],
      id: [this.guid],
      sortOrder:0,
      studyMaterials: this.formBuilder.array([])
    });

    this.conceptForm = this.formBuilder.group({
      title: [''],
      id: [this.guid],
      sortOrder:0,
      concepts: this.formBuilder.array([])
    });

    this.videoForm = this.formBuilder.group({
      title: [''],
      id: [this.guid],
      sortOrder:0,
      videoLectures: this.formBuilder.array([])
    });

    this.questionForm = this.formBuilder.group({
      title: [''],
      description: [''],
      id: [this.guid],
      curriculumId: [this.curriculumId ? this.curriculumId :  this.guid],
      sortOrder:0,
      options: this.formBuilder.array([])
    })
  }

  get f() { return this.studyMaterialForm.controls; }

  sectionViewMode(key: string): 'author' | 'preview' {
    return this.sectionViewModes[key] ?? 'author';
  }
  setSectionViewMode(key: string, mode: 'author' | 'preview'): void {
    this.sectionViewModes[key] = mode;
  }

  get courseStudyMaterialsArray(): UntypedFormArray | null {
    return (this.studyMaterialForm?.get('studyMaterials') as UntypedFormArray) ?? null;
  }

  setvalue(res) {
    this.initialStudyMaterialDescriptions = [];
    this.studyMaterialForm.patchValue({
      title: res?.title ? res.title : '',
      id: res?.id ? res.id : this.guid,
      sortOrder:res?.sortOrder ? res.sortOrder : 0
    });
    if (res && res.studyMaterials && res.studyMaterials.length > 0) {
      let array = [];
      res.studyMaterials.forEach((x) => {
        const desc = x.description ? x.description : '';
        this.initialStudyMaterialDescriptions.push(desc);
        array.push(this.formBuilder.group(
          {
            description: new UntypedFormControl(desc, [Validators.required]),
            title: new UntypedFormControl(x.title ? x.title : ''),
            id: x.id ? x.id : this.guid,
            imageLink: x.imageLink ? x.imageLink : '',sortOrder:array.length+1
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.studyMaterialForm.setControl('studyMaterials', FormArray);
    } else{
      this.formInit();
      this.submitted = false;
    }
  }

  // onReady method removed - CKEditor no longer used

  courseStudyMaterialsArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.studyMaterialForm.get('studyMaterials')).controls;
  }

  createStudyMaterialItems() {
    let group = {};
    group['title'] = new UntypedFormControl('');
    group['description'] = new UntypedFormControl('{"version":1,"blocks":[]}', [Validators.required]);
    group['imageLink'] = new UntypedFormControl('');
    group['sortOrder']=(this.courseStudyMaterialsArray?.length ?? 0)+1;
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  addCourseStudyMaterialsItems(): void {
    this.courseStudyMaterialsArray!.push(this.createStudyMaterialItems())
  }

  removeCourseStudyMaterialsItems(index) {
    this.courseStudyMaterialsArray!.removeAt(index);
  }

  onSubmit() {    
    
    this.submitted = true;
    // stop here if form is invalid
    if (this.studyMaterialForm.invalid) {
      return;
    }
    if (this.f.id.value !== this.guid) {
      this.subscription.add(this.appService.updateCurriculumStudyMaterial(this.studyMaterialForm.value, this.f.id.value).subscribe(() => {
        this.toasterService.showSuccess('Study Material updated successfully');
        this.sharedMethodAfterSaveOrUpdate();
        this.studyMaterialForm.reset();
      }));
    } 
    else {
      this.studyMaterialForm.patchValue({
        sortOrder:this.studyMaterials.length+1
       });
      this.subscription.add(this.appService.addCurriculumStudyMaterial(this.studyMaterialForm.value, this.curriculumId).subscribe(() => {
        this.toasterService.showSuccess('Study Material created successfully');
       this.sharedMethodAfterSaveOrUpdate();
        this.studyMaterialForm.reset();       
      }));
    }
  }

  studyMaterialfileProgress(fileInput: any, index) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadDocumnet(this.fileData,'curriculum_studyMaterial').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.courseStudyMaterialsArray!.at(index).patchValue({
        imageLink: this.uploadedFilePath
      });
    });
  }

  updatePrice() {
    this.submitted = true;
    const isFree = this.priceForm.get('coursePricingType')?.value === this.PRICING_TYPE_FREE;
    if (!isFree && this.priceForm.invalid) {
      return;
    }
    const orig = isFree ? 0 : Number(this.priceForm.get('originalPrice')?.value ?? 0);
    const discRaw = this.priceForm.get('discountedPrice')?.value;
    const disc = isFree ? 0 : (discRaw !== '' && discRaw != null ? Number(discRaw) : orig);
    const payload = {
      courseId: this.priceForm.get('courseId')?.value,
      id: this.priceF.id.value,
      coursePriceType: isFree ? 'free' : 'paid',
      originalPrice: orig,
      discountedPrice: disc,
      startDate: this.priceForm.get('startDate')?.value || this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      endDate: this.priceForm.get('endDate')?.value || this.datePipe.transform(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    };
    if (this.priceF.id.value === this.guid) {
      this.subscription.add(this.appService.addCoursePrices(this.courseId, payload).subscribe(() => {
        this.getAllPricesByCourseId(this.courseId);
        this.toasterService.showSuccess(isFree ? 'Course set as free.' : 'Price updated successfully.');
        this.modalReference.close();
      }));
      return;
    }
    this.subscription.add(this.appService.updateCoursePrices(payload, this.priceF.id.value).subscribe(() => {
      this.getAllPricesByCourseId(this.courseId);
      this.toasterService.showSuccess(isFree ? 'Course set as free.' : 'Price updated successfully.');
      this.modalReference.close();
    }));
  }

  updateCourse(){
    this.subscription.add(this.appService.updateCourse(this.courseForm.value, this.courseId).subscribe(() => {
      this.getCourseById(this.courseId);
      this.modalReference.close();
      this.toasterService.showSuccess('Course updated successfully');
    }));
  }

  /**
   * Operation of curriculam Concept option
   * Some method we are re-using of study-material
   * Inside formInit() method we have declared conceptForm controller
   * */ 
  get cf() { return this.conceptForm.controls; }

  get courseConceptsArray(): UntypedFormArray | null {
    return (this.conceptForm?.get('concepts') as UntypedFormArray) ?? null;
  }

  courseConceptsArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.conceptForm.get('concepts')).controls;
  }

  setConceptvalue(res) {
    this.initialConceptDescriptions = [];
    this.conceptForm.patchValue({
      title: res?.title ? res.title : '',
      id: res?.id ? res.id : this.guid,
      sortOrder:res?.sortOrder ? res.sortOrder : 0
    });
    if (res && res.concepts && res.concepts.length > 0) {
      let array = [];
      res.concepts.forEach((x) => {
        const desc = x.description ? x.description : '';
        this.initialConceptDescriptions.push(desc);
        array.push(this.formBuilder.group(
          {
            description: new UntypedFormControl(desc, [Validators.required]),
            title: new UntypedFormControl(x.title ? x.title : ''),
            id: x.id ? x.id : this.guid,
            imageLink: x.imageLink ? x.imageLink : '',sortOrder:array.length+1
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.conceptForm.setControl('concepts', FormArray);
    } else {
      this.formInit();
      this.submitted = false;
    }
  }

  createConceptItems() {
    let group = {};
    group['title'] = new UntypedFormControl('');
    group['description'] = new UntypedFormControl('{"version":1,"blocks":[]}', [Validators.required]);
    group['imageLink'] = new UntypedFormControl('');
    group['sortOrder']=(this.courseConceptsArray?.length ?? 0)+1;
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  addCourseConceptItems(): void {
    this.courseConceptsArray!.push(this.createConceptItems())
  }

  removeCourseConceptItems(index) {
    this.courseConceptsArray!.removeAt(index);
  }

  onConceptSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.conceptForm.invalid) {
      return;
    }
    if (this.cf.id.value !== this.guid) {
     
      this.subscription.add(this.appService.updateCurriculumConcept(this.conceptForm.value, this.cf.id.value).subscribe(() => {
        this.toasterService.showSuccess('Concept updated successfully');
        this.sharedMethodAfterSaveOrUpdate();
        this.conceptForm.reset()
      }));
    } else {
      this.conceptForm.patchValue({
       sortOrder:this.concepts.length+1
      });
      this.subscription.add(this.appService.addCurriculumConcept(this.conceptForm.value, this.curriculumId).subscribe(() => {
        this.toasterService.showSuccess('Concept created successfully');
        this.sharedMethodAfterSaveOrUpdate();
        this.conceptForm.reset()
      }));
    }
  }

  conceptfileProgress(fileInput: any, index) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadDocumnet(this.fileData,'curriculum_concept').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.courseConceptsArray!.at(index).patchValue({
        imageLink: this.uploadedFilePath
      });
    });
  }


  /** 
   * Operation of curriculam Videos option
   * Some method we are re-using of study-material
   * Inside formInit() method we have declared videoForm controller 
   * */ 

  get vf() { return this.videoForm.controls; }

  get courseVideoLectureArray(): UntypedFormArray | null {
    return (this.videoForm?.get('videoLectures') as UntypedFormArray) ?? null;
  }

  courseVideoLectureArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.videoForm.get('videoLectures')).controls;
  }

  setVideovalue(res) {
    this.videoForm.patchValue({
      title: res?.title ? res.title : '',
      id: res?.id ? res.id : this.guid,
      sortOrder:res?.sortOrder ? res.sortOrder : 0
    });
    if (res && res.videoLectures && res.videoLectures.length > 0) {
      let array = [];
      res.videoLectures.forEach((x) => {
        array.push(this.formBuilder.group(
          {
            description: new UntypedFormControl(x.description ? x.description : ''),
            title: new UntypedFormControl(x.title ? x.title : ''),
            id: x.id ? x.id : this.guid,
            videoLink: x.videoLink ? x.videoLink : '',
            providerType: x.providerType ? x.providerType : 'local',
            thumbnailImage: x.thumbnailImage ? x.thumbnailImage : '',
            url: x.url ? x.url : '',sortOrder:array.length+1
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.videoForm.setControl('videoLectures', FormArray);
    } else {
      this.formInit();
      this.submitted = false;
    }
  }

  createVideoLectureItems() {
    let group = {};
    group['title'] = new UntypedFormControl('');
    group['description'] = new UntypedFormControl('');
    group['videoLink'] = new UntypedFormControl('');
    group['thumbnailImage'] = new UntypedFormControl('');
    group['providerType'] = new UntypedFormControl('local');
    group['url'] = new UntypedFormControl('');
    group['sortOrder']=(this.courseVideoLectureArray?.length ?? 0)+1;
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }
changeProvider(provider:string,index:number){
  this.courseVideoLectureArray!.at(index).patchValue({
    providerType: provider
  });
}
  addCourseVideoLectureItems(): void {
    this.courseVideoLectureArray!.push(this.createVideoLectureItems())
  }

  removeCourseVideoLectureItems(index) {
    this.courseVideoLectureArray!.removeAt(index);
  }

  onVideoSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.videoForm.invalid) {
      return;
    }
    if (this.vf.id.value !== this.guid) {
      this.subscription.add(this.appService.updateCurriculumVideo(this.videoForm.value, this.vf.id.value).subscribe(() => {
        this.toasterService.showSuccess('Video Lecture updated successfully');
        this.sharedMethodAfterSaveOrUpdate();
        this.videoForm.reset();
      }));
    } else {
      this.videoForm.patchValue({
        sortOrder:this.videos.length+1
       });
      this.subscription.add(this.appService.addCurriculumVideo(this.videoForm.value, this.curriculumId).subscribe(() => {
        this.toasterService.showSuccess('Video Lecture created successfully');
        this.sharedMethodAfterSaveOrUpdate();
        this.videoForm.reset();
      }));
    }
  }

  /** Encode video URL for playback (handles spaces in S3 URLs). */
  getEncodedVideoUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      return encodeURI(url);
    } catch {
      return url;
    }
  }

  videofileProgress(fileInput: any, index) {
    const file = fileInput?.target?.files?.[0];
    if (!file) return;
    this.fileData = file;
    this.videoUploadsInProgress++;
    this.appService.uploadDocumnet(this.fileData, 'curriculum_Vedios').subscribe({
      next: (res) => {
        this.uploadedFilePath = res?.documentPath ?? '';
        this.courseVideoLectureArray!.at(index).patchValue({
          videoLink: this.uploadedFilePath
        });
        this.videoUploadsInProgress--;
      },
      error: () => {
        this.videoUploadsInProgress--;
        this.toasterService.showError('Video upload failed. Please try again.');
      }
    });
  }
  
  uploadLink(url: string, index) {
    this.appService.uploadDocumnetLink(url,'curriculum_Vedios').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.courseVideoLectureArray!.at(index).patchValue({
        videoLink: this.uploadedFilePath
      });
    })
  }

   /**
   * Operation of curriculam Concept option
   * Some method we are re-using of questions
   * Inside formInit() method we have declared conceptForm controller
   * */ 
   get qf() { return this.questionForm.controls; }

   get questionOptionArray(): UntypedFormArray | null {
     return (this.questionForm?.get('options') as UntypedFormArray) ?? null;
   }
 
   questionArrayControls(): AbstractControl[] {
     return (<UntypedFormArray>this.questionForm.get('options')).controls;
   }
 
   setQuestionvalue(res) {
     const questionId = (res?.id ?? res?.Id ?? this.guid) as string;
     this.questionForm.patchValue({
       title: res?.title ? res.title : '',
       id: questionId,
       description: res?.description ? res.description : '',
       sortOrder:res?.sortOrder ? res.sortOrder : 0,
       curriculumId: this.curriculumId
     });
    if (res && res.options && res.options.length > 0) {
       let array = [];
       res.options.forEach((x) => {
         array.push(this.formBuilder.group(
           {
             description: new UntypedFormControl(x.description ? x.description : '', [Validators.required]),
             isCorrect: new UntypedFormControl(x.isCorrect ? x.isCorrect : false, [Validators.required]),
             id: x.id ? x.id : this.guid,
             extraInformation: x.extraInformation ? x.extraInformation : '',
             sortOrder:array.length+1
           }))
       })
       const FormArray: UntypedFormArray = this.formBuilder.array(array);
       this.questionForm.setControl('options', FormArray);
     } else {
      this.questionForm.reset({
        title: '',
        id: this.guid,
        description: '',
        curriculumId: this.curriculumId,
        sortOrder: 0
      });
      const FormArray: UntypedFormArray = this.formBuilder.array([
        this.createQuestionItems(1)
      ]);
      this.questionForm.setControl('options', FormArray);
      this.cdr.detectChanges();
       this.submitted = false;
     }
   }
 
  createQuestionItems(sortOrder?: number) {
     let group = {};
     group['extraInformation'] = new UntypedFormControl('');
     group['description'] = new UntypedFormControl('', [Validators.required]);
     group['isCorrect'] = new UntypedFormControl(false, [Validators.required]);
    group['sortOrder']= sortOrder ?? (this.questionOptionArray?.length ?? 0)+1;
     group['id'] = new UntypedFormControl(this.guid);
     return this.formBuilder.group(group);
   }
 
   /** Defer form update to next tick to avoid NG0100 ExpressionChangedAfterItHasBeenCheckedError */
  onQuestionDescriptionJsonChange(json: string): void {
    setTimeout(() => {
      this.questionForm.patchValue({ description: json });
      this.cdr.markForCheck();
    }, 0);
  }

  /** Defer form update to next tick to avoid NG0100 ExpressionChangedAfterItHasBeenCheckedError */
  onQuestionOptionJsonChange(json: string, index: number): void {
    setTimeout(() => {
      const options = this.questionOptionArray;
      if (options && index >= 0 && index < options.length) {
        options.at(index).patchValue({ description: json });
        this.cdr.markForCheck();
      }
    }, 0);
  }

  addQuestionOptionsItems(): void {
    const nextSortOrder = (this.questionOptionArray?.length ?? 0) + 1;
    this.questionOptionArray!.push(this.createQuestionItems(nextSortOrder));
    this.cdr.detectChanges();
    setTimeout(() => {
      const cards = this.document.querySelectorAll('.question-editor__option-card');
      const lastCard = cards[cards.length - 1] as HTMLElement | undefined;
      lastCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
   }
 
  removeQuestionOptionsItems(index) {
    this.questionOptionArray!.removeAt(index);
  }

  deleteQuestion(question: any): void {
    const id = question?.id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Question Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this question?';
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteQuestion(id).subscribe({
          next: () => {
            this.toasterService.showSuccess('Question deleted successfully');
            this.appService.getQuestionsByCurriculumId(this.curriculumId).subscribe((res: any) => {
              const questions = res ?? [];
              this.questionLength = questions.length;
              this.questionItem = questions;
              this.showQuestionTab = questions.length > 0;
            });
            this.getCurriculumList(this.courseId);
          },
          error: () => this.toasterService.showError('Failed to delete question')
        }));
      }
    }).catch(() => {});
  }

onQuestionSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.questionForm.invalid) {
     this.toasterService.showError('Kindly enter valid information');
      return;
    }
    // Validate options
    const options = this.questionOptionArray?.value || [];
    if (options.length === 0) {
      this.toasterService.showError('Please add at least one option');
      return;
    }
    if (!options.some((opt: any) => opt.isCorrect)) {
      this.toasterService.showError('Please mark at least one option as correct');
      return;
    }
     const questionId = this.qf.id.value;
     const isUpdate = questionId && String(questionId).trim() !== '' && String(questionId).trim() !== String(this.guid).trim();
     if (isUpdate) {
       this.subscription.add(this.appService.updateQuestion(this.questionForm.value, questionId).subscribe(() => {
         this.toasterService.showSuccess('Question updated successfully');
         this.refreshCurriculumAndQuestionsOnly();
       }));
     } else {
       this.questionForm.patchValue({
         sortOrder: this.questionItem ?this.questionItem.length+1 : 0
        });
       this.subscription.add(this.appService.addQuestion(this.questionForm.value).subscribe(() => {
         this.toasterService.showSuccess('Question created successfully');
         this.refreshCurriculumAndQuestionsOnly();
         this.questionForm.reset();
       }));
     }
   }
 
   fileProgress(fileInput: any, index) {
     this.fileData = <File>fileInput.target.files[0];
     this.appService.uploadDocumnet(this.fileData,'Curriculum_question').subscribe(res => {
       this.uploadedFilePath = res.documentPath;
       this.questionOptionArray!.at(index).patchValue({
         extraInformation: this.uploadedFilePath
       });
     });
   }

  /**
   * Tab click: if section has existing data, show view and scroll to it; if no data, open add form.
   * Applies to all four tabs (Key Points, Study Materials, Video Lectures, Questions).
   */
  scrollToContent(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      this.selectedContent = elementId;
      element.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    // Section not in DOM – decide by data: show existing list or open add form
    const hasData = (id: string): boolean => {
      switch (id) {
        case 'KeyPoint': return (this.concepts?.length ?? 0) > 0;
        case 'StudyMaterials': return (this.studyMaterials?.length ?? 0) > 0;
        case 'VideoLectures': return (this.videos?.length ?? 0) > 0;
        case 'Questions': return (this.questionItem?.length ?? 0) > 0 || (this.questionLength ?? 0) > 0;
        default: return false;
      }
    };
    const openAddForm = (id: string): void => {
      switch (id) {
        case 'KeyPoint': this.editCurriculum('add-concepts'); break;
        case 'StudyMaterials': this.editCurriculum('add-study-material'); break;
        case 'VideoLectures': this.editCurriculum('add-videos'); break;
        case 'Questions': this.editCurriculum('add-questions'); break;
        default: break;
      }
    };
    if (hasData(elementId)) {
      this.editCurriculum('view');
      this.selectedContent = elementId;
      setTimeout(() => document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' }), 150);
    } else {
      openAddForm(elementId);
    }
  }

  questionSharedMethodAfterSaveOrUpdate(){
    this.selectedContent = '';
    this.operationOnModal = 'view';
    this.editCurriculum('view');
    this.refreshCurriculumAndQuestionsOnly();
  }

  /** Refresh curriculum and question list without leaving the current page (e.g. stay on question editor after update). */
  refreshCurriculumAndQuestionsOnly() {
    this.subscription.add(this.appService.getCurriculumByCourseId(this.courseId).subscribe((res: any) => {
      if (res?.curriculumResponseList) {
        this.curriculumList = res.curriculumResponseList;
        const current = this.curriculumList.find((c: any) => c.id === this.curriculumId);
        if (current) {
          this.selectedCurriculumItem = current;
        }
      }
      this.tabData();
      this.subscription.add(this.appService.getQuestionsByCurriculumId(this.curriculumId).subscribe((qRes: any) => {
        const questions = qRes || [];
        if (questions.length > 0) {
          this.questionItem = questions;
          this.questionLength = questions.length;
          this.showQuestionTab = true;
        }
      }));
    }));
  }

  /**
   * Below methods are common for concept, study-material, video, questions
   * */ 

  sharedMethodAfterSaveOrUpdate(){
    this.selectedContent = '';
    this.operationOnModal = 'view';
    this.editCurriculum('view');
    this.subscription.add(this.appService.getCurriculumByCourseId(this.courseId).subscribe((res: any) => {
      if (res?.curriculumResponseList) {
        this.curriculumList = res.curriculumResponseList;
        const current = this.curriculumList.find((c: any) => c.id === this.curriculumId);
        if (current) {
          this.selectedCurriculumItem = current;
        }
      }
      this.tabData();
    }));
  }

  closeModal(){
    if (this.operationOnModal === 'concepts' || this.operationOnModal === 'add-concepts') {
      this.deleteUnsavedConceptBlockImages();
    } else if (this.operationOnModal === 'study-material' || this.operationOnModal === 'add-study-material') {
      this.deleteUnsavedStudyMaterialBlockImages();
    }
    this.videoUploadsInProgress = 0;
    this.studyMaterialForm.reset();
    this.conceptForm.reset();
    this.videoForm.reset();
    this.selectedContent = '';
    this.modalService.dismissAll();
  }

  private deleteUnsavedConceptBlockImages(): void {
    const arr = this.courseConceptsArray?.controls || [];
    const currentDescs = arr.map(c => (c.get('description')?.value || '') as string);
    const initialUrls = new Set(this.extractImageUrlsFromDescriptions(this.initialConceptDescriptions));
    this.extractImageUrlsFromDescriptions(currentDescs).filter(u => !initialUrls.has(u))
      .forEach(url => this.appService.deleteImage(url).subscribe({ error: () => {} }));
  }

  private deleteUnsavedStudyMaterialBlockImages(): void {
    const arr = this.courseStudyMaterialsArray?.controls || [];
    const currentDescs = arr.map(c => (c.get('description')?.value || '') as string);
    const initialUrls = new Set(this.extractImageUrlsFromDescriptions(this.initialStudyMaterialDescriptions));
    this.extractImageUrlsFromDescriptions(currentDescs).filter(u => !initialUrls.has(u))
      .forEach(url => this.appService.deleteImage(url).subscribe({ error: () => {} }));
  }

  private extractImageUrlsFromDescriptions(descriptions: string[]): string[] {
    const urls: string[] = [];
    descriptions.forEach(json => {
      if (!json || !isLessonContentJson(json)) return;
      try {
        (JSON.parse(json)?.blocks || []).forEach((b: any) => { if (b?.imageUrl) urls.push(b.imageUrl); });
      } catch { /* ignore */ }
    });
    return urls;
  }
  rootCloseModal(){
    // When in add/edit form: close form and return to view
    if (this.operationOnModal !== 'view') {
      this.operationOnModal = 'view';
      this.selectedContent = '';
      return;
    }
    // When in view: close the entire modal
    this.studyMaterialForm.reset();
    this.conceptForm.reset();
    this.videoForm.reset();
    this.questionForm.reset();
    this.modalService.dismissAll();
    this.selectedContent = '';
  }

  goBack() {
    this.location.back();
  }

  /** trackBy for *ngFor: reduces DOM re-renders when list reference changes */
  trackByCurriculumId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }
  trackByIndex(index: number): number {
    return index;
  }
  trackBySize(_index: number, size: number): number {
    return size;
  }
  trackByCategoryId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }
  trackByConceptId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }
  trackByQuestionId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }

  ngOnDestroy() {
    this.sharedService.showCurriculumToolbar.next(false);
    this.sharedService.curriculumSearchTerm$.next('');
    this.sharedService.curriculumActiveTab$.next('concepts');
    this.sharedService.certificateName.next('');
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
