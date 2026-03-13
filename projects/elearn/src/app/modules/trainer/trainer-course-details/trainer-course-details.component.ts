import { Location } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, TemplateRef } from '@angular/core';
import { AbstractControl,  UntypedFormArray,  UntypedFormBuilder,  UntypedFormControl,  UntypedFormGroup,  Validators } from '@angular/forms';
// CKEditor removed - using textarea instead
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ChangeProgressComponent } from 'src/app/shared/modals/change-progress/change-progress.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { AddCurriculumComponent } from '../../adminapp/curriculum/add-curriculum/add-curriculum.component';
import { CurriculumOpenService } from '../../adminapp/curriculum/curriculum-open.service';
import { CookieService } from 'src/app/core/services/cookie.service';
import { isLessonContentJson } from 'src/app/shared/models/lesson-content.model';
import type { LessonBlockType } from 'src/app/shared/models/lesson-content.model';

@Component({
    selector: 'app-trainer-course-details',
    templateUrl: './trainer-course-details.component.html',
    styleUrls: ['./trainer-course-details.component.scss'],
    standalone: false
})
export class TrainerCourseDetailsComponent implements OnInit, OnDestroy {

  courseId: string;
  curriculumList = [];
  subscription: Subscription = new Subscription();
  config: any;
  tableSizes = [5, 10, 20, 25, 50];
  term = '';
  sortDir = 1;
  /** Active tab: 'concepts' | 'questionset' | 'question' (synced with topbar). */
  activeTabId = 'concepts';
  courseInfo: any;

  txtRoute = 'trainer';
  @ViewChild('content') contentTemplate: TemplateRef<any>;
  @ViewChild('cContent') cContentRef: TemplateRef<any>;
  modalReference: NgbModalRef;
  curriculumId: string;
  questionLength:number = 0;
  questionItem:any[]= [];
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
  operationOnModal:string='view';
  uploadedFilePath: string = null;
  fileData: File = null;
  selectedContent:string;
  sectionViewModes: { [key: string]: 'author' | 'preview' } = {};
  isLessonContent = isLessonContentJson;

  /** True only when there is at least one actual concept (not just empty topics). Used to hide Key Points section when no data. */
  get hasKeyPointData(): boolean {
    return (this.concepts?.some((c: any) => (c?.concepts?.length ?? 0) > 0) ?? false);
  }

  /** Actual count of key point concepts (from loaded data). Use this for tab badge instead of curriculumConceptCount. */
  get keyPointCount(): number {
    return (this.concepts?.reduce((sum: number, topic: any) => sum + (topic?.concepts?.length ?? 0), 0) ?? 0);
  }

  /** True only when there is at least one actual study material item (not just empty sections). */
  get hasStudyMaterialData(): boolean {
    return (this.studyMaterials?.some((s: any) => (s?.studyMaterials?.length ?? 0) > 0) ?? false);
  }

  /** Actual count of study material items (from loaded data). */
  get studyMaterialCount(): number {
    return (this.studyMaterials?.reduce((sum: number, section: any) => sum + (section?.studyMaterials?.length ?? 0), 0) ?? 0);
  }

  /** Key point sections deduped by id so we show only one card (and one delete) per section. */
  get uniqueConcepts(): any[] {
    if (!this.concepts?.length) return [];
    return this.concepts.filter((c: any, i: number, a: any[]) => a.findIndex((x: any) => String(x?.id) === String(c?.id)) === i);
  }

  /** Study material sections deduped by id so we show only one card (and one delete) per section. */
  get uniqueStudyMaterials(): any[] {
    if (!this.studyMaterials?.length) return [];
    return this.studyMaterials.filter((s: any, i: number, a: any[]) => a.findIndex((x: any) => String(x?.id) === String(s?.id)) === i);
  }

  /** True if current user has Edit permission (from admin); view-only when false. */
  canEdit = true;
  /** Inline curriculum title/description edit (same as admin – no redirect). */
  isEditingCurriculum = false;
  editCurriculumTitle = '';
  editCurriculumDescription = '';

