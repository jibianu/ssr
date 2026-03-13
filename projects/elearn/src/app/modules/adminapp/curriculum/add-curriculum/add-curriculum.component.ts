import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Component, OnInit, OnDestroy, Optional } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { CurriculumOpenService } from '../curriculum-open.service';
import { Location } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-add-curriculum',
    templateUrl: './add-curriculum.component.html',
    styleUrls: ['./add-curriculum.component.scss'],
    standalone: false
})
export class AddCurriculumComponent implements OnInit, OnDestroy {

  pageTitle: string;
  btntext: string;
  courseId: string;
  curriculumId: string;
  curriculumForm: UntypedFormGroup;
  submitted = false;
  subscription: Subscription = new Subscription();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private curriculumOpenService: CurriculumOpenService,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private cookieService: CookieService,
    @Optional() public activeModal: NgbActiveModal
  ) { }

  /** Called when opened as modal with courseId. Resets form and subscription so a second curriculum can be saved. */
  setCourseId(id: string): void {
    this.courseId = id;
    this.curriculumId = undefined;
    this.pageTitle = 'Add Curriculum';
    this.btntext = 'Save';
    this.submitted = false;
    // Fresh subscription so second save works when modal reuses the same component instance
    this.subscription = new Subscription();
    this.formInit();
    if (this.curriculumForm && id) {
      this.curriculumForm.patchValue({ courseId: id });
    }
  }

  ngOnInit(): void {
    if (this.activeModal) {
      // Modal: ensure form exists before template binds (setCourseId is called after open)
      this.formInit();
      return;
    }
    this.activatedRoute.params.subscribe(params => {
      if (params.courseId) {
        this.courseId = params.courseId;
        this.pageTitle = 'Add Curriculum';
        this.btntext = 'Save';
      }
      if (params.curriculumId) {
        this.curriculumId = params.curriculumId;
        this.pageTitle = 'Update Curriculum';
        this.btntext = 'Update';
        this.getCurriculumById(this.curriculumId);
      }
      this.formInit();
    });
  }

  getCurriculumById(curriculumId){
    this.subscription.add(this.appService.getCurriculumByCurriculumId(curriculumId).subscribe((res: any) => {
      if (res) {
        this.setvalue(res);
      }
    }));
  }

  formInit() {
    this.curriculumForm = this.formBuilder.group({
      title: ['', Validators.required],
      description: [''],
      sortOrder: [0],
      courseId: [this.courseId || '', Validators.required],
    });
  }

  get f() { return this.curriculumForm.controls; }

  setvalue(res) {
    // debugger
    console.log(res);
    this.curriculumForm.patchValue({
      title: res.title ? res.title : '',
      courseId: res.courseId ? res.courseId : '',
      description: res.description ? res.description : '',
      sortOrder:res.sortOrder?res.sortOrder:0
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.curriculumForm.invalid) {
      this.toasterService.showError('Please fill in the required fields (e.g. Title).');
      return;
    }
    if (this.curriculumId) {
      this.subscription.add(this.appService.updateCurriculum(this.curriculumForm.value, this.curriculumId).subscribe({
        next: () => {
          this.toasterService.showSuccess('Curriculum updated successfully');
          this.goBack();
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || err?.statusText || 'Update failed';
          this.toasterService.showError('Failed to update curriculum: ' + msg);
        }
      }));
      return;
    }
    const courseId = this.courseId || this.curriculumForm.get('courseId')?.value;
    if (!courseId) {
      this.toasterService.showError('Course is missing. Close and open Add Curriculum again from the course curriculum list.');
      return;
    }
    const payload = {
      title: this.curriculumForm.get('title')?.value ?? '',
      description: this.curriculumForm.get('description')?.value ?? '',
      sortOrder: this.curriculumForm.get('sortOrder')?.value ?? 0,
      courseId
    };
    this.subscription.add(this.appService.addCurriculum(payload, courseId).subscribe({
      next: (res: any) => {
        this.toasterService.showSuccess('Curriculum created successfully');
        const newId = res?.id || res?.Id;
        if (newId) {
          this.curriculumOpenService.setCurriculumToOpen(newId);
        }
        this.goBack();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || err?.statusText || 'Save failed';
        this.toasterService.showError('Failed to save curriculum: ' + msg);
      }
    }));
  }

  goBack() {
    if (this.activeModal) {
      this.activeModal.close(true);
    } else {
      this.location.back();
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
