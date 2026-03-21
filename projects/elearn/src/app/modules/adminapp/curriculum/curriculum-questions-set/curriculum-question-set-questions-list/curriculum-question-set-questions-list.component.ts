import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { UntypedFormBuilder, Validators, UntypedFormArray, AbstractControl, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { isLessonContentJson } from 'src/app/shared/models/lesson-content.model';
import type { LessonBlockType } from 'src/app/shared/models/lesson-content.model';
import { AdminAppService } from '../../../adminapp.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-curriculum-question-set-questions-list',
    templateUrl: './curriculum-question-set-questions-list.component.html',
    styleUrls: ['./curriculum-question-set-questions-list.component.scss'],
    standalone: false
})
export class CurriculumQuestionSetQuestionsListComponent implements OnInit, OnChanges {

  /** When set (e.g. from parent modal), use this instead of route param. */
  @Input() questionSetId: string;
  /** When true, used inside Test Information side modal; hide back button and use compact header. */
  @Input() isEmbeddedInModal = false;

  questionSetIdResolved: string;
  modalReference: NgbModalRef;
  questions = [];
  subscription: Subscription = new Subscription();
  pageTitle: string;
  btntext: string;
  submitted: boolean = false;
  questionForm: UntypedFormGroup;
  guid = '00000000-0000-0000-0000-000000000000';
  fileData: File = null;
  previewUrl: any = null;
  fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  isLessonContent = isLessonContentJson;
  questionEditorBlockTypes: LessonBlockType[] = ['text'];
  uploadImageFn = (file: File) =>
    this.appService.uploadImage(file).pipe(map((res: any) => res?.url || res?.Url || res?.documentPath || ''));
  deleteImageFn = (url: string) => this.appService.deleteImage(url);
  uploadInProgress = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private location: Location,
    private cookieService: CookieService
  ) { }

  ngOnInit(): void {
    if (this.questionSetId) {
      this.questionSetIdResolved = this.questionSetId;
      this.getQuestionsByQuestionSetId(this.questionSetIdResolved);
    } else {
      this.activatedRoute.params.subscribe(params => {
        this.questionSetIdResolved = params.questionSetId;
        if (this.questionSetIdResolved) {
          this.getQuestionsByQuestionSetId(this.questionSetIdResolved);
          if (this.questionForm) {
            this.questionForm.get('questionSetId').patchValue(this.questionSetIdResolved);
          }
        }
      });
    }
    this.formInit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questionSetId'] && this.questionSetId && this.questionSetId !== this.questionSetIdResolved) {
      this.questionSetIdResolved = this.questionSetId;
      this.getQuestionsByQuestionSetId(this.questionSetIdResolved);
      this.formInit();
    }
  }

  getQuestionsByQuestionSetId(id: string) {
    if (!id) return;
    this.subscription.add(this.appService.getQuestionByquestionSetId(id).subscribe((res: any) => {
      if (res) {
        this.questions = res;
      }
    }));
  }

  deleteQuestion(id){
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Question Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteQuestion(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Question deleted successfully');
              this.getQuestionsByQuestionSetId(this.questionSetIdResolved);
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  goBack() {
    this.location.back();
  }

  addQuestion(content) {
    this.setvalue(null);
    this.pageTitle = 'Add New Question';
    this.btntext = 'Save';
    this.modalService.open(content, { windowClass: 'modal-right question-modal-panel', size: 'xl', scrollable: true });
  }

  updateQuestion(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Question';
    this.btntext = 'Update';
    this.modalService.open(content, { windowClass: 'modal-right question-modal-panel', size: 'xl', scrollable: true });
  }

  private readonly emptyLessonJson = '{"version":1,"blocks":[]}';

  formInit() {
    this.questionForm = this.formBuilder.group({
      title: ['', Validators.required],
      description: [this.emptyLessonJson],
      id: [this.guid],
      questionSetId: [this.questionSetIdResolved ? this.questionSetIdResolved : this.guid],
      options: this.formBuilder.array([])
    });
  }

  get f() { return this.questionForm.controls; }

  get questionOptionArray() {
    return this.questionForm.get('options') as UntypedFormArray;
  }

  questionArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.questionForm.get('options')).controls;
  }

  setvalue(res) {
    const questionId = (res?.id ?? res?.Id ?? this.guid) as string;
    const desc = (res?.description ?? '').trim();
    this.questionForm.patchValue({
      title: res?.title ? res.title : '',
      id: questionId,
      description: desc || this.emptyLessonJson
    });
    if (res && res.options && res.options.length > 0) {
      const array = [];
      res.options.forEach((x) => {
        const optDesc = (x.description ?? '').trim();
        array.push(this.formBuilder.group(
          {
            description: new UntypedFormControl(optDesc || this.emptyLessonJson, [Validators.required]),
            isCorrect: new UntypedFormControl(x.isCorrect ? x.isCorrect : false, [Validators.required]),
            id: x.id ? x.id : this.guid,
            extraInformation: x.extraInformation ? x.extraInformation : '',
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
    return this.formBuilder.group({
      extraInformation: new UntypedFormControl(''),
      description: new UntypedFormControl(this.emptyLessonJson, [Validators.required]),
      isCorrect: new UntypedFormControl(false, [Validators.required]),
      id: new UntypedFormControl(this.guid)
    });
  }

  addQuestionOptionsItems(): void {
    this.questionOptionArray.push(this.createQuestionItems())
  }

  removeQuestionOptionsItems(index) {
    this.questionOptionArray.removeAt(index);
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.questionForm.invalid) {
      return;
    }
    const questionId = this.f.id.value;
    const isUpdate = questionId && String(questionId).trim() !== '' && String(questionId).trim() !== String(this.guid).trim();
    if (isUpdate) {
      this.subscription.add(this.appService.updateQuestion(this.questionForm.value, questionId).subscribe(() => {
        this.toasterService.showSuccess('Question updated successfully');
        this.getQuestionsByQuestionSetId(this.questionSetIdResolved);
      }));
    } else {
      this.subscription.add(this.appService.addQuestion(this.questionForm.value).subscribe(() => {
        this.toasterService.showSuccess('Question created successfully');
        this.getQuestionsByQuestionSetId(this.questionSetIdResolved);
      }));
    }
  }

  trackByQuestionId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }
  trackByIndex(index: number): number {
    return index;
  }

  onQuestionDescriptionJsonChange(json: string): void {
    this.questionForm.patchValue({ description: json });
  }
  onQuestionOptionJsonChange(json: string, index: number): void {
    const options = this.questionOptionArray;
    if (options && index >= 0 && index < options.length) {
      options.at(index).patchValue({ description: json });
    }
  }

  fileProgress(fileInput: any, index) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadDocumnet(this.fileData,'TestInformation').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.questionOptionArray.at(index).patchValue({
        extraInformation: this.uploadedFilePath
      });
    });
  }

  // onReady method removed - CKEditor no longer used

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
