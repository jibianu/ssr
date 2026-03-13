// CKEditor removed - using textarea instead
import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormArray, AbstractControl, UntypedFormControl } from '@angular/forms';
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
    selector: 'app-curriculum-study-material',
    templateUrl: './curriculum-study-material.component.html',
    styleUrls: ['./curriculum-study-material.component.scss'],
    standalone: false
})
export class CurriculumStudyMaterialComponent implements OnInit, OnChanges, OnDestroy {

  studyMaterialForm: UntypedFormGroup;
  studyMaterials = [];
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
  private initialStudyMaterialDescriptions: string[] = [];

  uploadImageFn = (file: File) =>
    this.appService.uploadImage(file).pipe(map((res: any) => res?.url || res?.Url || res?.documentPath || ''));

  deleteImageFn = (url: string) => this.appService.deleteImage(url);

  uploadInProgress = false;

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

  ngOnChanges() {
    if (this.curriculumId) {
      this.getStudyMaterialByCurriculumId(this.curriculumId);
      this.formInit();
    }
  }

  goBack() {
    this.location.back();
  }


  AddStudyMaterial(content) {
    this.setvalue(null);
    this.pageTitle = 'Add Study Material';
    this.btntext = 'Save';
    this.modalReference = this.modalService.open(content, { size: 'xl', scrollable: true, windowClass: 'modal-right', backdrop: 'static', keyboard: false  });
  }

  updateStudyMaterial(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Study Material';
    this.btntext = 'Update';
    this.modalReference = this.modalService.open(content, { size: 'xl', scrollable: true, windowClass: 'modal-right', backdrop: 'static', keyboard: false  });
  }

  formInit() {
    this.studyMaterialForm = this.formBuilder.group({
      title: ['', Validators.required],
      id: [this.guid],
      sortOrder:0,
      studyMaterials: this.formBuilder.array([])
    })
  }

  get f() { return this.studyMaterialForm.controls; }

  sectionViewMode(index: number): 'author' | 'preview' {
    return this.sectionViewModes[index] ?? 'author';
  }
  setSectionViewMode(index: number, mode: 'author' | 'preview'): void {
    this.sectionViewModes[index] = mode;
  }

  get courseStudyMaterialsArray() {
    return this.studyMaterialForm.get('studyMaterials') as UntypedFormArray;
  }

  courseStudyMaterialsArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.studyMaterialForm.get('studyMaterials')).controls;
  }

  getStudyMaterialByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumStudyMaterialByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        this.studyMaterials = res;
      }
    }));
  }

  setvalue(res) {
    this.studyMaterialForm.patchValue({
      title: res?.title ? res.title : '',
      id: res?.id ? res.id : this.guid,
      sortOrder:res?.sortOrder ? res.sortOrder : 0
    });
    this.initialStudyMaterialDescriptions = [];
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

  createStudyMaterialItems() {
    let group = {};
    group['title'] = new UntypedFormControl('');
    group['description'] = new UntypedFormControl('{"version":1,"blocks":[]}', [Validators.required]);
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
        this.getStudyMaterialByCurriculumId(this.curriculumId);
      }));
    } else {
      this.studyMaterialForm.patchValue({
        sortOrder:this.studyMaterials.length+1
       });
      this.subscription.add(this.appService.addCurriculumStudyMaterial(this.studyMaterialForm.value, this.curriculumId).subscribe(() => {
        this.toasterService.showSuccess('Study Material created successfully');
        this.getStudyMaterialByCurriculumId(this.curriculumId);
        this.modalService.dismissAll();
      }));
    }
  }

  deleteStudyMaterial(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Study Material Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumStudyMaterial(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Study Material deleted successfully');
              this.getStudyMaterialByCurriculumId(this.curriculumId);
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
    this.appService.uploadDocumnet(this.fileData,'curriculum_studyMaterial').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.courseStudyMaterialsArray.at(index).patchValue({
        imageLink: this.uploadedFilePath
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

  private deleteUnsavedBlockImages(): void {
    const arr = this.courseStudyMaterialsArray?.controls || [];
    const currentDescs = arr.map(c => (c.get('description')?.value || '') as string);
    const initialUrls = new Set(this.extractImageUrlsFromDescriptions(this.initialStudyMaterialDescriptions));
    const currentUrls = this.extractImageUrlsFromDescriptions(currentDescs);
    currentUrls.filter(u => !initialUrls.has(u)).forEach(url => this.appService.deleteImage(url).subscribe({ error: () => {} }));
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

  // onReady method removed - CKEditor no longer used

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}