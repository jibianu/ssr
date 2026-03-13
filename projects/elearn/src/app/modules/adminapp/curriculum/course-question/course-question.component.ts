import { Location } from '@angular/common';
import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormArray, AbstractControl, UntypedFormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbModalRef, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { LessonBlockType } from 'src/app/shared/models/lesson-content.model';
import { AdminAppService } from '../../adminapp.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';

@Component({
    selector: 'app-course-question',
    templateUrl: './course-question.component.html',
    styleUrls: ['./course-question.component.scss'],
    standalone: false
})
export class CourseQuestionComponent implements OnInit, OnChanges, OnDestroy {

  questionSetId: string;
  modalReference: NgbModalRef;
  questions = [];
  subscription: Subscription = new Subscription();
  pageTitle: string;
  btntext: string;
  submitted: boolean = false;
  questionForm: UntypedFormGroup;
  fileData: File = null;
  previewUrl: any = null;
  fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  guid = '00000000-0000-0000-0000-000000000000';
  @Input() curriculumId: string;
  @Input() courseId: string;

  /** Only text block for answer options (bold, italic, links, images, etc.). */
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
    this.formInit();
  }

  ngOnChanges() {
    if (this.courseId) {
      this.getAllQuestionsByCourseId(this.courseId);
    }
  }

  getAllQuestionsByCourseId(id) {
    this.subscription.add(this.appService.getAllQuestionsByCourseId(id).subscribe((res: any) => {
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

  deleteQuestion(id) {
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
              this.getAllQuestionsByCourseId(this.courseId);
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
      courseId: [this.courseId ? this.courseId : this.guid],
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
        this.getAllQuestionsByCourseId(this.courseId);
      }));
    } else {
      this.subscription.add(this.appService.addQuestion(this.questionForm.value).subscribe(() => {
        this.toasterService.showSuccess('Question created successfully');
        this.getAllQuestionsByCourseId(this.courseId);
      }));
    }
  }

  // onReady method removed - CKEditor no longer used

  fileProgress(fileInput: any, index) {
    this.fileData = <File>fileInput.target.files[0];
    this.appService.uploadDocumnet(this.fileData, 'AllQuestion').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.questionOptionArray.at(index).patchValue({
        extraInformation: this.uploadedFilePath
      });
    });
  }


  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
