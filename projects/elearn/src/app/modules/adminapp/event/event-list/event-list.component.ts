import { Component, OnDestroy, OnInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ChangeProgressComponent } from 'src/app/shared/modals/change-progress/change-progress.component';
import { AdminAppService } from '../../adminapp.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

function norm(e: any): any {
  const id = e?.id ?? e?.Id;
  const rawPct = e?.completionPercent ?? e?.CompletionPercent;
  const completionPercent = rawPct != null ? Math.min(100, Math.max(0, Number(rawPct))) : 0;
  return {
    id: id != null ? String(id) : '',
    title: e?.title ?? e?.Title ?? '—',
    startDate: e?.startDate ?? e?.StartDate,
    endDate: e?.endDate ?? e?.EndDate,
    location: e?.location ?? e?.Location ?? '',
    isPublished: e?.isPublished ?? e?.IsPublished ?? false,
    completionPercent
  };
}

function toEventsArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const arr = data.data ?? data.events ?? data.items ?? data.Events ?? data.Data;
    return Array.isArray(arr) ? arr : [];
  }
  return [];
}

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  standalone: false
})
export class EventListComponent implements OnInit, OnDestroy {
  events: any[] = [];
  filteredEvents: any[] = [];
  loading = true;
  error: string | null = null;
  term = '';
  sortDir = 1;
  deletingId: string | null = null;
  publishingId: string | null = null;
  config: any = { itemsPerPage: 5, currentPage: 1 };
  tableSizes = [5, 10, 25, 50];

  // Registrations: admin = side drawer with full details; trainer = modal with count only
  registrationEventTitle = '';
  registrationUsers: any[] = [];
  registrationCount = 0;
  registrationLoading = false;
  registrationError: string | null = null;
  registrationsDrawerOpen = false;
  private registrationModalRef: any = null;

  /** Event id -> registration count (for View registrations). */
  registrationCountByEventId: Record<string, number> = {};

