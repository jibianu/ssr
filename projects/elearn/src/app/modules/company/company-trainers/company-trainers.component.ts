import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, first } from 'rxjs/operators';
import { AuthenticationService } from '../../auth/auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { jsonProp } from 'src/app/core/api-json.util';

export interface CompanyTrainerRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePictureUrl: string;
  department: string;
  designation: string;
  expertise: string;
  assignedCoursesCount: number;
  webinarsCount: number;
  isActive: boolean | null;
  lastLoggedIn: string | null;
  createdOn: string;
}

export interface CompanyContentPermRequestRow {
  id: string;
  userId: string;
  contentType: string;
  userEmail: string;
  userName: string;
  requestedAt: string;
}

@Component({
  selector: 'app-company-trainers',
  templateUrl: './company-trainers.component.html',
  styleUrls: ['../company-users/company-users.component.scss', './company-trainers.component.scss'],
  standalone: false
})
export class CompanyTrainersComponent implements OnInit, OnDestroy {
  loading = false;
  rows: CompanyTrainerRow[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];

  searchInput = '';
  private readonly search$ = new Subject<string>();
  private sub = new Subscription();

  filterDepartment = '';
  filterActive: '' | 'true' | 'false' = '';

  trainerDrawerOpen = false;
  trainerDrawerMode: 'create' | 'edit' = 'create';
  trainerDrawerTrainerId: string | null = null;

  contentPermLoading = false;
  contentPermRequests: CompanyContentPermRequestRow[] = [];

  sortProperty = 'LastName';
  sortAsc = true;

