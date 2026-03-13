import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators, UntypedFormArray, AbstractControl, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
// CKEditor removed - using textarea instead
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../../adminapp.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-curriculum-question-set-questions-list',
    templateUrl: './curriculum-question-set-questions-list.component.html',
    styleUrls: ['./curriculum-question-set-questions-list.component.scss'],
    standalone: false
})
export class CurriculumQuestionSetQuestionsListComponent implements OnInit {

  questionSetId : string;
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
    this.activatedRoute
    .params
    .subscribe(params => {
      if (params.questionSetId) {
        this.questionSetId = params.questionSetId;
        this.getQuestionsByQuestionSetId(this.questionSetId)
      }
    });
    this.formInit();
  }

  getQuestionsByQuestionSetId(id) {
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
              this.getQuestionsByQuestionSetId(this.questionSetId);
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
    this.pageTitle = 'Add Question';
    this.btntext = 'Save';
    this.modalService.open(content, { windowClass: 'modal-right question-modal-panel', size: 'xl', scrollable: true });
  }

  updateQuestion(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Question';
    this.btntext = 'Update';
    this.modalService.open(content, { windowClass: 'modal-right question-modal-panel', size: 'xl', scrollable: true });
  }

  formInit() {
    this.questionForm = this.formBuilder.group({
      title: ['', Validators.required],
      description: [''],
      id: [this.guid],
      questionSetId: [this.questionSetId ? this.questionSetId :  this.guid],
      options: this.formBuilder.array([])
    })
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
    this.questionForm.patchValue({
      title: res?.title ? res.title : '',
      id: questionId,
      description: res?.description ? res.description : ''
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
    group['description'] = new UntypedFormControl('', [Validators.required]);
    group['isCorrect'] = new UntypedFormControl(false, [Validators.required]);
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
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
        this.getQuestionsByQuestionSetId(this.questionSetId);
      }));
    } else {
      this.subscription.add(this.appService.addQuestion(this.questionForm.value).subscribe(() => {
        this.toasterService.showSuccess('Question created successfully');
        this.getQuestionsByQuestionSetId(this.questionSetId);
      }));
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
