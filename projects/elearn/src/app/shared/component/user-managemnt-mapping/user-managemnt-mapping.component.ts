import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, of } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { ManagementTrainerService } from 'src/app/modules/adminapp/services/management-trainer.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
    selector: 'app-user-managemnt-mapping',
    templateUrl: './user-managemnt-mapping.component.html',
    styleUrls: ['./user-managemnt-mapping.component.scss'],
    standalone: false
})
export class UserManagemntMappingComponent implements OnInit {
  @Input() userID: any;
  @ViewChild('selectAllRef') selectAllRef: ElementRef<HTMLInputElement>;
  @Input() users: any;
  @Input() sourceRole: 'student' | 'trainer' | 'company' | 'management' | 'course' = 'trainer';
  managmentList: any[] = [];
  trainerList: any[] = [];
  companyList: any[] = [];
  managementListItems: any[] = [];
  studentList: any[] = [];
  courseList: any[] = [];
  selectedManagementId: string = null;
  submitting = false;
  loadingTrainers = false;
  loadingCompanies = false;
  loadingManagements = false;
  loadingStudents = false;
  loadingCourses = false;
  private initialMappedIds = new Set<string>();

  get itemList(): any[] {
    if (this.sourceRole === 'company') return this.companyList;
    if (this.sourceRole === 'management') return this.managementListItems;
    if (this.sourceRole === 'student') return this.studentList;
    if (this.sourceRole === 'course') return this.courseList;
    return this.trainerList;
  }
  get loadingItems(): boolean {
    if (this.sourceRole === 'company') return this.loadingCompanies;
    if (this.sourceRole === 'management') return this.loadingManagements;
    if (this.sourceRole === 'student') return this.loadingStudents;
    if (this.sourceRole === 'course') return this.loadingCourses;
    return this.loadingTrainers;
  }

  getItemLabel(capitalize = false): string {
    const label = this.sourceRole === 'company' ? 'companies' : this.sourceRole === 'management' ? 'management users' : this.sourceRole === 'student' ? 'students' : this.sourceRole === 'course' ? 'courses' : 'trainers';
    return capitalize ? (label.charAt(0).toUpperCase() + label.slice(1)) : label;
  }

  constructor(
    public activeModal: NgbActiveModal,
    private appService: AdminAppService,
    private mgmtTrainerService: ManagementTrainerService,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    const obj = { pageSize: 100 };
    this.appService.getManagement(obj).subscribe(res => {
      this.managmentList = (res.results || []).map((m: any) => ({ ...m, IsChecked: false }));
    });
  }

  onManagementSelect() {
    if (!this.selectedManagementId) {
      this.trainerList = [];
      this.companyList = [];
      this.studentList = [];
      this.courseList = [];
      return;
    }
    if (this.sourceRole === 'company') {
      this.loadCompanies();
    } else if (this.sourceRole === 'management') {
      this.loadManagements();
    } else if (this.sourceRole === 'student') {
      this.loadStudents();
    } else if (this.sourceRole === 'course') {
      this.loadCourses();
    } else {
      this.loadTrainers();
    }
  }

  private loadTrainers() {
    this.loadingTrainers = true;
    this.trainerList = [];
    const params = { pageSize: 2000, pageNumber: 1 };
    forkJoin({
      all: this.appService.getTrainers(params, true),
      mapped: this.mgmtTrainerService.getMappedTrainers(this.selectedManagementId, { pageSize: 2000 })
    }).pipe(finalize(() => { this.loadingTrainers = false; })).subscribe({
      next: ({ all, mapped }) => {
        const allItems = all?.results || [];
        const mappedIds = new Set<string>((mapped?.results || []).map((t: any) => (t.id || t.Id) as string));
        this.initialMappedIds = mappedIds;
        this.trainerList = allItems.map((t: any) => ({
          ...t,
          IsChecked: mappedIds.has((t.id || t.Id) as string)
        }));
        setTimeout(() => this.updateSelectAllIndeterminate(), 0);
      },
      error: () => this.toasterService.showError('Failed to load trainers')
    });
  }

  private loadCompanies() {
    this.loadingCompanies = true;
    this.companyList = [];
    const params = { pageSize: 2000, pageNumber: 1 };
    forkJoin({
      all: this.appService.getCompanies(params, true),
      mapped: this.appService.getMappedCompaniesForManagement(this.selectedManagementId, { pageSize: 2000 })
    }).pipe(finalize(() => { this.loadingCompanies = false; })).subscribe({
      next: ({ all, mapped }) => {
        const allItems = all?.results || [];
        const mappedIds = new Set<string>((mapped?.results || []).map((t: any) => (t.id || t.Id) as string));
        this.initialMappedIds = mappedIds;
        this.companyList = allItems.map((t: any) => ({
          ...t,
          IsChecked: mappedIds.has((t.id || t.Id) as string)
        }));
        setTimeout(() => this.updateSelectAllIndeterminate(), 0);
      },
      error: () => this.toasterService.showError('Failed to load companies')
    });
  }