  constructor(
    private readonly auth: AuthenticationService,
    private readonly modal: NgbModal,
    private readonly toaster: ToasterService
  ) {}

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.trainerDrawerOpen) {
      e.preventDefault();
      this.closeTrainerDrawer();
    }
  }

  ngOnInit(): void {
    this.sub.add(
      this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
        this.page = 1;
        this.load();
      })
    );
    this.load();
    this.loadContentPermissionRequests();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onSearchChange(v: string): void {
    this.searchInput = v;
    this.search$.next(v.trim());
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  setPage(n: number): void {
    this.page = n;
    this.load();
  }

  setPageSize(n: number): void {
    this.pageSize = n;
    this.page = 1;
    this.load();
  }

  toggleSort(prop: string): void {
    if (this.sortProperty === prop) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortProperty = prop;
      this.sortAsc = true;
    }
    this.load();
  }

  fullName(row: CompanyTrainerRow): string {
    const n = `${row.firstName || ''} ${row.lastName || ''}`.trim();
    return n || row.email || '—';
  }

  statusLabel(row: CompanyTrainerRow): string {
    if (row.isActive === false) return 'Inactive';
    return 'Active';
  }

  private buildParams(): HttpParams {
    let p = new HttpParams()
      .set('PageNumber', String(this.page))
      .set('PageSize', String(this.pageSize))
      .set('Sort.PropertyName', this.sortProperty)
      .set('Sort.IsAscending', String(this.sortAsc));
    if (this.searchInput.trim()) {
      p = p.set('Filter.Search', this.searchInput.trim());
    }
    if (this.filterDepartment.trim()) {
      p = p.set('Filter.Department', this.filterDepartment.trim());
    }
    if (this.filterActive === 'true' || this.filterActive === 'false') {
      p = p.set('Filter.IsActive', this.filterActive === 'true' ? 'true' : 'false');
    }
    return p;
  }

  load(): void {
    this.loading = true;
    this.sub.add(
      this.auth
        .listCompanyTrainers(this.buildParams())
        .pipe(first())
        .subscribe({
          next: (res) => {
            const rec = res as Record<string, unknown>;
            this.total = Number(jsonProp<number>(rec, 'TotalNumberOfRecords', 'totalNumberOfRecords') ?? 0);
            const raw = jsonProp<unknown[]>(rec, 'Results', 'results') ?? [];
            this.rows = (raw as Record<string, unknown>[]).map((x) => this.mapRow(x));
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.toaster.showError('Could not load trainers.');
          }
        })
    );
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  private mapRow(x: Record<string, unknown>): CompanyTrainerRow {
    return {
      id: String(jsonProp(x, 'Id', 'id') ?? ''),
      firstName: String(jsonProp(x, 'FirstName', 'firstName') ?? ''),
      lastName: String(jsonProp(x, 'LastName', 'lastName') ?? ''),
      email: String(jsonProp(x, 'Email', 'email') ?? ''),
      phone: String(jsonProp(x, 'Phone', 'phone') ?? ''),
      profilePictureUrl: String(jsonProp(x, 'ProfilePictureUrl', 'profilePictureUrl') ?? ''),
      department: String(jsonProp(x, 'Department', 'department') ?? ''),
      designation: String(jsonProp(x, 'Designation', 'designation') ?? ''),
      expertise: String(jsonProp(x, 'Expertise', 'expertise') ?? ''),
      assignedCoursesCount: Number(jsonProp(x, 'AssignedCoursesCount', 'assignedCoursesCount') ?? 0),
      webinarsCount: Number(jsonProp(x, 'WebinarsCount', 'webinarsCount') ?? 0),
      isActive: (jsonProp<boolean | null>(x, 'IsActive', 'isActive') as boolean | null) ?? null,
      lastLoggedIn: (jsonProp(x, 'LastLoggedIn', 'lastLoggedIn') as string | null) ?? null,
      createdOn: String(jsonProp(x, 'CreatedOn', 'createdOn') ?? '')
    };
  }

  openAdd(): void {
    this.trainerDrawerMode = 'create';
    this.trainerDrawerTrainerId = null;
    this.trainerDrawerOpen = true;
  }

  openEdit(row: CompanyTrainerRow): void {
    this.trainerDrawerMode = 'edit';
    this.trainerDrawerTrainerId = row.id;
    this.trainerDrawerOpen = true;
  }

  closeTrainerDrawer(): void {
    this.trainerDrawerOpen = false;
    this.trainerDrawerTrainerId = null;
  }

  onTrainerSaved(): void {
    this.closeTrainerDrawer();
    this.load();
    this.loadContentPermissionRequests();
  }

  loadContentPermissionRequests(): void {
    this.contentPermLoading = true;
    this.sub.add(
      this.auth.listCompanyContentPermissionRequests(0).pipe(first()).subscribe({
        next: (list) => {
          const arr = Array.isArray(list) ? list : [];
          this.contentPermRequests = (arr as Record<string, unknown>[]).map((x) => this.mapContentPermRow(x));
          this.contentPermLoading = false;
        },
        error: () => {
          this.contentPermRequests = [];
          this.contentPermLoading = false;
        }
      })
    );
  }

  private mapContentPermRow(x: Record<string, unknown>): CompanyContentPermRequestRow {
    return {
      id: String(jsonProp(x, 'Id', 'id') ?? ''),
      userId: String(jsonProp(x, 'UserId', 'userId') ?? ''),
      contentType: String(jsonProp(x, 'ContentType', 'contentType') ?? ''),
      userEmail: String(jsonProp(x, 'UserEmail', 'userEmail') ?? ''),
      userName: String(jsonProp(x, 'UserName', 'userName') ?? ''),
      requestedAt: String(jsonProp(x, 'RequestedAt', 'requestedAt') ?? '')
    };
  }

  approveContentPerm(row: CompanyContentPermRequestRow): void {
    this.sub.add(
      this.auth
        .approveCompanyContentPermissionRequest(row.id)
        .pipe(first())
        .subscribe({
          next: () => {
            this.toaster.showSuccess('Permission approved.');
            this.loadContentPermissionRequests();
          },
          error: (err) => {
            const m = err?.error?.message ?? err?.error?.Message ?? 'Approve failed.';
            this.toaster.showError(m);
          }
        })
    );
  }

  rejectContentPerm(row: CompanyContentPermRequestRow): void {
    this.sub.add(
      this.auth
        .rejectCompanyContentPermissionRequest(row.id)
        .pipe(first())
        .subscribe({
          next: () => {
            this.toaster.showSuccess('Request rejected.');
            this.loadContentPermissionRequests();
          },
          error: (err) => {
            const m = err?.error?.message ?? err?.error?.Message ?? 'Reject failed.';
            this.toaster.showError(m);
          }
        })
    );
  }

  disableTrainer(row: CompanyTrainerRow): void {
    const body = {
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone || null,
      department: row.department || null,
      designation: row.designation || null,
      expertise: row.expertise || null,
      bio: null,
      profilePictureUrl: row.profilePictureUrl || null,
      isActive: false
    };
    this.auth
      .updateCompanyTrainer(row.id, body)
      .pipe(first())
      .subscribe({
        next: () => {
          this.toaster.showSuccess('Trainer disabled.');
          this.load();
        },
        error: (err) => {
          const m = err?.error?.messages?.[0] ?? err?.error?.Messages?.[0] ?? 'Update failed.';
          this.toaster.showError(m);
        }
      });
  }

  confirmDelete(row: CompanyTrainerRow): void {
    const ref = this.modal.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Remove trainer';
    ref.componentInstance.descText = `Delete ${row.email}? This cannot be undone.`;
    ref.result.then(
      (result) => {
        if (result === 'ok') {
          this.auth
            .deleteCompanyTrainer(row.id)
            .pipe(first())
            .subscribe({
              next: () => {
                this.toaster.showSuccess('Trainer deleted.');
                this.load();
              },
              error: (err) => {
                const m = err?.error?.messages?.[0] ?? err?.error?.Messages?.[0] ?? 'Delete failed.';
                this.toaster.showError(m);
              }
            });
        }
      },
      () => {}
    );
  }

  exportCsv(): void {
    let p = new HttpParams();
    if (this.searchInput.trim()) {
      p = p.set('Search', this.searchInput.trim());
    }
    if (this.filterDepartment.trim()) {
      p = p.set('Department', this.filterDepartment.trim());
    }
    if (this.filterActive === 'true' || this.filterActive === 'false') {
      p = p.set('IsActive', this.filterActive === 'true' ? 'true' : 'false');
    }
    this.sub.add(
      this.auth.exportCompanyTrainersCsv(p).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'company-trainers.csv';
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => this.toaster.showError('Export failed.')
      })
    );
  }
}
