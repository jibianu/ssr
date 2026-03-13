import { DatePipe, Location } from '@angular/common';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

@Component({
    selector: 'app-course-prices',
    templateUrl: './course-prices.component.html',
    styleUrls: ['./course-prices.component.scss'],
    standalone: false
})
export class CoursePricesComponent implements OnInit,OnChanges {

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private location: Location,
    private datePipe:DatePipe,
    private toasterService: ToasterService,
    private appService: AdminAppService,
  ) { }
  @Input() courseId:any;
  subscription: Subscription = new Subscription();
  priceForm:UntypedFormGroup;
  modalReference: NgbModalRef;
  guid = '00000000-0000-0000-0000-000000000000';
  pageTitle="Add Price"
  btntext="Save"
  submitted=false;
  prices=[]
  ngOnInit(): void {
    this.formInit();
  }
  ngOnChanges() {
    if (this.courseId) {
      this.getAllPricesByCourseId(this.courseId);
    }
  }
  formInit() {
    this.priceForm = this.formBuilder.group({
      coursePriceType: ['paid'],
      originalPrice: [0],
      discountedPrice: [0],
      startDate: [this.datePipe.transform(new Date(), 'yyyy-MM-dd')],
      endDate: [this.datePipe.transform(new Date(), 'yyyy-MM-dd')],
      courseId: [this.courseId ? this.courseId : this.guid],
      id: ['']
    });
    this.updatePaidValidators();
    this.priceForm.get('coursePriceType').valueChanges.subscribe(() => this.updatePaidValidators());
  }

  /** When paid: require original price; discount/dates optional. When free: no price required. */
  private updatePaidValidators() {
    const isPaid = this.priceForm?.get('coursePriceType')?.value === 'paid';
    const orig = this.priceForm?.get('originalPrice');
    const disc = this.priceForm?.get('discountedPrice');
    const start = this.priceForm?.get('startDate');
    const end = this.priceForm?.get('endDate');
    if (!orig) return;
    if (isPaid) {
      orig.setValidators([Validators.required, Validators.min(0)]);
      disc?.clearValidators();
      start?.clearValidators();
      end?.clearValidators();
    } else {
      orig.clearValidators();
      disc?.clearValidators();
      start?.clearValidators();
      end?.clearValidators();
    }
    orig.updateValueAndValidity();
    disc?.updateValueAndValidity();
    start?.updateValueAndValidity();
    end?.updateValueAndValidity();
  }

  get discountPriceError(): boolean {
    const orig = this.f.originalPrice?.value;
    const disc = this.f.discountedPrice?.value;
    if (orig == null || disc == null || disc === '' || Number(disc) === 0) return false;
    return Number(disc) >= Number(orig);
  }

  get dateRangeError(): boolean {
    const start = this.f.startDate?.value;
    const end = this.f.endDate?.value;
    if (!start || !end) return false;
    return start > end;
  }
  // validateDateFn(control:AbstractControl):ValidationErrors{
  //   const start=control.get('startDate')
  //   const end=control.get('endDate')
  //   return start.valid !== null && end.valid !=null && start.valid<end.valid ? null :{dateValid:true}
  // }
  dateLessThan(from: string, to: string) {
    return (group: UntypedFormGroup): {[key: string]: any} => {
      let f = group.controls[from];
      let t = group.controls[to];
      if (f.value > t.value) {
        return {
          dates: "Date from should be less than Date to"
        };
      }
      return {};
    }
}
  addPrice(content){
    this.setvalue(null);
    this.pageTitle = 'Add Price';
    this.btntext = 'Save';
    this.modalReference=  this.modalService.open(content, { windowClass: 'modal-right price-modal', size: 'xl', scrollable: true });
  }
  goBack(){
    this.location.back();
  }
  setvalue(res) {
    const coursePriceType = (res?.coursePriceType ?? (res?.originalPrice === 0 && res?.discountedPrice === 0 ? 'free' : 'paid')) as string;
    this.priceForm.patchValue({
      id: res?.id ? res.id : this.guid,
      coursePriceType: coursePriceType === 'free' ? 'free' : 'paid',
      originalPrice: res?.originalPrice ?? 0,
      discountedPrice: res?.discountedPrice ?? 0,
      courseId: res?.courseId ?? this.courseId,
      startDate: res?.startDate ? this.datePipe.transform(res.startDate, 'yyyy-MM-dd') : this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      endDate: res?.endDate ? this.datePipe.transform(res.endDate, 'yyyy-MM-dd') : this.datePipe.transform(new Date(), 'yyyy-MM-dd')
    }, { emitEvent: true });
  }
  get f() { return this.priceForm.controls; }
  onSubmit() {
    this.submitted = true;
    const isFree = this.f.coursePriceType?.value === 'free';
    if (isFree) {
      this.priceForm.patchValue({
        originalPrice: 0,
        discountedPrice: 0,
        startDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
        endDate: this.datePipe.transform(new Date(), 'yyyy-MM-dd')
      });
    } else {
      if (this.discountPriceError) {
        this.toasterService.showError('Discounted Price must be lower than Original Price');
        return;
      }
      if (this.dateRangeError) {
        this.toasterService.showError('Discount End Date must be after Start Date');
        return;
      }
      const start = this.f.startDate.value;
      const end = this.f.endDate.value;
      if (start && end && start > end) {
        this.toasterService.showError('End date must be after Start date');
        return;
      }
    }
    if (this.priceForm.invalid && !isFree) {
      return;
    }
    const payload = {
      ...this.priceForm.value,
      courseId: this.courseId || this.f.courseId.value,
      originalPrice: isFree ? 0 : Number(this.f.originalPrice.value) || 0,
      discountedPrice: isFree ? 0 : Number(this.f.discountedPrice.value) || 0,
      startDate: this.f.startDate.value || this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      endDate: this.f.endDate.value || this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      coursePriceType: isFree ? 'free' : 'paid'
    };
    if (this.f.id.value !== this.guid) {
      this.subscription.add(this.appService.updateCoursePrices(payload, this.f.id.value).subscribe(() => {
        this.toasterService.showSuccess('Price updated successfully');
        this.modalReference.close();
        this.getAllPricesByCourseId(this.courseId);
      }));
    } else {
      this.subscription.add(this.appService.addCoursePrices(this.courseId, payload).subscribe(() => {
        this.toasterService.showSuccess('Price created successfully');
        this.modalReference.close();
        this.getAllPricesByCourseId(this.courseId);
      }));
    }
  }
  getAllPricesByCourseId(id) {
    this.subscription.add(this.appService.getCoursePrices(id).subscribe((res: any) => {
      if (res) {
        this.prices = res;
      }
    }));
  }
  updatePrice(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Price';
    this.btntext = 'Update';
 this.modalReference=   this.modalService.open(content, { windowClass: 'modal-right price-modal', size: 'xl', scrollable: true });
  }
  deletePrice(id){
this.open(id);
  }
  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Question Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCoursePrices(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Question deleted successfully');
              this.getAllPricesByCourseId(this.courseId);
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }
}
