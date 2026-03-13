import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { ToasterService } from '../toaster/toaster.service';

@Component({
    selector: 'app-user-info',
    templateUrl: './user-info.component.html',
    styleUrls: ['./user-info.component.scss'],
    standalone: false
})
export class UserInfoComponent implements OnInit {
  @Input() userID: any;
  @Input() name: any;
  @Input() email: any;
  /** When true, shows the full admin student drawer (profile, stats, purchases, engagement, timeline). Used from /app/admin/students. */
  @Input() showFullDrawer: boolean = false;
  /** When true, shows the full permission panel (Content + Management & List). Only set from /app/admin/management page. */
  @Input() showPermissionsPanel: boolean = false;
  /** Target user's RoleId. Permissions apply only when RoleId === 5 (Management). */
  @Input() targetUserRoleId: number;
  data: any;

  /** Full drawer data (Admin student view). */
  drawerData: any = null;
  drawerLoading = false;
  drawerError = false;
  purchaseItems: any[] = [];
  purchaseTotalCount = 0;
  purchasePage = 1;
  purchasePageSize = 10;
  purchaseDateFrom = '';
  purchaseDateTo = '';
  purchasesLoading = false;
  get totalPurchasePages(): number {
    if (this.purchasePageSize <= 0) return 0;
    return Math.ceil(this.purchaseTotalCount / this.purchasePageSize);
  }
  formatWatchTime(seconds: number): string {
    if (seconds == null || seconds < 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${seconds}s`;
  }
  
  // Content Permissions (existing)
  group: boolean = false;
  grmCourse: boolean = false;
  
  // Management & List Permissions (new)
  canViewStudents: boolean = false;
  canViewTrainers: boolean = false;
  canViewCompanies: boolean = false;
  canViewManagement: boolean = false;
  canViewCategories: boolean = false;
  canViewCourseList: boolean = false;
  
  managementList = [];
  
  // Track if changes were made
  private initialState: any = {};
  
  constructor(public activeModal: NgbActiveModal, private appService: AdminAppService, private toasterService: ToasterService) { }

  ngOnInit(): void {
    this.appService.getUserById(this.userID).subscribe({
      next: (res) => {
        this.data = res;
        this.targetUserRoleId = this.targetUserRoleId ?? res?.roleId;
      },
      error: () => { this.data = null; }
    });
    this.loadMagt();
    if (!this.showFullDrawer) {
      this.loadGroup();
    }
    if (this.showFullDrawer) {
      this.fetchDrawer();
      this.fetchPurchases();
    }
  }

  fetchDrawer(): void {
    this.drawerLoading = true;
    this.drawerError = false;
    this.appService.getStudentDrawer(this.userID).subscribe({
      next: (res) => {
        this.drawerData = res;
        this.drawerLoading = false;
      },
      error: () => {
        this.drawerLoading = false;
        this.drawerError = true;
      }
    });
  }

  fetchPurchases(): void {
    this.purchasesLoading = true;
    const params: any = { page: this.purchasePage, pageSize: this.purchasePageSize };
    if (this.purchaseDateFrom) params.from = this.purchaseDateFrom;
    if (this.purchaseDateTo) params.to = this.purchaseDateTo;
    this.appService.getStudentPurchases(this.userID, params).subscribe({
      next: (res) => {
        this.purchaseItems = res?.items ?? [];
        this.purchaseTotalCount = res?.totalCount ?? 0;
        this.purchasePage = res?.page ?? this.purchasePage;
        this.purchasePageSize = res?.pageSize ?? this.purchasePageSize;
        this.purchasesLoading = false;
      },
      error: () => { this.purchasesLoading = false; }
    });
  }

  onPurchasePageChange(page: number): void {
    if (page < 1 || page > this.totalPurchasePages) return;
    this.purchasePage = page;
    this.fetchPurchases();
  }

  onPurchaseDateFilter(): void {
    this.purchasePage = 1;
    this.fetchPurchases();
  }
  
  loadMagt() {
    this.appService.getManagementByUser(this.userID)
      .subscribe(res => {
        this.managementList = res;
      })
  }
  
  loadGroup(){
    this.appService.getUserGroups(this.userID)
    .subscribe({
      next: (res) => {
        const groups: string[] = Array.isArray(res) ? res : (res ? [res] : []);
        const lowerGroups = groups.map(g => (g || '').toLowerCase());
        // Content Permissions (Blog, Course) - case-insensitive (Cognito may return Blog/blog)
        this.group = lowerGroups.includes('blog');
        this.grmCourse = lowerGroups.includes('course');
      
      // Management & List Permissions
        this.canViewStudents = groups.includes('StudentList');
        this.canViewTrainers = groups.includes('TrainerList');
        this.canViewCompanies = groups.includes('CompanyList');
        this.canViewManagement = groups.includes('ManagementList');
        this.canViewCategories = groups.includes('CategoryList');
        this.canViewCourseList = groups.includes('CourseList');
        this.saveInitialState();
      },
      error: () => { this.saveInitialState(); }
    });
  }
  
  saveInitialState() {
    this.initialState = {
      group: this.group,
      grmCourse: this.grmCourse,
      canViewStudents: this.canViewStudents,
      canViewTrainers: this.canViewTrainers,
      canViewCompanies: this.canViewCompanies,
      canViewManagement: this.canViewManagement,
      canViewCategories: this.canViewCategories,
      canViewCourseList: this.canViewCourseList
    };
  }
  
  hasChanges(): boolean {
    return this.group !== this.initialState.group ||
           this.grmCourse !== this.initialState.grmCourse ||
           this.canViewStudents !== this.initialState.canViewStudents ||
           this.canViewTrainers !== this.initialState.canViewTrainers ||
           this.canViewCompanies !== this.initialState.canViewCompanies ||
           this.canViewManagement !== this.initialState.canViewManagement ||
           this.canViewCategories !== this.initialState.canViewCategories ||
           this.canViewCourseList !== this.initialState.canViewCourseList;
  }
  
  closeModal(sendData) {
    this.activeModal.close(sendData);
  }
  
  removeItem(i) {
    this.appService.deleteUserManagemntMap(i.id)
      .subscribe(res => {
        this.loadMagt();
      })
  }
  
  UpdateGrp() {
      var obj = {
        userId: this.userID,
        groups: [
          // Content Permissions
          {
            name: "blog",
            selected: this.group
          },
          {
            name: "Course",
            selected: this.grmCourse
          },
          // Management & List Permissions
          {
            name: "StudentList",
            selected: this.canViewStudents
          },
          {
            name: "TrainerList",
            selected: this.canViewTrainers
          },
          {
            name: "CompanyList",
            selected: this.canViewCompanies
          },
          {
            name: "ManagementList",
            selected: this.canViewManagement
          },
          {
            name: "CategoryList",
            selected: this.canViewCategories
          },
          {
            name: "CourseList",
            selected: this.canViewCourseList
          }
        ]
      }
      this.appService.addToGroupUser(obj)
        .subscribe({
          next: () => {
            this.saveInitialState();
            this.toasterService.showSuccess('Permissions updated successfully');
          },
          error: (err) => {
            this.toasterService.showError(err?.error?.message || 'Failed to update permissions');
          }
        });
  }
}