  uploadImageFn = (file: File) =>
    this.appService.uploadImage(file).pipe(map((res: any) => res?.url || res?.Url || res?.documentPath || ''));

  deleteImageFn = (url: string) => this.appService.deleteImage(url);

  uploadInProgress = false;

  questionEditorBlockTypes: LessonBlockType[] = ['text'];

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

  // course edit (same as admin – modal on same page)
  courseForm: UntypedFormGroup;
  categories: any[] = [];

  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private location: Location,
    private formBuilder: UntypedFormBuilder,
    private cookieService: CookieService,
    private sharedService: SharedService,
    private curriculumOpenService: CurriculumOpenService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    const currentUser = this.getCurrentUser();
    const stateCanEdit = this.getCanEditFromNavigationState();
    if (stateCanEdit !== undefined) {
      this.canEdit = stateCanEdit;
    } else {
      // Trainer course-details: default to editable when no state (direct URL / link); otherwise use permission.
      this.canEdit = !!(currentUser?.canEdit || currentUser?.isAdmin || this.hasEditPermissionFromUser(currentUser)) || true;
    }
    this.config = {
      itemsPerPage: 20,
      currentPage: 1,
    };
    this.activatedRoute.params.subscribe(params => {
      if (params.courseId) {
        this.courseId = params.courseId;
        const openCurriculumId = this.activatedRoute.snapshot.queryParamMap.get('openCurriculum');
        this.getCurriculumList(this.courseId, () => {
          if (openCurriculumId && this.contentTemplate) {
            const item = this.curriculumList?.find((c: any) => String(c.id) === String(openCurriculumId));
            if (item) {
              setTimeout(() => this.checkCourse(this.contentTemplate, item), 0);
              this.router.navigate([], { relativeTo: this.activatedRoute, queryParams: {}, replaceUrl: true });
            }
          }
        });
        this.getCourseById(this.courseId);
      }
    });
    this.sharedService.showCurriculumToolbar.next(true);
    this.sharedService.showCurriculumEditActions.next(this.canEdit);
    this.sharedService.certificateName.next(''); // no title in topbar on trainer page
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
      this.sharedService.curriculumAddCurriculumClick$.subscribe(() => this.openAddCurriculumModal())
    );
    this.subscription.add(
      this.sharedService.curriculumEditCourseClick$.subscribe(() => this.openCourseEditPage())
    );
    this.formInit();
  }

  /** Read per-course canEdit passed from trainer dashboard when opening a course. */
  private getCanEditFromNavigationState(): boolean | undefined {
    try {
      const state = history.state as { canEdit?: boolean } | null;
      if (state != null && typeof state.canEdit === 'boolean') {
        return state.canEdit;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  /** True if currentUser has edit-related permission (from admin); used when no nav state (e.g. direct URL). */
  private hasEditPermissionFromUser(user: { permissions?: Array<{ name?: string }> } | null): boolean {
    const names = user?.permissions?.map((p) => (p?.name || '').toLowerCase()) ?? [];
    const editNames = ['course.updatecourse', 'updatecourse', 'curriculum.updatecurriculum', 'course.edit'];
    return editNames.some((edit) => names.some((n) => n.includes(edit) || n === edit));
  }

  private getCurrentUser(): { canEdit?: boolean; isAdmin?: boolean; permissions?: Array<{ name?: string }> } | null {
    try {
      const raw = this.cookieService.getCookie('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getCourseById(id: string): void {
    this.subscription.add(
      this.appService.getCourseById(id).subscribe((res: any) => {
        if (res) {
          this.courseInfo = res;
        }
      })
    );
  }

  /** Open Change Progress modal from course page header; on update refresh courseInfo. */
  openChangeProgressInHeader(): void {
    if (!this.courseId) return;
    const current = this.courseInfo?.courseCreationProgress ?? this.courseInfo?.CourseCreationProgress ?? 0;
    const modalRef = this.modalService.open(ChangeProgressComponent);
    modalRef.componentInstance.selectedProgress = current;
    modalRef.result.then((x: number | null) => {
      if (x != null) {
        this.subscription.add(
          this.appService.updateProgress(this.courseId, x).subscribe({
            next: () => {
              this.toasterService.showSuccess('Progress updated');
              this.getCourseById(this.courseId);
              this.cdr.markForCheck();
            },
            error: () => this.toasterService.showError('Failed to update progress'),
          })
        );
      }
    }).catch(() => {});
  }

  getCurriculumList(courseId: string, onDone?: () => void): void {
    this.subscription.add(this.appService.getCurriculumByCourseId(courseId).subscribe((res: any) => {
      if (res) {
        this.curriculumList = res.curriculumResponseList || [];
        this.cdr.markForCheck();
      }
      onDone?.();
    }));
  }

  /** Open Add Curriculum as modal (same as admin) – keeps navbar/topbar visible. */
  openAddCurriculumModal(): void {
    if (!this.courseId) return;
    const modalRef = this.modalService.open(AddCurriculumComponent, {
      size: 'lg',
      scrollable: true,
      windowClass: 'modal-right add-curriculum-modal',
      backdrop: 'static',
      keyboard: false
    });
    modalRef.componentInstance.setCourseId(this.courseId);
    modalRef.result.then(() => {
      this.getCurriculumList(this.courseId, () => this.tryOpenDetailForNewCurriculum());
    }, () => {});
  }

  /** After adding curriculum, open the new curriculum in the detail modal (redirect to new curriculum page, not existing). */
  private tryOpenDetailForNewCurriculum(): void {
    const idToOpen = this.curriculumOpenService.getAndClearCurriculumToOpen();
    if (!idToOpen || !this.contentTemplate) return;
    let item = this.curriculumList?.find((c: any) => String(c.id) === String(idToOpen));
    if (!item && Array.isArray(this.curriculumList)) {
      item = { id: idToOpen, title: 'New Curriculum', description: '', curriculumConceptCount: 0, curriculumStudyMaterialCount: 0, curriculumVideoLectureCount: 0, curriculumQuestionCount: 0, curriculumTopicCount: 0 };
      this.curriculumList = [...this.curriculumList, item];
    }
    if (item) {
      setTimeout(() => this.checkCourse(this.contentTemplate, item), 0);
    }
  }

  goBack() {
    this.location.back();
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
          .subscribe(
            response => {
              this.toasterService.showSuccess('Curriculum deleted successfully');
              this.getCurriculumList(this.courseId);
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  onSortClick(event,colName) {
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

  checkCourse(content, item) {
    if (this.curriculumList?.length) {
      this.selectedCurriculumItem = item && this.curriculumList.some((c: any) => String(c.id) === String(item.id))
        ? item
        : this.curriculumList[0];
      const idx = this.curriculumList.findIndex((c: any) => String(c.id) === String(this.selectedCurriculumItem?.id));
      this.index = idx >= 0 ? idx : 0;
      this.operationOnModal = 'view';
      this.modalReference = this.modalService.open(content, {
        size: 'xl',
        scrollable: true,
        windowClass: 'modal-right curriculum-detail-modal',
        backdrop: 'static',
        keyboard: false
      });
      this.tabData();
    }
  }

  trackByCurriculumId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByConceptId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }

  trackByQuestionId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }

  courseFormInit(): void {
    this.courseForm = this.formBuilder.group({
      title: ['', Validators.required],
      imageLink: [''],
      description: ['', Validators.required],
      categoryId: ['', Validators.required],
    });
  }

  get courseF() { return this.courseForm?.controls; }

  courseSetvalue(res: any): void {
    if (!this.courseForm) return;
    this.courseForm.patchValue({
      title: res?.title ?? '',
      categoryId: (res?.category?.id) ? res.category.id : (res?.categoryId ?? ''),
      imageLink: res?.imageLink ?? '',
      description: res?.description ?? '',
    });
  }

  getCategories(): void {
    this.subscription.add(
      this.appService.getCategories().subscribe((res: any) => {
        if (res) this.categories = res;
      })
    );
  }

  trackByCategoryId(_index: number, item: { id?: string }): string {
    return item?.id ?? `cat-${_index}`;
  }

  /** Open course edit modal on same page (same as admin). */
  courseContent(content: TemplateRef<any>, item: any): void {
    this.submitted = false;
    this.getCategories();
    this.courseSetvalue(item);
    this.modalReference = this.modalService.open(content, {
      size: 'lg',
      scrollable: true,
      windowClass: 'modal-right update-course-modal',
      backdrop: 'static',
      keyboard: false,
    });
  }

  updateCourse(): void {
    if (!this.courseForm?.valid) {
      this.submitted = true;
      return;
    }
    this.submitted = true;
    this.subscription.add(
      this.appService.updateCourse(this.courseForm.value, this.courseId).subscribe({
        next: () => {
          this.getCourseById(this.courseId);
          this.modalReference?.close();
          this.toasterService.showSuccess('Course updated successfully');
          this.cdr.markForCheck();
        },
        error: () => this.toasterService.showError('Failed to update course'),
      })
    );
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
          },
          error: () => this.toasterService.showError('Failed to delete question')
        }));
      }
    }).catch(() => {});
  }

  deleteStudyMaterialSection(item: any): void {
    const id = item?.id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Delete Study Material';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this study material section?';
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumStudyMaterial(id).subscribe({
          next: () => {
            this.toasterService.showSuccess('Study material deleted successfully');
            this.getStudyMaterialByCurriculumId(this.curriculumId);
            if (this.courseId) {
              this.appService.getCurriculumByCourseId(this.courseId).subscribe((res: any) => {
                const list = res?.curriculumResponseList ?? [];
                this.curriculumList = list;
                const updated = list.find((c: any) => c.id === this.selectedCurriculumItem?.id);
                if (updated) this.selectedCurriculumItem = updated;
                this.cdr.markForCheck();
              });
            }
          },
          error: () => this.toasterService.showError('Failed to delete study material')
        }));
      }
    }).catch(() => {});
  }

  deleteConceptSection(item: any): void {
    const id = item?.id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Delete Key Points Section';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this key points section?';
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumConcept(id).subscribe({
          next: () => {
            this.toasterService.showSuccess('Key points section deleted successfully');
            this.getConceptByCurriculumId(this.curriculumId);
            if (this.courseId) {
              this.appService.getCurriculumByCourseId(this.courseId).subscribe((res: any) => {
                const list = res?.curriculumResponseList ?? [];
                this.curriculumList = list;
                const updated = list.find((c: any) => c.id === this.selectedCurriculumItem?.id);
                if (updated) this.selectedCurriculumItem = updated;
                this.cdr.markForCheck();
              });
            }
          },
          error: () => this.toasterService.showError('Failed to delete key points section')
        }));
      }
    }).catch(() => {});
  }

  deleteVideoSection(item: any): void {
    const id = item?.id;
    if (!id) return;
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Delete Video Lecture Section';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this video lecture section?';
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumVideo(id).subscribe({
          next: () => {
            this.toasterService.showSuccess('Video lecture section deleted successfully');
            this.getvideoByCurriculumId(this.curriculumId);
            if (this.courseId) {
              this.appService.getCurriculumByCourseId(this.courseId).subscribe((res: any) => {
                const list = res?.curriculumResponseList ?? [];
                this.curriculumList = list;
                const updated = list.find((c: any) => c.id === this.selectedCurriculumItem?.id);
                if (updated) this.selectedCurriculumItem = updated;
                this.cdr.markForCheck();
              });
            }
          },
          error: () => this.toasterService.showError('Failed to delete video lecture section')
        }));
      }
    }).catch(() => {});
  }

  tabData(){
    this.curriculumId = this.selectedCurriculumItem.id;
    this.curriculumDetailstitle = this.selectedCurriculumItem.title;

    this.selectedCurriculumItem = this.selectedCurriculumItem;
    // Always show all tabs so same curriculum page opens with or without data (user can add from any section)
    this.showConceptTab = true;
    this.showStudyTab = true;
    this.showVideoTab = true;
    this.showQuestionTab = true;
    if (!this.selectedContent) this.selectedContent = 'KeyPoint';

    if (this.showStudyTab) {
      this.getStudyMaterialByCurriculumId(this.curriculumId);
    }
    if (this.showConceptTab) {
      this.getConceptByCurriculumId(this.curriculumId);
    }
    if (this.showVideoTab) {
      this.getvideoByCurriculumId(this.curriculumId);
    }

    if (this.showQuestionTab) {
      this.appService.getQuestionsByCurriculumId(this.curriculumId).subscribe((res: any) => {
        this.questionLength = res.length;
        this.questionItem = res;
      })
    }
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
  loadVideo(item){
    this.videoObj['videoLink'] = item.videoLink;
    this.videoObj['title'] = item.title;
    this.videoObj['description'] = item.description;
    this.videoObj['providerType'] = item.videoLink.includes("https://www.youtube.com")?'youtube':'local';
    // this.modalReference = this.modalService.open(content, { size: 'xl', windowClass: 'video-modal' });
  }

  /** Use proxy URL for S3 videos to avoid CORS. */
  getVideoSrc(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
      return this.appService.apiUrl + 'api/CurriculumVideoLecture/StreamVideo?url=' + encodeURIComponent(url);
    }
    return url;
  }

  getEncodedVideoUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try { return encodeURI(url); } catch { return url; }
  }

  fnQuestion(entityType) {
  }
  editSpecificCurriculum(task: string, item: any) {
    if (!item) return;
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
    this.cdr.detectChanges();
    this.scrollToEditorSection(task);
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
    this.scrollToEditorSection(task);
  }

  /** Scroll modal body so the editor for this task is visible (edited data page opens). */
  private scrollToEditorSection(task: string): void {
    const scroll = () => {
      const modalBody = document.querySelector('.curriculum-detail-modal .modal-body') as HTMLElement;
      const sectionId = task === 'concepts' || task === 'add-concepts' ? 'conceptEditorSection'
        : task === 'study-material' || task === 'add-study-material' ? 'studyMaterialEditorSection'
        : task === 'videos' || task === 'add-videos' ? 'videoEditorSection'
        : task === 'questions' || task === 'add-questions' ? 'questionEditorSection'
        : null;
      const el = sectionId ? document.getElementById(sectionId) : null;
      if (modalBody) {
        modalBody.scrollTop = 0;
        if (el) {
          modalBody.scrollTop = Math.min(el.offsetTop, Math.max(0, modalBody.scrollHeight - modalBody.clientHeight));
        }
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      this.cdr.markForCheck();
    };
    this.cdr.detectChanges();
    setTimeout(scroll, 50);
    setTimeout(scroll, 250);
  }


  formInit() {
    this.courseFormInit();
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
      title: ['', Validators.required],
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

  get courseStudyMaterialsArray() {
    return this.studyMaterialForm.get('studyMaterials') as UntypedFormArray;
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
            description: new UntypedFormControl(desc, []),
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
    group['description'] = new UntypedFormControl('{"version":1,"blocks":[]}', []);
    group['imageLink'] = new UntypedFormControl('');
    group['sortOrder']=this.courseStudyMaterialsArray.length+1;
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  addCourseStudyMaterialsItems(): void {
    this.courseStudyMaterialsArray.push(this.createStudyMaterialItems())
  }

  removeCourseStudyMaterialsItems(index) {
    this.courseStudyMaterialsArray.removeAt(index);
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
      this.courseStudyMaterialsArray.at(index).patchValue({
        imageLink: this.uploadedFilePath
      });
    });
  }


  /**
   * Operation of curriculam Concept option
   * Some method we are re-using of study-material
   * Inside formInit() method we have declared conceptForm controller
   * */ 
  get cf() { return this.conceptForm.controls; }

  get courseConceptsArray() {
    return this.conceptForm.get('concepts') as UntypedFormArray;
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
            description: new UntypedFormControl(desc, []),
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
    group['description'] = new UntypedFormControl('{"version":1,"blocks":[]}', []);
    group['imageLink'] = new UntypedFormControl('');
    group['sortOrder']=this.courseConceptsArray.length+1;
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }

  addCourseConceptItems(): void {
    this.courseConceptsArray.push(this.createConceptItems())
  }

  removeCourseConceptItems(index) {
    this.courseConceptsArray.removeAt(index);
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
    this.appService.uploadDocumnet(this.fileData,'curriculum_studyMaterial').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.courseStudyMaterialsArray.at(index).patchValue({
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

  get courseVideoLectureArray() {
    return this.videoForm.get('videoLectures') as UntypedFormArray;
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
            description: new UntypedFormControl(x.description ? x.description : '', [Validators.required]),
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
    group['sortOrder']=this.courseVideoLectureArray.length+1;
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }
changeProvider(provider:string,index:number){
  this.courseVideoLectureArray.at(index).patchValue({
    providerType: provider
  });
}
  addCourseVideoLectureItems(): void {
    this.courseVideoLectureArray.push(this.createVideoLectureItems())
  }

  removeCourseVideoLectureItems(index) {
    this.courseVideoLectureArray.removeAt(index);
  }

  onVideoSubmit() {
    this.submitted = true;
    if (this.videoForm.invalid) {
      return;
    }
    const lectures = this.videoForm.value?.videoLectures || [];
    const hasVideoLink = lectures.some((v: any) => v?.videoLink?.trim());
    if (!hasVideoLink) {
      this.toasterService.showError('Please add a video (upload a file or enter a YouTube URL) before saving.');
      return;
    }
    if (this.vf.id.value !== this.guid) {
      this.subscription.add(this.appService.updateCurriculumVideo(this.videoForm.value, this.vf.id.value).subscribe({
        next: () => {
          this.toasterService.showSuccess('Video Lecture updated successfully');
          this.sharedMethodAfterSaveOrUpdate();
          this.videoForm.reset();
        },
        error: (err) => {
          this.toasterService.showError(err?.error?.message || 'Failed to save video lecture.');
        }
      }));
    } else {
      this.videoForm.patchValue({
        sortOrder: this.videos.length + 1
      });
      this.subscription.add(this.appService.addCurriculumVideo(this.videoForm.value, this.curriculumId).subscribe({
        next: () => {
          this.toasterService.showSuccess('Video Lecture created successfully');
          this.sharedMethodAfterSaveOrUpdate();
          this.videoForm.reset();
        },
        error: (err) => {
          this.toasterService.showError(err?.error?.message || 'Failed to save video lecture.');
        }
      }));
    }
  }

  videofileProgress(fileInput: any, index) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadDocumnet(this.fileData,'curriculum_Vedios').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.courseVideoLectureArray.at(index).patchValue({
        videoLink: this.uploadedFilePath
      });
    })
  }
  
  uploadLink(url: string, index) {
    this.appService.uploadDocumnetLink(url,'curriculum_Vedios').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.courseVideoLectureArray.at(index).patchValue({
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

   get questionOptionArray() {
     return this.questionForm.get('options') as UntypedFormArray;
   }
 
   questionArrayControls(): AbstractControl[] {
     return (<UntypedFormArray>this.questionForm.get('options')).controls;
   }
 
   setQuestionvalue(res) {
     this.questionForm.patchValue({
       title: res?.title ? res.title : '',
       id: res?.id ? res.id : this.guid,
       description: res?.description ? res.description : '',
       sortOrder:res?.sortOrder ? res.sortOrder : 0,
       curriculumId: this.curriculumId
     });
     if (res && res.options && res.options.length > 0) {
       let array = [];
       res.options.forEach((x) => {
         array.push(this.formBuilder.group(
           {
             description: new UntypedFormControl(x.description ? x.description : '', []),
             isCorrect: new UntypedFormControl(x.isCorrect ? x.isCorrect : false, [Validators.required]),
             id: x.id ? x.id : this.guid,
             extraInformation: x.extraInformation ? x.extraInformation : '',
             sortOrder:array.length+1
           }))
       })
       const FormArray: UntypedFormArray = this.formBuilder.array(array);
       this.questionForm.setControl('options', FormArray);
     } else {
       this.formInit();
       this.submitted = false;
     }
   }
 
  createQuestionItems() {
    let group = {};
    group['extraInformation'] = new UntypedFormControl('');
    group['description'] = new UntypedFormControl('', []);
    group['isCorrect'] = new UntypedFormControl(false, [Validators.required]);
    group['sortOrder']=this.questionOptionArray.length+1;
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }
 
   addQuestionOptionsItems(): void {
     this.questionOptionArray.push(this.createQuestionItems())
   }
 
  removeQuestionOptionsItems(index) {
    this.questionOptionArray.removeAt(index);
  }

  onQuestionDescriptionJsonChange(json: string): void {
    setTimeout(() => {
      this.questionForm.patchValue({ description: json });
      this.cdr.markForCheck();
    }, 0);
  }

  onQuestionOptionJsonChange(json: string, index: number): void {
    setTimeout(() => {
      const options = this.questionOptionArray;
      if (options && index >= 0 && index < options.length) {
        options.at(index).patchValue({ description: json });
        this.cdr.markForCheck();
      }
    }, 0);
  }
 
   onQuestionSubmit() {
     this.submitted = true;
     // stop here if form is invalid
     if (this.questionForm.invalid) {
       return;
     }
     if (this.qf.id.value !== this.guid) {
       this.subscription.add(this.appService.updateQuestion(this.questionForm.value, this.qf.id.value).subscribe(() => {
         this.toasterService.showSuccess('Question updated successfully');
         this.questionSharedMethodAfterSaveOrUpdate();
         this.questionForm.reset();
       }));
     } else {
       this.questionForm.patchValue({
         sortOrder:this.questionItem.length+1
        });
       this.subscription.add(this.appService.addQuestion(this.questionForm.value).subscribe(() => {
         this.toasterService.showSuccess('Question created successfully');
         this.questionSharedMethodAfterSaveOrUpdate();
         this.questionForm.reset();
       }));
     }
   }
 
   fileProgress(fileInput: any, index) {
     this.fileData = <File>fileInput.target.files[0];
     this.appService.uploadDocumnet(this.fileData,'Curriculum_question').subscribe(res => {
       this.uploadedFilePath = res.documentPath;
       this.questionOptionArray.at(index).patchValue({
         extraInformation: this.uploadedFilePath
       });
     });
   }

  /**
   * Tab click: same as admin – if section is in DOM (has data), scroll to it; if not in DOM and has data, switch to view and scroll; if no data, open add form.
   * Exception: Video Lectures – when there is data, open the edit form directly (same as admin design: Title, Description, Local/YouTube, Update/Cancel).
   */
  scrollToContent(elementId: string): void {
    const hasData = (id: string): boolean => {
      switch (id) {
        case 'KeyPoint': return this.hasKeyPointData;
        case 'StudyMaterials': return this.hasStudyMaterialData;
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

    if (elementId === 'VideoLectures' && hasData('VideoLectures')) {
      this.editSpecificCurriculum('videos', this.videos[0]);
      return;
    }

    const element = document.getElementById(elementId);
    if (element) {
      this.selectedContent = elementId;
      element.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (hasData(elementId)) {
      this.operationOnModal = 'view';
      this.selectedContent = elementId;
      this.cdr.detectChanges();
      setTimeout(() => document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' }), 150);
    } else {
      openAddForm(elementId);
    }
  }

  questionSharedMethodAfterSaveOrUpdate(){
    this.getCurriculumList(this.courseId);
    this.editCurriculum('view');
    this.selectedContent = '';
    this.operationOnModal = 'view';
    this.tabData();
  }

  /**
   * Below methods are common for concept, study-material, video, questions
   * */ 

  sharedMethodAfterSaveOrUpdate(){
    this.getCurriculumList(this.courseId, () => {
      this.getStudyMaterialByCurriculumId(this.curriculumId);
      this.getConceptByCurriculumId(this.curriculumId);
      this.getvideoByCurriculumId(this.curriculumId);
      if (this.showQuestionTab) {
        this.appService.getQuestionsByCurriculumId(this.curriculumId).subscribe((res: any) => {
          this.questionLength = res?.length ?? 0;
          this.questionItem = res ?? [];
        });
      }
      this.operationOnModal = 'view';
      this.cdr.markForCheck();
    });
  }

  closeModal(){
    if (this.operationOnModal === 'concepts' || this.operationOnModal === 'add-concepts') {
      this.deleteUnsavedConceptBlockImages();
    } else if (this.operationOnModal === 'study-material' || this.operationOnModal === 'add-study-material') {
      this.deleteUnsavedStudyMaterialBlockImages();
    }
    this.studyMaterialForm.reset();
    this.conceptForm.reset();
    this.videoForm.reset();
    this.selectedContent = '';
    if(this.operationOnModal == 'view'){
      this.modalService.dismissAll();
    }else{
      this.editCurriculum('view');
    }
  }

  private deleteUnsavedConceptBlockImages(): void {
    const arr = this.courseConceptsArrayControls() || [];
    const currentDescs = arr.map(c => (c.get('description')?.value || '') as string);
    const initialUrls = new Set(this.extractImageUrlsFromDescriptions(this.initialConceptDescriptions));
    this.extractImageUrlsFromDescriptions(currentDescs).filter(u => !initialUrls.has(u))
      .forEach(url => this.appService.deleteImage(url).subscribe({ error: () => {} }));
  }

  private deleteUnsavedStudyMaterialBlockImages(): void {
    const arr = this.courseStudyMaterialsArrayControls() || [];
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
  /** Open course edit modal on same page (for course title, description, category). */
  openCourseEditPage(): void {
    if (this.modalReference) {
      this.modalReference.close();
    }
    if (this.cContentRef && this.courseInfo) {
      this.courseContent(this.cContentRef, this.courseInfo);
    }
  }

  /** Start inline edit of curriculum title/description (same as admin). */
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

  /** Save inline curriculum title/description */
  saveCurriculumEdit(): void {
    if (!this.editCurriculumTitle?.trim()) {
      this.toasterService.showError('Title is required');
      return;
    }
    const payload = {
      title: this.editCurriculumTitle.trim(),
      description: (this.editCurriculumDescription || '').trim(),
      sortOrder: this.selectedCurriculumItem?.sortOrder ?? 0,
      courseId: this.courseId,
    };
    const curriculumId = this.curriculumId;
    this.subscription.add(
      this.appService.updateCurriculum(payload, curriculumId).subscribe({
        next: () => {
          this.toasterService.showSuccess('Curriculum updated successfully');
          this.curriculumDetailstitle = payload.title;
          if (this.selectedCurriculumItem) {
            this.selectedCurriculumItem.title = payload.title;
            this.selectedCurriculumItem.description = payload.description;
          }
          this.isEditingCurriculum = false;
          this.getCurriculumList(this.courseId);
          this.cdr.markForCheck();
        },
        error: () => this.toasterService.showError('Failed to update curriculum'),
      })
    );
  }

  rootCloseModal(){
    this.isEditingCurriculum = false;
    this.editCurriculumTitle = '';
    this.editCurriculumDescription = '';
    this.studyMaterialForm.reset();
    this.conceptForm.reset();
    this.modalService.dismissAll();
    this.selectedContent = '';
  }


  ngOnDestroy(): void {
    this.sharedService.showCurriculumToolbar.next(false);
    this.sharedService.showCurriculumEditActions.next(true);
    this.sharedService.certificateName.next('');
    this.sharedService.curriculumSearchTerm$.next('');
    this.sharedService.curriculumActiveTab$.next('concepts');
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
