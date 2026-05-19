import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, first } from 'rxjs/operators';
import { AuthenticationService } from '../../auth/auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { jsonProp } from 'src/app/core/api-json.util';
import { UserFormDialogComponent } from './user-form-dialog.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Role } from 'src/app/shared/models/role';

export interface CompanyEmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePictureUrl: string;
  employeeCode: string;
  department: string;
  designation: string;
  roleId: number;
  roleName: string;
  isActive: boolean | null;
  lastLoggedIn: string | null;
  createdOn: string;
  authType: number;
  authTypeLabel: string;
  activationStatus: number;
  activationStatusLabel: string;
  ssoProviderLabel: string;
  lastSyncedAt: string | null;
}

@Component({
  selector: 'app-company-users',
  templateUrl: './company-users.component.html',
  styleUrls: ['./company-users.component.scss'],
  standalone: false
})
export class CompanyUsersComponent implements OnInit, OnDestroy {
  @ViewChild('viewTpl') viewTpl!: TemplateRef<unknown>;
  @ViewChild('resetTpl') resetTpl!: TemplateRef<unknown>;

  readonly studentRoleId = Role.Student;

  loading = false;
  rows: CompanyEmployeeRow[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];

  searchInput = '';
  private readonly search$ = new Subject<string>();
  private sub = new Subscription();

  filterDepartment = '';
  filterRoleId: number | null = null;
  filterActive: '' | 'true' | 'false' = '';

  sortProperty = 'LastName';
  sortAsc = true;

  viewUser: CompanyEmployeeRow | null = null;
  resetUser: CompanyEmployeeRow | null = null;
  resetForm: FormGroup;