  private loadStudents() {
    this.loadingStudents = true;
    this.studentList = [];
    const params = { pageSize: 2000, pageNumber: 1 };
    forkJoin({
      all: this.appService.getStudents(params, true),
      mapped: this.appService.getMappedStudentsForManagement(this.selectedManagementId, { pageSize: 2000 })
    }).pipe(finalize(() => { this.loadingStudents = false; })).subscribe({
      next: ({ all, mapped }) => {
        const allItems = all?.results || [];
        const mappedIds = new Set<string>((mapped?.results || []).map((t: any) => (t.id || t.Id) as string));
        this.initialMappedIds = mappedIds;
        this.studentList = allItems.map((t: any) => ({
          ...t,
          IsChecked: mappedIds.has((t.id || t.Id) as string)
        }));
        setTimeout(() => this.updateSelectAllIndeterminate(), 0);
      },
      error: () => this.toasterService.showError('Failed to load students')
    });
  }

  private loadCourses() {
    this.loadingCourses = true;
    this.courseList = [];
    const params: any = {
      'Filter.Title': '',
      'Sort.PropertyName': 'Title',
      'Sort.IsAscending': true,
      pageSize: 2000,
      pageNumber: 1
    };
    this.appService.GetPermissionByAction('Course.GetCourses').subscribe(hasPermission => {
      forkJoin({
        all: this.appService.getCourses(params, hasPermission),
        mapped: this.appService.getMappedCoursesForManagement(this.selectedManagementId, params).pipe(
          catchError(() => of({ results: [], totalNumberOfRecords: 0 }))
        )
      }).pipe(finalize(() => { this.loadingCourses = false; })).subscribe({
        next: ({ all, mapped }) => {
          const allItems = all?.results || all?.Results || [];
          const mappedIds = new Set<string>((mapped?.results || mapped?.Results || []).map((t: any) => (t.id || t.Id) as string));
          this.initialMappedIds = mappedIds;
          this.courseList = allItems.map((t: any) => ({
            ...t,
            IsChecked: mappedIds.has((t.id || t.Id) as string)
          }));
          setTimeout(() => this.updateSelectAllIndeterminate(), 0);
        },
        error: () => this.toasterService.showError('Failed to load courses')
      });
    });
  }

  private loadManagements() {
    this.loadingManagements = true;
    this.managementListItems = [];
    const params = { pageSize: 2000, pageNumber: 1 };
    forkJoin({
      all: this.appService.getManagement(params, true),
      mapped: this.appService.getMappedManagementsForManagement(this.selectedManagementId, { pageSize: 2000 })
    }).pipe(finalize(() => { this.loadingManagements = false; })).subscribe({
      next: ({ all, mapped }) => {
        const allItems = all?.results || [];
        const mappedIds = new Set<string>((mapped?.results || []).map((t: any) => (t.id || t.Id) as string));
        this.initialMappedIds = mappedIds;
        this.managementListItems = allItems
          .filter((t: any) => (t.id || t.Id) !== this.selectedManagementId)
          .map((t: any) => ({
            ...t,
            IsChecked: mappedIds.has((t.id || t.Id) as string)
          }));
        setTimeout(() => this.updateSelectAllIndeterminate(), 0);
      },
      error: () => this.toasterService.showError('Failed to load management users')
    });
  }

  closeModal(sendData?: any) {
    this.activeModal.close(sendData);
  }

  hasItemChanges(): boolean {
    if ((this.sourceRole !== 'trainer' && this.sourceRole !== 'company' && this.sourceRole !== 'management' && this.sourceRole !== 'student' && this.sourceRole !== 'course') || !this.selectedManagementId) return false;
    const list = this.itemList;
    for (const t of list) {
      const tid = (t.id || t.Id) as string;
      const was = this.initialMappedIds.has(tid);
      const now = !!t.IsChecked;
      if (was !== now) return true;
    }
    return false;
  }

  get allItemsSelected(): boolean {
    const list = this.itemList;
    if (!list.length) return false;
    return list.every((t: any) => !!t.IsChecked);
  }

  get someItemsSelected(): boolean {
    const list = this.itemList;
    if (!list.length) return false;
    const checked = list.filter((t: any) => !!t.IsChecked).length;
    return checked > 0 && checked < list.length;
  }

  toggleSelectAllItems(event: Event): void {
    const checked = (event.target as HTMLInputElement)?.checked ?? false;
    this.itemList.forEach((t: any) => (t.IsChecked = checked));
  }

  onItemCheckChange(): void {
    this.updateSelectAllIndeterminate();
  }

  ngAfterViewChecked(): void {
    this.updateSelectAllIndeterminate();
  }

  private updateSelectAllIndeterminate(): void {
    const el = this.selectAllRef?.nativeElement;
    if (el) el.indeterminate = this.someItemsSelected;
  }

