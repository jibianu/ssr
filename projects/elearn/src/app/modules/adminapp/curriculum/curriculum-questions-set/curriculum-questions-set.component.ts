import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, AbstractControl, FormArray, FormControl } from '@angular/forms';
import { NgbModalRef, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-curriculum-questions-set',
    templateUrl: './curriculum-questions-set.component.html',
    styleUrls: ['./curriculum-questions-set.component.scss'],
    standalone: false
})
export class CurriculumQuestionsSetComponent implements OnInit, OnChanges, OnDestroy {

  questionSetForm: UntypedFormGroup;
  questionSet = [];
  pageTitle: string;
  btntext: string;
  submitted: boolean = false;
  subscription: Subscription = new Subscription();
  guid = '00000000-0000-0000-0000-000000000000';
  @Input() courseId: string;
  fileData: File = null;
  previewUrl: any = null;
  fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  modalReference: NgbModalRef;
  totalQuestionsCount:number;
  questionsList=[];
  questionsPassMarkList=[];

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private location: Location,
  ) { }

  ngOnInit(): void {

  }

  ngOnChanges() {
    if (this.courseId) {
      this.getQuetionSetCourseId(this.courseId);
      this.formInit();
    }
  }

  goBack() {
    this.location.back();
  }

  addQuetionSet(content) {
    this.setvalue(null);
    this.pageTitle = 'Add Test Information';
    this.btntext = 'Save';
    this.modalReference = this.modalService.open(content, { size: 'lg', scrollable: true, windowClass: 'modal-right' });
  }

  updateQuetionSet(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Test Information';
    this.btntext = 'Update';
    this.modalReference = this.modalService.open(content, { size: 'lg', scrollable: true, windowClass: 'modal-right' });
  }

  formInit() {
    this.questionSetForm = this.formBuilder.group({
      title: ['', Validators.required],
      id: [this.guid],
      // questionSets: this.formBuilder.array([]),
      description: ['', Validators.required],
      difficultyLevelId: [0, Validators.required],
      questionSetTestInformation: this.formBuilder.group({
        termsAndConditions: ['', Validators.required],
        about: ['', Validators.required],
        durationInMinute: [0, Validators.required],
        questionCount: [0, Validators.required],
        topics: ['', Validators.required],
        passQuestionCounts: [0, Validators.required],
        maxAttemptsAllowed: [0, Validators.required]
      })
    })

    // this.subscription.add(this.questionSetForm.controls['difficultyLevelId'].valueChanges.subscribe(value => {
    //   this.questionSetForm.patchValue({
    //     difficultyLevelId : parseInt(value)
    //   })
    // }));
  }

  get f() { return this.questionSetForm.controls; }

  // get courseQuestionSetsArray() {
  //   return this.questionSetForm.get('questionSets') as FormArray;
  // }

  // courseQuestionSetsArrayControls(): AbstractControl[] {
  //   return (<FormArray>this.questionSetForm.get('questionSets')).controls;
  // }

  getQuetionSetCourseId(id) {
    this.subscription.add(this.appService.getQuetionSetCourseId(id).subscribe((res: any) => {
      if (res) {
        this.questionSet = res;
      }
    }));
  }

  changeDifficulty(e) {
    console.log(e.target.value)
    this.questionSetForm.patchValue({
      difficultyLevelId: parseInt(e.target.value)
    })
  }
  changePassQuestionCounts(e){
    this.questionSetForm.get("questionSetTestInformation").patchValue({
      passQuestionCounts: parseInt(e.target.value)
    })
  }
  changeQuestionCount(e) {
    console.log(e.target.value)
    this.questionSetForm.get("questionSetTestInformation").patchValue({
      questionCount: parseInt(e.target.value)
    })
    this.questionsPassMarkList=this.getNumberList(parseInt(e.target.value))
  }

  setvalue(res) {
    if (res) {
  this.totalQuestionsCount=res.totalQuestionCount;
  this.questionsList=this.getNumberList(res.totalQuestionCount);
  this.questionsPassMarkList=this.getNumberList(res.totalQuestionCount)
      this.questionSetForm.patchValue({
        title: res?.title ? res.title : '',
        description: res?.description ? res?.description : '',
        difficultyLevelId: res?.difficultyLevelId ? res?.difficultyLevelId : 1,
        id: res?.id ? res.id : this.guid,
        questionSetTestInformation: {
          termsAndConditions: res?.questionSetTestInformation?.termsAndConditions ? res.questionSetTestInformation.termsAndConditions : '',
          about: res?.questionSetTestInformation?.about ? res.questionSetTestInformation.about : '',
          durationInMinute: res?.questionSetTestInformation?.durationInMinute ? res.questionSetTestInformation.durationInMinute : 0,
          questionCount: res?.questionSetTestInformation?.questionCount ? res.questionSetTestInformation.questionCount : 0,
          topics: res?.questionSetTestInformation?.topics ? res.questionSetTestInformation.topics : '',
          passQuestionCounts: res?.questionSetTestInformation?.passQuestionCounts ? res.questionSetTestInformation.passQuestionCounts : 0,
          maxAttemptsAllowed: res?.questionSetTestInformation?.maxAttemptsAllowed ? res.questionSetTestInformation.maxAttemptsAllowed : 0
        }
      })
      // let array = [];
      // res.questionSets.forEach((x) => {
      //   array.push(this.formBuilder.group(
      //     {
      //       description: new FormControl(x.description ? x.description : '', [Validators.required]),
      //       title: new FormControl(x.title ? x.title : '', [Validators.required]),
      //       id: x.id ? x.id : this.guid,
      //       difficultyLevelId: x?.difficultyLevelId ? x.difficultyLevelId : 1,
      //       questionSetTestInformation: {
      //         termsAndConditions: x?.questionSetTestInformation?.termsAndConditions ? x.questionSetTestInformation.termsAndConditions : '',
      //         about: x?.questionSetTestInformation?.about ? x.questionSetTestInformation.about : '',
      //         duration: x?.questionSetTestInformation?.duration ? x.questionSetTestInformation.duration : '',
      //         questionCount: x?.questionSetTestInformation?.questionCount ? x.questionSetTestInformation.questionCount : 0,
      //         topics: x?.questionSetTestInformation?.topics ? x.questionSetTestInformation.topics : ''
      //       }
      //     }))
      // })
      // const FormArray: FormArray = this.formBuilder.array(array);
      // this.questionSetForm.setControl('questionSets', FormArray);
    } else {
      this.formInit();
      this.submitted = false;
    }
  }

  // createQuestionSetItems() {
  //   let group = {};
  //   group['title'] = new FormControl('', [Validators.required]);
  //   group['description'] = new FormControl('', [Validators.required]);
  //   group['id'] = new FormControl(this.guid);
  //   group['difficultyLevelId'] = new FormControl(1);
  //   group['questionSetTestInformation'] = this.formBuilder.group({
  //     termsAndConditions: ['', Validators.required],
  //     about: ['', Validators.required],
  //     duration: ['', Validators.required],
  //     questionCount: [0, Validators.required],
  //     topics: ['', Validators.required]
  //   })
  //   return this.formBuilder.group(group);
  // }

  // addCourseQuestionSetItems(): void {
  //   this.courseQuestionSetsArray.push(this.createQuestionSetItems())
  // }

  // removeCourseQuestionSetItems(index) {
  //   this.courseQuestionSetsArray.removeAt(index);
  // }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.questionSetForm.invalid) {
      return;
    }
    if (this.f.id.value !== this.guid) {
      this.subscription.add(this.appService.updateCurriculumQuestionSet(this.questionSetForm.value, this.f.id.value).subscribe(() => {
        this.toasterService.showSuccess('Test Information updated successfully');
        this.getQuetionSetCourseId(this.courseId);
      }));
    } else {
      this.subscription.add(this.appService.addCourseQuestionSet(this.questionSetForm.value, this.courseId).subscribe(() => {
        this.toasterService.showSuccess('Test Information created successfully');
        this.getQuetionSetCourseId(this.courseId);
      }));
    }
  }

  deleteQuetionSet(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Test Information Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumQuestionSet(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Test Information deleted successfully');
              this.getQuetionSetCourseId(this.courseId);
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }
getNumberList(x){
  var list = Array(x).fill(0).map((x, i) => {
    return { id: (i + 1), name: (i + 1) };
  });
  return list;
}

  trackByQuestionSetId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }
  trackById(_index: number, item: { id?: number }): number | string {
    return item?.id ?? _index;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}