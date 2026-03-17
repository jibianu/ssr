import { Location } from '@angular/common';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { AuthenticationService, ROLE_LANDING_ROUTES } from 'src/app/modules/auth/auth.service';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { SharedService } from '../../service/shared-service.service';
import { ToasterService } from '../toaster/toaster.service';
import { environment } from 'src/environments/environment';

const ROLE_TRAINER = 3;

/** Common topbar for Admin, Trainer, Company, Management: logo (left), back, title (center), user dropdown (right). */
@Component({
  selector: 'app-common-page-topbar',
  templateUrl: './common-page-topbar.component.html',
  styleUrls: ['./common-page-topbar.component.scss'],
  standalone: false,
})
export class CommonPageTopbarComponent implements OnInit, OnDestroy, OnChanges {
  @Input() pageTitle: string = '';
  @Input() showBack = true;
  @Input() showSidebarToggler = false;
  /** Optional: override logo/home link (e.g. when profile is shown for affiliate user). */
  @Input() homeRouteOverride: string = '';
  @Output() sidebarToggle = new EventEmitter<void>();

  displayTitle = '';
  showUserMappingButton = false;
  showAddCategoryButton = false;
  showCourseListToolbar = false;
  showTrainerListToolbar = false;
  showTrainerDashboardToolbar = false;
  courseListSearchTerm = '';
  trainerListSearchTerm = '';
  showCurriculumToolbar = false;
  showCurriculumEditActions = true;
  curriculumSearchTerm = '';
  curriculumActiveTab = 'concepts';
  /** Set by Event List (and similar pages); shows e.g. "Add Event" button in topbar. */
  topbarPrimaryAction: { routerLink: string; label: string; icon?: string; contentType?: 'Course' | 'Blog' | 'Event' } | null = null;
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  homeRoute = '/app/student/courses';
  userEmail = '';
  userDisplayName = '';
  dropdownOpen = false;
  /** Trainer content permissions (Course, Blog, Event) from API; used to show Add vs Request Permission. */
  contentPermissions: string[] = [];
  /** Content types for which trainer has a pending permission request (show "Permission requested"). */
  pendingPermissionTypes: string[] = [];
  trainerRequestingPermission = false;
  isTrainer = false;

  /** Student topbar course search (same behavior as site). */
  @ViewChild('studentSearchContainer') studentSearchContainerRef: ElementRef<HTMLElement> | null = null;
  showStudentCourseSearch = false;
  studentSearchText = '';
  studentSearchResults: { id: string; title: string; slug: string }[] = [];
  studentSearchLoading = false;
  studentSearchDropdown = false;
  private studentSearchSubject = new Subject<string>();

  private sub = new Subscription();

  constructor(
    private location: Location,
    private router: Router,
    private authService: AuthenticationService,
    private cookieService: CookieService,
    private sharedService: SharedService,
    private adminAppService: AdminAppService,
    private toasterService: ToasterService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.dropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
    if (this.studentSearchDropdown && this.studentSearchContainerRef?.nativeElement && !this.studentSearchContainerRef.nativeElement.contains(event.target as Node)) {
      this.studentSearchDropdown = false;
      this.cdr.markForCheck();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['homeRouteOverride'] && this.homeRouteOverride) {
      this.homeRoute = this.homeRouteOverride;
    }
  }