  @ViewChild('registrationsModalTpl') private modalTemplateRef!: TemplateRef<any>;

  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private router: Router
  ) {}

  /** Base path for event routes: /app/trainer/events when in trainer area, else /app/admin/events */
  get eventsBasePath(): string {
    const url = this.router?.url ?? '';
    return url.includes('/trainer/events') ? '/app/trainer/events' : '/app/admin/events';
  }

  /** True when viewing the event list in the trainer area (hide search row and Edit/View actions). */
  get isTrainerPage(): boolean {
    return (this.router?.url ?? '').includes('/trainer/events');
  }

  ngOnInit(): void {
    this.sharedService.certificateName.next('Event List');
    this.sharedService.topbarPrimaryAction.next({
      routerLink: this.eventsBasePath + '/add',
      label: 'Add Event',
      icon: 'fa-plus'
    });
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.sharedService.topbarPrimaryAction.next(null);
    this.sharedService.certificateName.next('');
  }

  loadEvents(): void {
    this.loading = true;
    this.error = null;
    this.appService.getEvents().subscribe({
      next: (data) => {
        const raw = toEventsArray(data);
        this.events = (raw || []).map(norm).filter((e) => e.id !== '');
        this.applyFilter();
        this.loadRegistrationCounts();
        this.loading = false;
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.error?.Message
          ?? (Array.isArray(err?.error?.messages) ? err.error.messages.join(', ') : null)
          ?? (Array.isArray(err?.error?.Messages) ? err.error.Messages.join(', ') : null)
          ?? err?.message ?? err?.statusText ?? 'Failed to load events.';
        this.error = msg;
        this.events = [];
        this.filteredEvents = [];
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.term?.trim()) {
      this.filteredEvents = [...this.events];
    } else {
      const q = this.term.toLowerCase();
      this.filteredEvents = this.events.filter(
        (e) =>
          (e.title && String(e.title).toLowerCase().includes(q)) ||
          (e.startDate && String(e.startDate).toLowerCase().includes(q)) ||
          (e.endDate && String(e.endDate).toLowerCase().includes(q))
      );
    }
  }

  onSearchChange(): void {
    this.applyFilter();
    this.config.currentPage = 1;
  }

  onSortClick(): void {
    this.sortDir = -this.sortDir;
    this.filteredEvents.sort((a, b) => {
      const t1 = (a.title || '').toLowerCase();
      const t2 = (b.title || '').toLowerCase();
      return this.sortDir * t1.localeCompare(t2);
    });
  }

  pageChanged(page: number): void {
    this.config.currentPage = page;
  }

  onTableSizeChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.config.itemsPerPage = Number(val);
    this.config.currentPage = 1;
  }

  trackByEventId(_index: number, item: any): string {
    return item?.id ?? '';
  }

  trackByTableSize(_index: number, size: number): number {
    return size;
  }

  deleteEvent(id: string): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Event Deletion';
    modalRef.componentInstance.descText =
      '<strong>Are you sure you want to delete this event?</strong><br><br>This will permanently delete the event and associated data.';
    modalRef.result.then(
      (result) => {
        if (result === 'ok') this.deleteEventConfirmed(id);
      },
      () => {}
    );
  }

  deleteEventConfirmed(id: string): void {
    if (this.deletingId === id) return;
    this.deletingId = id;
    this.appService.deleteEvent(id).subscribe({
      next: () => {
        this.events = this.events.filter((e) => (e.id ?? e.Id) !== id);
        this.applyFilter();
        this.deletingId = null;
        this.toasterService.showSuccess('Event deleted successfully');
      },
      error: (err) => {
        this.deletingId = null;
        const msg =
          err?.error?.message || err?.message || 'Failed to delete event.';
        this.toasterService.showError(msg);
      }
    });
  }

  isDeleting(id: string): boolean {
    return this.deletingId === id;
  }

  setPublishStatus(item: any, isPublished: boolean): void {
    const id = item?.id ?? item?.Id;
    if (!id) return;
    this.publishingId = id;
    this.appService.setEventPublishStatus(String(id), isPublished).subscribe({
      next: () => {
        const ev = this.events.find((e) => (e.id ?? e.Id) === id);
        if (ev) ev.isPublished = isPublished;
        this.applyFilter();
        this.publishingId = null;
        this.toasterService.showSuccess(isPublished ? 'Event published. It will show on the site and elearn pages.' : 'Event unpublished.');
      },
      error: (err) => {
        this.publishingId = null;
        const msg = err?.error?.message ?? err?.message ?? 'Failed to update publish status.';
        this.toasterService.showError(msg);
      }
    });
  }

  isPublishing(id: string): boolean {
    return this.publishingId === id;
  }

  /** Event id for which registrations are currently open (used to refresh progress on close). */
  registrationEventId: string | null = null;

  openRegistrationsModal(item: any): void {
    const eventId = item?.id ?? item?.Id;
    if (!eventId) return;
    this.registrationEventId = String(eventId);
    this.registrationEventTitle = item?.title ?? item?.Title ?? 'Event';
    this.registrationUsers = [];
    this.registrationCount = 0;
    this.registrationError = null;
    this.registrationLoading = true;

    if (this.isTrainerPage) {
      const modalTpl = this.modalTemplateRef;
      if (modalTpl) {
        this.registrationModalRef = this.modalService.open(modalTpl, {
          size: 'lg',
          scrollable: true,
          backdrop: 'static'
        });
      }
    } else {
      this.registrationsDrawerOpen = true;
    }

    this.appService.getEventUsers(String(eventId)).subscribe({
      next: (response: any) => {
        const list = Array.isArray(response)
          ? response
          : (response?.data ?? response?.items ?? response?.Items ?? response?.result ?? []);
        const raw = Array.isArray(list) ? list : [];
        this.registrationUsers = raw.map((u: any) => this.normalizeRegistrationUser(u));
        this.registrationCount = this.registrationUsers.length;
        this.registrationLoading = false;
        this.registrationError = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const status = err?.status;
        const msg = err?.error?.message ?? err?.message ?? 'Failed to load registrations.';
        this.registrationError = (status === 401 || status === 403) ? 'Sign in as admin to view registrations.' : msg;
        this.registrationUsers = [];
        this.registrationCount = 0;
        this.registrationLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /** Normalize API user (camelCase or PascalCase) so template always has consistent keys and Payment Ref displays. */
  private normalizeRegistrationUser(u: any): any {
    const name = u?.name ?? u?.Name ?? '—';
    const email = u?.email ?? u?.Email ?? '—';
    const mobile = u?.mobile ?? u?.Mobile ?? '—';
    const companyName = u?.companyName ?? u?.CompanyName ?? '—';
    const designation = u?.designation ?? u?.Designation ?? '—';
    const department = u?.department ?? u?.Department ?? '—';
    const paymentRefNo = u?.paymentRefNo ?? u?.PaymentRefNo ?? '';
    const isPaymentCompleted = u?.isPaymentCompleted ?? u?.IsPaymentCompleted;
    const paymentRefDisplay = (paymentRefNo && String(paymentRefNo).trim()) ? String(paymentRefNo).trim() : (isPaymentCompleted === true ? '—' : 'Free');
    return {
      name,
      email,
      mobile,
      companyName,
      designation,
      department,
      paymentRefNo: paymentRefNo || null,
      paymentRefDisplay
    };
  }

  closeRegistrationsModal(): void {
    if (this.registrationEventId && this.registrationCount !== undefined) {
      this.registrationCountByEventId[this.registrationEventId] = this.registrationCount;
    }
    this.registrationEventId = null;
    if (this.registrationModalRef) {
      this.registrationModalRef.dismiss();
      this.registrationModalRef = null;
    }
    this.registrationsDrawerOpen = false;
  }

  /** Load registration count for each event (for progress display). */
  loadRegistrationCounts(): void {
    const ids = this.events.map((e) => e?.id).filter(Boolean);
    if (ids.length === 0) return;
    const requests = ids.map((id) =>
      this.appService.getEventUsers(String(id)).pipe(
        map((res: any) => {
          const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.Items ?? res?.result ?? []);
          return Array.isArray(list) ? list.length : 0;
        }),
        catchError(() => of(0))
      )
    );
    forkJoin(requests).subscribe((counts) => {
      ids.forEach((id, i) => {
        this.registrationCountByEventId[id] = counts[i] ?? 0;
      });
    });
  }

  getRegistrationCount(eventId: string): number {
    return this.registrationCountByEventId[eventId] ?? 0;
  }

  /** Event page completion percent for display (admin-set, 0–100). */
  getProgressPercent(item: any): number {
    const pct = item?.completionPercent;
    return pct != null ? Math.min(100, Math.max(0, Number(pct))) : 0;
  }

  openProgressModal(item: any): void {
    const id = item?.id ?? item?.Id;
    if (!id) return;
    const initialPercent = this.getProgressPercent(item);
    const modalRef = this.modalService.open(ChangeProgressComponent, {
      size: 'sm',
      backdrop: 'static',
      windowClass: 'change-progress-modal'
    });
    modalRef.componentInstance.selectedProgress = initialPercent;
    modalRef.result.then(
      (pct: number | null) => {
        if (pct != null && typeof pct === 'number') {
          this.appService.setEventProgress(String(id), pct).subscribe({
            next: () => {
              const ev = this.events.find((e) => (e.id ?? e.Id) === id);
              if (ev) ev.completionPercent = pct;
              this.applyFilter();
              this.toasterService.showSuccess('Event progress updated to ' + pct + '%');
            },
            error: (err) => {
              const msg = err?.error?.message ?? err?.message ?? 'Failed to update progress.';
              this.toasterService.showError(msg);
            }
          });
        }
      },
      () => {}
    );
  }
}
