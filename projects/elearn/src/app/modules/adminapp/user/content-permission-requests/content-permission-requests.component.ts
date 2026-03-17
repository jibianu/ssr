import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from '../../adminapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { UserInfoComponent } from 'src/app/shared/component/user-info/user-info.component';

@Component({
  selector: 'app-content-permission-requests',
  templateUrl: './content-permission-requests.component.html',
  styleUrls: ['./content-permission-requests.component.scss'],
  standalone: false,
})
export class ContentPermissionRequestsComponent implements OnInit {
  requests: any[] = [];
  loading = true;
  loadError = '';
  actionLoading: Record<string, boolean> = {};

  constructor(
    private appService: AdminAppService,
    private toaster: ToasterService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.appService.getContentPermissionRequests(0).subscribe({
      next: (res) => {
        this.requests = this.normalizeListResponse(res);
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.message ?? err?.message ?? 'Failed to load requests.';
        this.requests = [];
        this.loading = false;
      },
    });
  }

  /** Handle API returning either an array or { data/results: array }. */
  private normalizeListResponse(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  approve(id: string): void {
    if (this.actionLoading[id]) return;
    this.actionLoading = { ...this.actionLoading, [id]: true };
    this.appService.approveContentPermissionRequest(id).subscribe({
      next: (res) => {
        this.actionLoading = { ...this.actionLoading, [id]: false };
        this.toaster.showSuccess(res?.message ?? 'Approved.');
        this.load();
      },
      error: (err) => {
        this.actionLoading = { ...this.actionLoading, [id]: false };
        this.toaster.showError(err?.error?.message ?? err?.message ?? 'Approve failed.');
      },
    });
  }

  reject(id: string): void {
    if (this.actionLoading[id]) return;
    this.actionLoading = { ...this.actionLoading, [id]: true };
    this.appService.rejectContentPermissionRequest(id).subscribe({
      next: (res) => {
        this.actionLoading = { ...this.actionLoading, [id]: false };
        this.toaster.showSuccess(res?.message ?? 'Rejected.');
        this.load();
      },
      error: (err) => {
        this.actionLoading = { ...this.actionLoading, [id]: false };
        this.toaster.showError(err?.error?.message ?? err?.message ?? 'Reject failed.');
      },
    });
  }

  /** Open the trainer's permissions page (Blog, Course, Event checkboxes + UPDATE PERMISSIONS). */
  openPermissionsPage(r: any): void {
    const userId = r?.userId ?? r?.UserId;
    if (!userId) return;
    const modalRef = this.modalService.open(UserInfoComponent, { windowClass: 'modal-right', size: 'lg' });
    modalRef.componentInstance.userID = userId;
    modalRef.componentInstance.name = r?.userName ?? r?.UserName ?? '';
    modalRef.componentInstance.email = r?.userEmail ?? r?.UserEmail ?? '';
    modalRef.result.then(() => this.load()).catch(() => {});
  }

  trackById(_index: number, item: any): string {
    return item?.id ?? '';
  }
}