  ngOnInit(): void {
    const user = JSON.parse(this.cookieService.getCookie('currentUser') || '{}');
    this.userEmail = user?.email || '';
    this.userDisplayName = this.buildDisplayName(user?.firstName, user?.lastName, user?.userName);
    const roleId = user?.roleId != null ? user.roleId : this.authService.currentUser()?.roleId;
    this.isTrainer = roleId === ROLE_TRAINER;
    if (roleId != null && ROLE_LANDING_ROUTES[roleId]) {
      this.homeRoute = ROLE_LANDING_ROUTES[roleId];
    }
    if (this.router.url.startsWith('/app/affiliate')) {
      this.homeRoute = '/app/affiliate/dashboard';
    }
    if (this.homeRouteOverride) {
      this.homeRoute = this.homeRouteOverride;
    }
    if (this.pageTitle) {
      this.displayTitle = this.pageTitle;
    } else {
      this.sub.add(
        this.sharedService.certificateName.subscribe((t) => {
          this.displayTitle = t || '';
        })
      );
    }
    this.sub.add(
      this.sharedService.showUserMappingButton.subscribe((show) => {
        this.showUserMappingButton = show;
      })
    );
    this.sub.add(
      this.sharedService.showAddCategoryButton.subscribe((show) => {
        this.showAddCategoryButton = show;
      })
    );
    this.sub.add(
      this.sharedService.showCourseListToolbar.subscribe((show) => {
        this.showCourseListToolbar = show;
        this.cdr.markForCheck();
      })
    );
    this.sub.add(
      this.sharedService.showTrainerDashboardToolbar.subscribe((show) => {
        this.showTrainerDashboardToolbar = show;
        if (show && this.isTrainer && this.router.url.includes('/trainer/')) {
          this.loadTrainerContentPermissions();
          this.loadMyPendingPermissionRequests();
        }
        this.displayTitle = show ? 'Trainer Dashboard' : (this.displayTitle === 'Trainer Dashboard' ? '' : this.displayTitle);
        this.cdr.markForCheck();
      })
    );
    this.sub.add(
      this.sharedService.showTrainerListToolbar.subscribe((show) => {
        this.showTrainerListToolbar = show;
        this.cdr.markForCheck();
      })
    );
    this.sub.add(
      this.sharedService.trainerListSearchTerm$.subscribe((term) => {
        this.trainerListSearchTerm = term;
      })
    );
    this.sub.add(
      this.sharedService.courseListSearchTerm$.subscribe((term) => {
        this.courseListSearchTerm = term;
      })
    );
    this.sub.add(
      this.sharedService.showCurriculumToolbar.subscribe((show) => {
        this.showCurriculumToolbar = show;
        this.cdr.markForCheck();
      })
    );
    this.sub.add(
      this.sharedService.showCurriculumEditActions.subscribe((show) => {
        this.showCurriculumEditActions = show;
        this.cdr.markForCheck();
      })
    );
    this.sub.add(
      this.sharedService.curriculumSearchTerm$.subscribe((term) => {
        this.curriculumSearchTerm = term;
      })
    );
    this.sub.add(
      this.sharedService.curriculumActiveTab$.subscribe((tab) => {
        this.curriculumActiveTab = tab;
      })
    );
    this.sub.add(
      this.sharedService.showStudentCourseSearch.subscribe((show) => {
        this.showStudentCourseSearch = show;
        if (!show) {
          this.studentSearchText = '';
          this.studentSearchResults = [];
          this.studentSearchDropdown = false;
        }
        this.cdr.markForCheck();
      })
    );
    this.sub.add(
      this.sharedService.topbarPrimaryAction.subscribe((action) => {
        this.topbarPrimaryAction = action;
        if (action?.contentType && this.isTrainer && this.router.url.includes('/trainer/')) {
          this.loadTrainerContentPermissions();
          this.loadMyPendingPermissionRequests();
        }
        this.cdr.markForCheck();
      })
    );
    this.sub.add(
      this.studentSearchSubject.pipe(
        debounceTime(300),
        switchMap(term => this.adminAppService.searchCourses(term))
      ).subscribe(results => {
        this.studentSearchResults = results;
        this.studentSearchLoading = false;
        this.studentSearchDropdown = this.studentSearchText.trim().length >= 2;
        this.cdr.markForCheck();
      })
    );
  }

  onCurriculumTabClick(tabId: string): void {
    this.sharedService.curriculumActiveTab$.next(tabId);
  }

  onCurriculumSearchChange(value: string): void {
    this.sharedService.curriculumSearchTerm$.next(value);
  }

  onCurriculumCheckCourseClick(): void {
    this.sharedService.curriculumCheckCourseClick$.next();
  }

  onCurriculumAddCurriculumClick(): void {
    this.sharedService.curriculumAddCurriculumClick$.next();
  }

  onCurriculumEditCourseClick(): void {
    this.sharedService.curriculumEditCourseClick$.next();
  }

  onCurriculumEditPriceClick(): void {
    this.sharedService.curriculumEditPriceClick$.next();
  }

  onUserMappingClick(): void {
    this.sharedService.userMappingClick$.next();
  }

  onAddCategoryClick(): void {
    this.sharedService.addCategoryClick$.next();
  }

  onCourseListSearchChange(value: string): void {
    this.sharedService.courseListSearchTerm$.next(value);
  }

