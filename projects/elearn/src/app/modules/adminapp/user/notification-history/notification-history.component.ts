import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from '../../adminapp.service';
import { SidebarToggleService } from '../../../../core/services/sidebar-toggle.service';
import { SendNotificationComponent } from '../send-notification/send-notification.component';

@Component({
  selector: 'app-notification-history',
  templateUrl: './notification-history.component.html',
  styleUrls: ['./notification-history.component.scss'],
  standalone: false
})
export class NotificationHistoryComponent implements OnInit {
  items: any[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 20;
  loading = true;
  loadError = '';

  filterTitle = '';
  filterType = '';
  filterSendTo = '';
  filterFromDate = '';
  filterToDate = '';

  /** Side panel (navbar) open state; when true, viewDetail is set and panel is visible. */
  panelOpen = false;
  viewDetail: any = null;
  editForm: FormGroup;
  panelSaving = false;
  panelDeleting = false;
  panelMessage = '';
  panelError = '';
  viewModalRef: any;
  /** True when NotificationHistory table is missing; run Add_Notification_Tables.sql to fix. */
  requiresMigration = false;

  constructor(
    private fb: FormBuilder,
    private appService: AdminAppService,
    private sidebarToggle: SidebarToggleService,
    private modalService: NgbModal
  ) {
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      message: [''],
      type: ['offer', [Validators.required]],
      linkUrl: [''],
      sendTo: ['all_students'],
      createdAt: ['']
    });
  }

  /** Format date for datetime-local input (yyyy-MM-ddTHH:mm). */
  toDateTimeLocal(d: Date | string | null | undefined): string {
    if (d == null) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    const params: any = {
      pageNumber: this.page,
      pageSize: this.pageSize,
      sortPropertyName: 'CreatedAt',
      sortIsAscending: false
    };
    if (this.filterTitle && this.filterTitle.trim()) params.title = this.filterTitle.trim();
    if (this.filterType && this.filterType.trim()) params.type = this.filterType.trim();
    if (this.filterSendTo && this.filterSendTo.trim()) params.sendTo = this.filterSendTo.trim();
    if (this.filterFromDate && this.filterFromDate.trim()) params.fromDate = this.filterFromDate.trim();
    if (this.filterToDate && this.filterToDate.trim()) params.toDate = this.filterToDate.trim();

    this.appService.getNotificationHistory(params).subscribe({
      next: (res: any) => {
        const raw = res?.items ?? res?.Items ?? [];
        this.items = Array.isArray(raw) ? raw : [];
        const count = res?.totalCount ?? res?.TotalCount ?? 0;
        this.totalCount = typeof count === 'number' ? count : parseInt(String(count), 10) || 0;
        this.requiresMigration = res?.requiresMigration === true;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.items = [];
        this.totalCount = 0;
        this.requiresMigration = false;
        const msg = err?.error?.message || err?.message || err?.statusText;
        this.loadError = msg ? `Could not load notification history: ${msg}` : 'Could not load notification history.';
      }
    });
  }

  onFilter(): void {
    this.page = 1;
    this.load();
  }

  openMenu(): void {
    this.sidebarToggle.requestOpen();
    this.openSendPanel();
  }

  openSendPanel(): void {
    const ref = this.modalService.open(SendNotificationComponent, {
      windowClass: 'modal-right send-notification-modal-panel',
      size: 'xl',
      scrollable: true
    });
    ref.result.then(() => this.load(), () => {});
  }

  onPageChange(p: number): void {
    this.page = p;
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.load();
  }

  getSendToDisplay(item: any): string {
    const sendTo = (item.sendTo || item.SendTo || '').toLowerCase();
    if (sendTo === 'all_students') return 'All Students';
    if (sendTo === 'by_category') return item.categoryName || item.CategoryName || 'Category';
    return item.categoryName || item.CategoryName || (sendTo ? sendTo : '—');
  }

  openViewPanel(item: any): void {
    this.viewDetail = item;
    const sendTo = (item.sendTo || item.SendTo || 'all_students').toLowerCase();
    this.editForm.patchValue({
      title: item.title || item.Title || '',
      message: item.message || item.Message || '',
      type: (item.type || item.Type || 'offer').toLowerCase(),
      linkUrl: item.linkUrl || item.LinkUrl || '',
      sendTo: sendTo === 'by_category' ? 'by_category' : 'all_students',
      createdAt: this.toDateTimeLocal(item.createdAt || item.CreatedAt)
    });
    this.panelMessage = '';
    this.panelError = '';
    this.panelOpen = true;
  }

  deleteFromTable(item: any): void {
    const id = item.id || item.Id;
    if (!id) return;
    if (!confirm('Delete this notification? It will also be removed from all students\' notification lists.')) return;
    this.appService.deleteNotificationHistory(id).subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  closeViewPanel(): void {
    this.panelOpen = false;
    this.viewDetail = null;
    this.panelMessage = '';
    this.panelError = '';
  }

  onUpdate(): void {
    if (!this.viewDetail || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const id = this.viewDetail.id || this.viewDetail.Id;
    if (!id) return;
    this.panelError = '';
    this.panelMessage = '';
    this.panelSaving = true;
    const value = this.editForm.getRawValue();
    const sendTo = (value.sendTo || 'all_students').toLowerCase();
    const body: any = {
      title: value.title?.trim() || '',
      message: value.message?.trim() || '',
      type: (value.type || 'offer').toLowerCase(),
      linkUrl: value.linkUrl?.trim() || undefined,
      sendTo,
      categoryId: sendTo === 'by_category' ? (this.viewDetail.categoryId || this.viewDetail.CategoryId) : undefined,
      createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : undefined
    };
    this.appService.updateNotificationHistory(id, body).subscribe({
      next: () => {
        this.panelSaving = false;
        this.panelMessage = 'Notification updated.';
        this.load();
        this.viewDetail = { ...this.viewDetail, ...value, title: value.title, message: value.message, type: value.type, linkUrl: value.linkUrl, sendTo, createdAt: value.createdAt };
      },
      error: (err) => {
        this.panelSaving = false;
        this.panelError = err?.error?.message || err?.message || 'Update failed.';
      }
    });
  }

  onDelete(): void {
    if (!this.viewDetail) return;
    const id = this.viewDetail.id || this.viewDetail.Id;
    if (!id) return;
    if (!confirm('Delete this notification from history? This cannot be undone.')) return;
    this.panelError = '';
    this.panelMessage = '';
    this.panelDeleting = true;
    this.appService.deleteNotificationHistory(id).subscribe({
      next: () => {
        this.panelDeleting = false;
        this.closeViewPanel();
        this.load();
      },
      error: (err) => {
        this.panelDeleting = false;
        this.panelError = err?.error?.message || err?.message || 'Delete failed.';
      }
    });
  }
}