  constructor(
    private readonly auth: AuthenticationService,
    private readonly modal: NgbModal,
    private readonly toaster: ToasterService,
    private readonly fb: FormBuilder
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.sub.add(
      this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
        this.page = 1;
        this.load();
      })
    );
    this.load();
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
    if (this.filterRoleId != null && this.filterRoleId === this.studentRoleId) {
      p = p.set('Filter.RoleId', String(this.filterRoleId));
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
        .listCompanyUsers(this.buildParams())
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
            this.toaster.showError('Could not load users.');
          }
        })
    );
  }

  private mapRow(x: Record<string, unknown>): CompanyEmployeeRow {
    const id = String(jsonProp(x, 'Id', 'id') ?? '');
    return {
      id,
      firstName: String(jsonProp(x, 'FirstName', 'firstName') ?? ''),
      lastName: String(jsonProp(x, 'LastName', 'lastName') ?? ''),
      email: String(jsonProp(x, 'Email', 'email') ?? ''),
      phone: String(jsonProp(x, 'Phone', 'phone') ?? ''),
      profilePictureUrl: String(jsonProp(x, 'ProfilePictureUrl', 'profilePictureUrl') ?? ''),
      employeeCode: String(jsonProp(x, 'EmployeeCode', 'employeeCode') ?? ''),
      department: String(jsonProp(x, 'Department', 'department') ?? ''),
      designation: String(jsonProp(x, 'Designation', 'designation') ?? ''),
      roleId: Number(jsonProp(x, 'RoleId', 'roleId') ?? 0),
      roleName: String(jsonProp(x, 'RoleName', 'roleName') ?? ''),
      isActive: (jsonProp<boolean | null>(x, 'IsActive', 'isActive') as boolean | null) ?? null,
      lastLoggedIn: (jsonProp(x, 'LastLoggedIn', 'lastLoggedIn') as string | null) ?? null,
      createdOn: String(jsonProp(x, 'CreatedOn', 'createdOn') ?? ''),
      authType: Number(jsonProp(x, 'AuthType', 'authType') ?? 0),
      authTypeLabel: String(jsonProp(x, 'AuthTypeLabel', 'authTypeLabel') ?? ''),
      activationStatus: Number(jsonProp(x, 'ActivationStatus', 'activationStatus') ?? 1),
      activationStatusLabel: String(jsonProp(x, 'ActivationStatusLabel', 'activationStatusLabel') ?? ''),
      ssoProviderLabel: String(jsonProp(x, 'SsoProviderLabel', 'ssoProviderLabel') ?? ''),
      lastSyncedAt: (jsonProp(x, 'LastSyncedAt', 'lastSyncedAt') as string | null) ?? null
    };
  }

  openAdd(): void {
    const ref = this.modal.open(UserFormDialogComponent, { size: 'lg', centered: true, scrollable: true });
    ref.componentInstance.mode = 'create';
    ref.result.then(
      (v) => {
        if (v === 'saved') {
          this.load();
        }
      },
      () => {}
    );
  }

  openEdit(row: CompanyEmployeeRow): void {
    const ref = this.modal.open(UserFormDialogComponent, { size: 'lg', centered: true, scrollable: true });
    ref.componentInstance.mode = 'edit';
    ref.componentInstance.userId = row.id;
    ref.result.then(
      (v) => {
        if (v === 'saved') {
          this.load();
        }
      },
      () => {}
    );
  }

  openView(row: CompanyEmployeeRow): void {
    this.viewUser = row;
    this.modal.open(this.viewTpl, { size: 'md', centered: true });
  }

  confirmDelete(row: CompanyEmployeeRow): void {
    const ref = this.modal.open(ConfirmationModalComponent);
    ref.componentInstance.title = 'Remove user';
    ref.componentInstance.descText = `Delete ${row.email}? This cannot be undone.`;
    ref.result.then(
      (result) => {
        if (result === 'ok') {
          this.auth
            .deleteCompanyUser(row.id)
            .pipe(first())
            .subscribe({
              next: () => {
                this.toaster.showSuccess('User deleted.');
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

  disableUser(row: CompanyEmployeeRow): void {
    const body = {
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone || null,
      department: row.department || null,
      designation: row.designation || null,
      employeeCode: row.employeeCode || null,
      roleId: this.studentRoleId,
      isActive: false
    };
    this.auth
      .updateCompanyUser(row.id, body)
      .pipe(first())
      .subscribe({
        next: () => {
          this.toaster.showSuccess('User disabled.');
          this.load();
        },
        error: (err) => {
          const m = err?.error?.messages?.[0] ?? err?.error?.Messages?.[0] ?? 'Update failed.';
          this.toaster.showError(m);
        }
      });
  }

  openReset(row: CompanyEmployeeRow): void {
    this.resetUser = row;
    this.resetForm.reset({ newPassword: '' });
    this.modal.open(this.resetTpl, { centered: true });
  }

  submitReset(modal: { close: () => void }): void {
    if (this.resetForm.invalid || !this.resetUser) {
      this.resetForm.markAllAsTouched();
      return;
    }
    const pwd = String(this.resetForm.value.newPassword ?? '');
    this.auth
      .resetCompanyUserPassword(this.resetUser.id, { newPassword: pwd })
      .pipe(first())
      .subscribe({
        next: () => {
          this.toaster.showSuccess('Password updated.');
          modal.close();
          this.load();
        },
        error: (err) => {
          const m = err?.error?.messages?.[0] ?? err?.error?.Messages?.[0] ?? 'Reset failed.';
          this.toaster.showError(m);
        }
      });
  }

  exportCsv(): void {
    let p = new HttpParams();
    if (this.searchInput.trim()) {
      p = p.set('Search', this.searchInput.trim());
    }
    if (this.filterDepartment.trim()) {
      p = p.set('Department', this.filterDepartment.trim());
    }
    if (this.filterRoleId != null && this.filterRoleId === this.studentRoleId) {
      p = p.set('RoleId', String(this.filterRoleId));
    }
    if (this.filterActive === 'true' || this.filterActive === 'false') {
      p = p.set('IsActive', this.filterActive === 'true' ? 'true' : 'false');
    }
    this.sub.add(
      this.auth.exportCompanyUsersCsv(p).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'company-users.csv';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.toaster.showError('Export failed.')
      })
    );
  }

  onImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv')) {
      this.toaster.showError('Please upload a .csv file (Excel: Save As CSV).');
      return;
    }
    const fd = new FormData();
    fd.append('file', file, file.name);
    this.auth
      .importCompanyUsersCsv(fd)
      .pipe(first())
      .subscribe({
        next: (res) => {
          const imported = Number((res as { imported?: number })?.imported ?? (res as { Imported?: number })?.Imported ?? 0);
          const errors = (res as { errors?: string[] })?.errors ?? (res as { Errors?: string[] })?.Errors ?? [];
          this.toaster.showSuccess(`Imported ${imported} user(s).`);
          if (errors.length) {
            this.toaster.showError(errors.slice(0, 3).join(' '));
          }
          this.load();
        },
        error: () => this.toaster.showError('Import failed.')
      });
  }

  fullName(row: CompanyEmployeeRow): string {
    return `${row.firstName} ${row.lastName}`.trim();
  }

  statusLabel(row: CompanyEmployeeRow): string {
    if (row.activationStatus === 0) {
      return 'Pending SSO';
    }
    if (row.isActive === true) {
      return 'Active';
    }
    if (row.isActive === false) {
      return 'Inactive';
    }
    return '—';
  }
}