  onCourseListSearchTrigger(): void {
    this.sharedService.courseListSearchTrigger$.next();
  }

  onCourseListFilterClick(): void {
    this.sharedService.courseListFilterClick$.next();
  }

  onTrainerListSearchChange(value: string): void {
    this.sharedService.trainerListSearchTerm$.next(value);
  }

  onTrainerListSearchTrigger(): void {
    this.sharedService.trainerListSearchTrigger$.next();
  }

  onTrainerListFilterClick(): void {
    this.sharedService.trainerListFilterClick$.next();
  }

  onCourseListAddCourseClick(): void {
    this.sharedService.courseListAddCourseClick$.next();
  }

  onTrainerAddCourseClick(): void {
    this.sharedService.trainerAddCourseClick$.next();
  }

  get isTrainerContext(): boolean {
    return (this.router?.url ?? '').includes('/trainer/');
  }

  /** True when trainer has permission to create this content type (from TrainerPermissions / my-content-permissions). */
  hasTrainerContentPermission(type: string): boolean {
    return this.contentPermissions.some(p => (p || '').toLowerCase() === (type || '').toLowerCase());
  }

  /** True when trainer has a pending permission request for this content type. */
  hasPendingPermissionRequest(type: string): boolean {
    return this.pendingPermissionTypes.some(p => (p || '').toLowerCase() === (type || '').toLowerCase());
  }

  private loadTrainerContentPermissions(): void {
    this.adminAppService.getMyContentPermissions().subscribe({
      next: (list) => {
        this.contentPermissions = Array.isArray(list) ? list : [];
        this.cdr.markForCheck();
      },
      error: () => { this.contentPermissions = []; this.cdr.markForCheck(); }
    });
  }

  private loadMyPendingPermissionRequests(): void {
    this.adminAppService.getMyPendingPermissionRequests().subscribe({
      next: (list) => {
        this.pendingPermissionTypes = (Array.isArray(list) ? list : [])
          .map((r: { contentType?: string }) => (r?.contentType || '').trim())
          .filter(Boolean);
        this.cdr.markForCheck();
      },
      error: () => { this.pendingPermissionTypes = []; this.cdr.markForCheck(); }
    });
  }

  /** Trainer: request permission to create content (Course, Blog, or Event). */
  onTrainerRequestPermission(contentType: 'Course' | 'Blog' | 'Event'): void {
    if (this.trainerRequestingPermission) return;
    this.trainerRequestingPermission = true;
    this.adminAppService.requestContentPermission(contentType).subscribe({
      next: () => {
        this.trainerRequestingPermission = false;
        this.toasterService.showSuccess('Request sent. You will be notified when an admin approves.');
        this.loadTrainerContentPermissions();
        this.loadMyPendingPermissionRequests();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.trainerRequestingPermission = false;
        this.toasterService.showError(err?.error?.message || 'Failed to send request');
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private buildDisplayName(firstName?: string, lastName?: string, userName?: string): string {
    const full = [firstName, lastName].filter(Boolean).join(' ').trim();
    return full || userName || 'User';
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  goBack(): void {
    this.location.back();
  }

  onSidebarTogglerClick(): void {
    this.sidebarToggle.emit();
  }

  onStudentSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.studentSearchText = input?.value ?? '';
    if (this.studentSearchText.trim().length < 2) {
      this.studentSearchResults = [];
      this.studentSearchDropdown = false;
      this.cdr.markForCheck();
      return;
    }
    this.studentSearchLoading = true;
    this.studentSearchDropdown = true;
    this.studentSearchSubject.next(this.studentSearchText.trim());
    this.cdr.markForCheck();
  }

  onStudentSearchFocus(): void {
    if (this.studentSearchText.trim().length >= 2 && this.studentSearchResults.length > 0) {
      this.studentSearchDropdown = true;
      this.cdr.markForCheck();
    }
  }

  onStudentSelectCourse(course: { id: string; title: string; slug: string }): void {
    const id = (course?.id ?? '').trim();
    if (!id) return;
    this.studentSearchText = '';
    this.studentSearchResults = [];
    this.studentSearchDropdown = false;
    this.cdr.markForCheck();
    this.router.navigate(['/app/student/details/curriculum-list', id]);
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['logoFallback']) {
      img.dataset['logoFallback'] = '1';
      img.src = '/assets/img/oilandgas_club.svg';
    }
  }
}
