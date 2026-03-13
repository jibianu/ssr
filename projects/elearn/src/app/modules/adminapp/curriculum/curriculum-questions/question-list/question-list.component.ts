// CKEditor removed - using textarea instead
import { ConfirmationModalComponent } from './../../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from './../../../../../shared/component/toaster/toaster.service';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Subscription } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute } from '@angular/router';
import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { Location } from '@angular/common';
import { CookieService } from 'src/app/core/services/cookie.service';
// MyUploadAdapter removed - CKEditor no longer used
import Swal from 'sweetalert2/dist/sweetalert2.js';

@Component({
    selector: 'app-question-list',
    templateUrl: './question-list.component.html',
    styleUrls: ['./question-list.component.scss'],
    standalone: false
})
export class QuestionListComponent implements OnInit, OnChanges {

  questionSetId : string;
  modalReference: NgbModalRef;
  questions = [];
  subscription: Subscription = new Subscription();
  pageTitle: string;
  btntext: string;
  submitted: boolean = false;
  questionForm: UntypedFormGroup;
  guid = '00000000-0000-0000-0000-000000000000';
  @Input() curriculumId: string;
  @Input() courseId : string;
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
  course:any;
  ngOnInit(): void {
    this.course=JSON.parse(localStorage.getItem("course"));
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

  ngOnChanges(){
    if(this.curriculumId){
      this.getQuestionsByCurriculumId(this.curriculumId);
    } 
    if(this.courseId){
      this.getQuestionsByCourseId(this.courseId);
    }
  }

  getQuestionsByCourseId(id) {
    this.subscription.add(this.appService.getQuestionsByCourseId(id).subscribe((res: any) => {
      if (res) {
        this.questions = res;
      }
    }));
  }

  getQuestionsByCurriculumId(id) {
    this.subscription.add(this.appService.getQuestionsByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        this.questions = res;
      }
    }));
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
              this.getQuestionsByCurriculumId(this.curriculumId);
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
    this.modalService.open(content, { windowClass: 'modal-right question-modal-panel', size: 'xl', scrollable: true, backdrop: 'static', keyboard: false   });
  }

  updateQuestion(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Question';
    this.btntext = 'Update';
    this.modalService.open(content, { windowClass: 'modal-right question-modal-panel', size: 'xl', scrollable: true, backdrop: 'static', keyboard: false   });
  }

  formInit() {
    this.questionForm = this.formBuilder.group({
      title: ['', Validators.required],
      description: [''],
      id: [this.guid],
      curriculumId: [this.curriculumId ? this.curriculumId :  this.guid],
      sortOrder:0,
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
    const questionId = res?.id ?? res?.Id ?? this.guid;
    this.questionForm.patchValue({
      title: res?.title ? res.title : '',
      id: questionId,
      description: res?.description ? res.description : '',
      sortOrder:res?.sortOrder ? res.sortOrder : 0
    });
    if (res && res.options && res.options.length > 0) {
      let array = [];
      res.options.forEach((x) => {
        const optionId = x?.id ?? x?.Id ?? this.guid;
        array.push(this.formBuilder.group(
          {
            description: new UntypedFormControl(x.description ? x.description : '', [Validators.required]),
            isCorrect: new UntypedFormControl(x.isCorrect ? x.isCorrect : false, [Validators.required]),
            id: optionId,
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
    group['description'] = new UntypedFormControl('', [Validators.required]);
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
        this.getQuestionsByCurriculumId(this.curriculumId);
      }));
    } else {
      this.questionForm.patchValue({
        sortOrder:this.questions.length+1
       });
      this.subscription.add(this.appService.addQuestion(this.questionForm.value).subscribe(() => {
        this.toasterService.showSuccess('Question created successfully');
        this.getQuestionsByCurriculumId(this.curriculumId);
        this.modalService.dismissAll();
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
  co(e){
    console.log(e)
    return 'a'
  }

  // onReady method removed - CKEditor no longer used

  asktosave():boolean {    
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
        this.modalService.dismissAll();
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