  updateUser() {
    if (this.sourceRole === 'trainer' || this.sourceRole === 'company' || this.sourceRole === 'management' || this.sourceRole === 'student' || this.sourceRole === 'course') {
      if (!this.selectedManagementId) {
        this.toasterService.showError('Please select a Management user.');
        return;
      }
      const list = this.itemList;
      const toAdd = list
        .filter((t: any) => t.IsChecked && !this.initialMappedIds.has(t.id || t.Id))
        .map((t: any) => (t.id || t.Id) as string);
      const toRemove = list
        .filter((t: any) => !t.IsChecked && this.initialMappedIds.has(t.id || t.Id))
        .map((t: any) => (t.id || t.Id) as string);
      if (toAdd.length === 0 && toRemove.length === 0) {
        this.toasterService.showError('No changes to save.');
        return;
      }
      this.submitting = true;
      const role = this.sourceRole;
      if (role === 'management') {
        const addCall = toAdd.length ? this.appService.mapManagementsToManagement(this.selectedManagementId, toAdd) : null;
        const removeCalls = toRemove.map(id => this.appService.unmapManagementFromManagement(this.selectedManagementId, id));
        const allCalls: any[] = addCall ? [addCall, ...removeCalls] : removeCalls;
        forkJoin(allCalls).pipe(finalize(() => { this.submitting = false; })).subscribe({
          next: () => {
            this.toasterService.showSuccess('Mapping updated successfully');
            this.closeModal('saved');
          },
          error: err => this.toasterService.showError(err?.error?.message || 'Failed to update mapping')
        });
      } else if (role === 'company') {
        const addCall = toAdd.length ? this.appService.mapCompaniesToManagement(this.selectedManagementId, toAdd) : null;
        const removeCalls = toRemove.map(id => this.appService.unmapCompanyFromManagement(this.selectedManagementId, id));
        const allCalls: any[] = addCall ? [addCall, ...removeCalls] : removeCalls;
        forkJoin(allCalls).pipe(finalize(() => { this.submitting = false; })).subscribe({
          next: () => {
            this.toasterService.showSuccess('Mapping updated successfully');
            this.closeModal('saved');
          },
          error: err => this.toasterService.showError(err?.error?.message || 'Failed to update mapping')
        });
      } else if (role === 'student') {
        const addCall = toAdd.length ? this.appService.mapStudentsToManagement(this.selectedManagementId, toAdd) : null;
        const removeCalls = toRemove.map(id => this.appService.unmapStudentFromManagement(this.selectedManagementId, id));
        const allCalls: any[] = addCall ? [addCall, ...removeCalls] : removeCalls;
        forkJoin(allCalls).pipe(finalize(() => { this.submitting = false; })).subscribe({
          next: () => {
            this.toasterService.showSuccess('Mapping updated successfully');
            this.closeModal('saved');
          },
          error: err => this.toasterService.showError(err?.error?.message || 'Failed to update mapping')
        });
      } else if (role === 'course') {
        const addCall = toAdd.length ? this.appService.mapCoursesToManagement(this.selectedManagementId, toAdd) : null;
        const removeCall = toRemove.length ? this.appService.unmapCoursesFromManagement(this.selectedManagementId, toRemove) : null;
        const allCalls: any[] = [addCall, removeCall].filter(Boolean);
        (allCalls.length ? forkJoin(allCalls) : of(null)).pipe(finalize(() => { this.submitting = false; })).subscribe({
          next: () => {
            this.toasterService.showSuccess('Mapping updated successfully');
            this.closeModal('saved');
          },
          error: err => this.toasterService.showError(err?.error?.message || 'Failed to update mapping')
        });
      } else {
        // role === 'trainer'
        const addCall = toAdd.length ? this.mgmtTrainerService.mapTrainers(this.selectedManagementId, toAdd) : null;
        const removeCalls = toRemove.map(id => this.mgmtTrainerService.unmapTrainer(this.selectedManagementId, id));
        const allCalls: any[] = addCall ? [addCall, ...removeCalls] : removeCalls;
        forkJoin(allCalls).pipe(finalize(() => { this.submitting = false; })).subscribe({
          next: () => {
            this.toasterService.showSuccess('Mapping updated successfully');
            this.closeModal('saved');
          },
          error: err => this.toasterService.showError(err?.error?.message || 'Failed to update mapping')
        });
      }
      return;
    }

    const checkedMgmt = this.managmentList.filter(x => x.IsChecked);
    if (!checkedMgmt.length) {
      this.toasterService.showError('Please select at least one Management user.');
      return;
    }
    if (!this.users?.length) {
      this.toasterService.showError('No users selected.');
      return;
    }
    this.submitting = true;
    const list = [];
    for (const u of this.users) {
      for (const m of checkedMgmt) {
        list.push({ userId: u.id, parentUserId: m.id });
      }
    }
    this.appService.addUserManagemntMap({ userManagementRequests: list }).subscribe({
      next: () => {
        this.toasterService.showSuccess('Users assigned successfully');
        this.closeModal('saved');
      },
      error: err => {
        this.toasterService.showError(err?.error?.message || 'Failed to assign users');
      },
      complete: () => { this.submitting = false; }
    });
  }
}
