import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormControl, UntypedFormArray, AbstractControl } from '@angular/forms';
import { NgbModalRef, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { CookieService } from 'src/app/core/services/cookie.service';
import { isLessonContentJson } from 'src/app/shared/models/lesson-content.model';
import { Location } from '@angular/common';
import Swal from 'sweetalert2/dist/sweetalert2.js';

@Component({
    selector: 'app-curriculum-concepts',
    templateUrl: './curriculum-concepts.component.html',
    styleUrls: ['./curriculum-concepts.component.scss'],
    standalone: false
})
export class CurriculumConceptsComponent implements OnInit, OnChanges, OnDestroy {

  conceptForm: UntypedFormGroup;
  concepts = [];
  pageTitle: string;
  btntext: string;
  submitted: boolean = false;
  subscription: Subscription = new Subscription();
  guid = '00000000-0000-0000-0000-000000000000';
  @Input() curriculumId: string;
  fileData: File = null;
  previewUrl: any = null;
  fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  modalReference: NgbModalRef;
  /** Per-section view mode: 'author' | 'preview' for lesson editor */
  sectionViewModes: { [index: number]: 'author' | 'preview' } = {};
  /** Initial description JSON per section when modal opened (for cancel cleanup). */
  private initialConceptDescriptions: string[] = [];

  uploadImageFn = (file: File) =>
    this.appService.uploadImage(file).pipe(map((res: any) => res?.url || res?.Url || res?.documentPath || ''));

  deleteImageFn = (url: string) => this.appService.deleteImage(url);

  uploadInProgress = false;

  onUploadInProgress(inProgress: boolean): void {
    this.uploadInProgress = inProgress;
  }

  onConceptDescriptionChange(index: number, json: string): void {
    this.courseConceptsArray.at(index).patchValue({ description: json });
  }

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private cookieService: CookieService,
    private location:Location
  ) { }
  course:any;
  ngOnInit(): void { 
    this.course=JSON.parse(localStorage.getItem("course"));
    }
  private documents:[any];

  ngOnChanges() {
    if (this.curriculumId) {
      this.getConceptByCurriculumId(this.curriculumId);
      this.formInit();
    }
  }

  goBack() {
    this.location.back();
  }

  AddConcept(content) {
    this.setvalue(null);
    this.pageTitle = 'Add Concept';
    this.btntext = 'Save';
    this.modalService.open(content, { windowClass: 'modal-right', size: 'xl', scrollable: true, backdrop: 'static', keyboard: false });
  }

  updateConcept(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Concept';
    this.btntext = 'Update';
    this.modalService.open(content, { windowClass: 'modal-right', size: 'xl', scrollable: true, backdrop: 'static', keyboard: false  });
  }

  formInit() {
    this.conceptForm = this.formBuilder.group({
      title: ['', Validators.required],
      id: [this.guid],
      sortOrder:0,
      concepts: this.formBuilder.array([])
    })
  }

  get f() { return this.conceptForm.controls; }

  sectionViewMode(index: number): 'author' | 'preview' {
    return this.sectionViewModes[index] ?? 'author';
  }
  setSectionViewMode(index: number, mode: 'author' | 'preview'): void {
    this.sectionViewModes[index] = mode;
  }

  get courseConceptsArray() {
    return this.conceptForm.get('concepts') as UntypedFormArray;
  }

  courseConceptsArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.conceptForm.get('concepts')).controls;
  }

  getConceptByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumConceptByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        // this.setvalue(res);
        this.concepts = res;
      }
    }));
  }

  // onReady method removed - CKEditor no longer used

  setvalue(res) {
    this.conceptForm.patchValue({
      title: res?.title ? res.title : '',
      id: res?.id ? res.id : this.guid,
      sortOrder:res?.sortOrder ? res.sortOrder : 0
    });
    this.initialConceptDescriptions = [];
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

  onSubmit() {
    console.log(this.documents)
    this.submitted = true;
    // stop here if form is invalid
    if (this.conceptForm.invalid) {
      return;
    }
    if (this.f.id.value !== this.guid) {
     
      this.subscription.add(this.appService.updateCurriculumConcept(this.conceptForm.value, this.f.id.value).subscribe(() => {
        this.toasterService.showSuccess('Concept updated successfully');
        this.getConceptByCurriculumId(this.curriculumId);
      }));
    } else {
      this.conceptForm.patchValue({
       sortOrder:this.concepts.length+1
      });
      this.subscription.add(this.appService.addCurriculumConcept(this.conceptForm.value, this.curriculumId).subscribe(() => {
        this.toasterService.showSuccess('Concept created successfully');
        this.getConceptByCurriculumId(this.curriculumId);
        this.modalService.dismissAll();
      }));
    }
  }

  deleteConcept(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Concept Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumConcept(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Concept deleted successfully');
              this.getConceptByCurriculumId(this.curriculumId);
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  fileProgress(fileInput: any, index) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadDocumnet(this.fileData,'curriculum_Concepts').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      // this.documents[index]=res;
      this.courseConceptsArray.at(index).patchValue({
        imageLink: this.uploadedFilePath,
      });
    });
  }

  asktosave(): boolean {
    return Swal.fire({
      title: 'Are you sure, you want to close?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteUnsavedBlockImages();
        this.modalService.dismissAll();
      }
    });
  }

  /** Delete images uploaded during this session but not saved (cancel without save). */
  private deleteUnsavedBlockImages(): void {
    const currentDescs = (this.courseConceptsArray?.controls || []).map(
      c => (c.get('description')?.value || '') as string
    );
    const initialUrls = new Set(this.extractImageUrlsFromDescriptions(this.initialConceptDescriptions));
    const currentUrls = this.extractImageUrlsFromDescriptions(currentDescs);
    const toDelete = currentUrls.filter(u => !initialUrls.has(u));
    toDelete.forEach(url => this.appService.deleteImage(url).subscribe({ error: () => {} }));
  }

  private extractImageUrlsFromDescriptions(descriptions: string[]): string[] {
    const urls: string[] = [];
    descriptions.forEach(json => {
      if (!json || !isLessonContentJson(json)) return;
      try {
        const parsed = JSON.parse(json);
        const blocks = parsed?.blocks || [];
        blocks.forEach((b: any) => {
          if (b?.imageUrl) urls.push(b.imageUrl);
        });
      } catch { /* ignore */ }
    });
    return urls;
  }
  
  onClickedOutside(e:any){
    console.log(e);
  }
 
  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
