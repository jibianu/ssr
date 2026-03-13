import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-remove-from-management',
  templateUrl: './remove-from-management.component.html',
  styleUrls: ['./remove-from-management.component.scss'],
  standalone: false
})
export class RemoveFromManagementComponent implements OnInit {
  @Input() trainerId: string;
  @Input() trainerName: string;
  /** 'trainer' | 'company' | 'management' | 'student' | 'course' - determines which unmap API to call. Default: trainer */
  @Input() entityType: 'trainer' | 'company' | 'management' | 'student' | 'course' = 'trainer';
  managementList: any[] = [];
  removing = false;
  removingMappingId: string | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private appService: AdminAppService,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    const loadFn = this.entityType === 'course'
      ? this.appService.getManagementByCourse(this.trainerId)
      : this.appService.getManagementByUser(this.trainerId);
    loadFn.subscribe(res => {
      this.managementList = res || [];
    });
  }

  remove(mapping: any) {
    const mgmtName = mapping.parentUserName || mapping.parentUserId || 'this management';
    const isLast = this.managementList.length === 1;
    const entityLabel = this.entityType === 'company' ? 'company' : this.entityType === 'management' ? 'management user' : this.entityType === 'student' ? 'student' : this.entityType === 'course' ? 'course' : 'trainer';
    const confirmRef = this.modalService.open(ConfirmationModalComponent);
    confirmRef.componentInstance.title = 'Remove from Management';
    confirmRef.componentInstance.descText = isLast
      ? `This is the last management mapping for this ${entityLabel}. Remove ${entityLabel} from ${mgmtName}?`
      : `Remove this ${entityLabel} from ${mgmtName}?`;
    confirmRef.result.then(
      () => this.doRemove(mapping),
      () => {}
    );
  }

  private doRemove(mapping: any) {
    const mapId = (mapping.id || mapping.Id) as string;
    this.removing = true;
    this.removingMappingId = mapId;
    const managementUserId = mapping.parentUserId || mapping.ParentUserId;
    const apiCall = this.entityType === 'company'
      ? this.appService.unmapCompanyFromManagement(managementUserId, this.trainerId)
      : this.entityType === 'management'
        ? this.appService.unmapManagementFromManagement(managementUserId, this.trainerId)
        : this.entityType === 'student'
          ? this.appService.unmapStudentFromManagement(managementUserId, this.trainerId)
          : this.entityType === 'course'
            ? this.appService.unmapCourseFromManagement(managementUserId, this.trainerId)
            : this.appService.unmapTrainerFromManagement(managementUserId, this.trainerId);
    const successMsg = this.entityType === 'company' ? 'Company removed from management'
      : this.entityType === 'management' ? 'Management user removed'
      : this.entityType === 'student' ? 'Student removed from management'
      : this.entityType === 'course' ? 'Course removed from management' : 'Trainer removed from management';
    apiCall.subscribe({
      next: () => {
        this.toasterService.showSuccess(successMsg);
        this.managementList = this.managementList.filter(m => (m.id || m.Id) !== mapId);
        if (!this.managementList.length) this.activeModal.close('removed');
      },
      error: err => {
        this.toasterService.showError(err?.error?.message || 'Failed to remove');
      },
      complete: () => {
        this.removing = false;
        this.removingMappingId = null;
      }
    });
  }

  close() {
    this.activeModal.dismiss();
  }
}
