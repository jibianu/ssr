import { ConfirmationModalComponent } from './../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-curriculum-description',
    templateUrl: './curriculum-description.component.html',
    styleUrls: ['./curriculum-description.component.scss'],
    standalone: false
})
export class CurriculumDescriptionComponent implements OnInit, OnChanges, OnDestroy {

  topicForm: UntypedFormGroup;
  topics = [];
  pageTitle: string;
  btntext: string;
  submitted: boolean = false;
  subscription: Subscription = new Subscription();
  guid = '00000000-0000-0000-0000-000000000000';
  @Input() curriculumId: string;
  modalReference: NgbModalRef;
  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
  ) { }

  ngOnInit(): void {

  }

  ngOnChanges() {
    if (this.curriculumId) {
      this.getTopicByCurriculumId(this.curriculumId);
      this.formInit();
    }
  }

  AddTopic(content) {
    this.setvalue(null);
    this.pageTitle = 'Add Topic';
    this.btntext = 'Save';
    this.modalReference = this.modalService.open(content, { size: 'lg' });
  }

  updateTopic(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Topic';
    this.btntext = 'Update';
    this.modalReference = this.modalService.open(content, { size: 'lg' });
  }

  formInit() {
    this.topicForm = this.formBuilder.group({
      title: ['', Validators.required],
      id: [this.guid]
    })
  }

  get f() { return this.topicForm.controls; }


  getTopicByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumTopicByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        // this.setvalue(res);
        this.topics = res;
      }
    }));
  }

  setvalue(res) {
    this.topicForm.patchValue({
      title: res?.title ? res.title : '',
      id: res?.id ? res.id : this.guid
    });
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.topicForm.invalid) {
      return;
    }
    if (this.f.id.value !== this.guid) {
      this.subscription.add(this.appService.updateCurriculumTopic(this.topicForm.value, this.f.id.value).subscribe(() => {
        this.toasterService.showSuccess('Topic updated successfully');
        this.getTopicByCurriculumId(this.curriculumId);
      }));
    } else {
      this.subscription.add(this.appService.addCurriculumTopic(this.topicForm.value, this.curriculumId).subscribe(() => {
        this.toasterService.showSuccess('Topic created successfully');
        this.getTopicByCurriculumId(this.curriculumId);
      }));
    }
  }

  deleteTopic(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Topic Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumTopic(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Topic deleted successfully');
              this.getTopicByCurriculumId(this.curriculumId);
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
