import { Location } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { ProgressStatus, Role } from 'src/app/shared/models/role';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import {
  StudentDashboardApiService,
  StudentNotificationItem,
  StudentNotificationsResponse,
} from 'src/app/modules/student/student-dashboard-api.service';
import { StudentSessionService } from 'src/app/core/services/student-session.service';
import { StudentSidebarDrawerService } from 'src/app/core/services/student-sidebar-drawer.service';
import { PracticeQuestionsDrawerService } from 'src/app/core/services/practice-questions-drawer.service';
import { CurriculumSidebarService } from 'src/app/core/services/curriculum-sidebar.service';

@Component({
    selector: 'app-common-topbar',
    templateUrl: './common-topbar.component.html',
    styleUrls: ['./common-topbar.component.scss'],
    standalone: false
})
export class CommonTopbarComponent implements OnInit, OnDestroy {

  userName: string;
  user;
  roleUrl=''
  get courseTitle() { return this.authService.data$; }
  get curriculumData() { return this.authService.curriculumData; }
  categoryData:string;
  categoryName:string;
  selectedContent:string;
  courseStructure:string;
  certificateName:string;
  commonCourse;
  // common course tabs
  inProgressStatus = ProgressStatus.InProgress;
  completedStatus = ProgressStatus.Completed;
  isWishList: boolean;
  /** Fine-grained: only view that reads this signal re-renders on change. */
  isMobileView = signal(false);
  showCategory = signal(false);

  @HostListener('window:resize', ['$event'])
  onResize(_event: any): void {
    this.ngZone.runOutsideAngular(() => {
      const isMobile = window.innerWidth < 768;
      if (isMobile !== this.isMobileView()) {
        this.ngZone.run(() => this.isMobileView.set(isMobile));
      }
    });
  }

  isTrainer: boolean = false;
  pageType:number = 1;
  /** Set when avatar image fails to load; show initial letter instead. */
  avatarImageError = false;
  /** Updated when user changes profile photo so topbar avatar updates immediately. */
  profileImageUrlOverride: string | null = null;
  /** Notifications (student only). */
  notifications: StudentNotificationItem[] = [];
  unreadCount = 0;
  notificationsLoading = false;
  notificationsDropdownOpen = false;

  /** Mobile menu open state (Angular-driven; Bootstrap collapse not used). */
  mobileMenuOpen = false;

  /** On mobile, when true the search input is shown (click "Search courses" to open). */
  mobileSearchOpen = false;

  /** Student topbar course search (same as site). */
  @ViewChild('studentSearchContainer') studentSearchContainerRef: ElementRef<HTMLElement> | null = null;
  @ViewChild('studentSearchInput') studentSearchInputRef: ElementRef<HTMLInputElement> | null = null;
  showStudentCourseSearch = false;
  studentSearchText = '';
  studentSearchResults: { id: string; title: string; slug: string }[] = [];
  studentSearchLoading = false;
  studentSearchDropdown = false;
  private studentSearchSubject = new Subject<string>();
  private studentSearchSub: Subscription | null = null;

  constructor(
    private router: Router,
    private location: Location,
    private authService: AuthenticationService,
    private sharedService: SharedService,
    private adminAppService: AdminAppService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private studentDashboardApi: StudentDashboardApiService,
    private studentSessionService: StudentSessionService,
    private elementRef: ElementRef<HTMLElement>,
    private sidebarDrawer: StudentSidebarDrawerService,
    private practiceQuestionsDrawer: PracticeQuestionsDrawerService,
    private curriculumSidebar: CurriculumSidebarService
  ) {
      this.authService.selectedContent.subscribe(res=>{
        this.selectedContent = res;
      })
      this.authService.courseStructure.subscribe(res=>{
        this.courseStructure = res;
      })
      this.authService.commonCourse.subscribe(res=>{
        this.commonCourse = res;
      })
      this.sharedService.category.subscribe(res=>{
        this.categoryData = res;
      })
      this.sharedService.categoryName.subscribe(res=>{
        this.categoryName = res;
      })
      this.sharedService.certificateName.subscribe(res=>{
        this.certificateName = res;
      })
      this.sharedService.profileImageUrl$.subscribe(url => {
        this.profileImageUrlOverride = url;
        this.avatarImageError = false;
      });
     }

  /** Avatar image URL: use latest from profile update, then user from auth (multiple API shapes). */
  get topbarAvatarUrl(): string | null {
    const u = this.user;
    const url =
      this.profileImageUrlOverride ??
      u?.profilePictureUrl ??
      u?.ProfilePictureUrl ??
      u?.profilePicture ??
      u?.ProfilePicture ??
      u?.imageUrl ??
      u?.avatarUrl;
    return (url && String(url).trim()) ? String(url).trim() : null;
  }

  ngOnInit() {
    this.onResize(window.innerWidth);
    this.showCategory.set(this.router.url.includes('/categories'));
    this.user = this.authService.currentUser();
    this.avatarImageError = false;
    this.userName = this.user?.userName;
    sessionStorage.setItem('CurrentUser', JSON.stringify(this.user));
    this.authService.getUserInfo().subscribe((user) => {
      if (user) {
        this.user = user;
        this.userName = user.userName ?? user.UserName ?? this.userName;
        sessionStorage.setItem('CurrentUser', JSON.stringify(user));
        this.cdr.markForCheck();
      }
    });
    var role: Role;
    role = this.user.roleId;
    switch (role) {
      case Role.Admin:
        this.roleUrl = 'admin'
        break;
      case Role.Student:
        this.roleUrl = 'student'
        this.loadNotifications();
        break;
      case Role.Trainer:
        this.roleUrl = 'trainer'
        break;
      case Role.Manager:
        this.roleUrl = 'management'
        break;
      case Role.Company:
        this.roleUrl = 'company'
        break;
    }
    this.sharedService.showStudentCourseSearch.subscribe((show) => {
      this.showStudentCourseSearch = show;
      if (!show) {
        this.studentSearchText = '';
        this.studentSearchResults = [];
        this.studentSearchDropdown = false;
      }
      this.cdr.markForCheck();
    });
    this.studentSearchSub = this.studentSearchSubject.pipe(
      debounceTime(300),
      switchMap(term => this.adminAppService.searchCourses(term))
    ).subscribe(results => {
      this.studentSearchResults = results;
      this.studentSearchLoading = false;
      this.studentSearchDropdown = this.studentSearchText.trim().length >= 2;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.studentSearchSub?.unsubscribe();
    this.studentSearchSub = null;
  }

  loadNotifications(): void {
    if (this.roleUrl !== 'student') return;
    this.notificationsLoading = true;
    this.studentDashboardApi.getNotifications(1, 20).subscribe({
      next: (r: StudentNotificationsResponse) => {
        this.notifications = r.items;
        this.unreadCount = r.unreadCount;
        this.notificationsLoading = false;
      },
      error: () => (this.notificationsLoading = false),
    });
  }

  onNotificationsDropdownOpenChange(open: boolean): void {
    this.notificationsDropdownOpen = open;
    if (open) this.loadNotifications();
  }

  markAsRead(item: StudentNotificationItem): void {
    if (item.isRead) return;
    this.studentDashboardApi.markNotificationAsRead(item.id).subscribe({
      next: () => {
        item.isRead = true;
        if (this.unreadCount > 0) this.unreadCount--;
      },
    });
  }

  markAllAsRead(): void {
    if (this.unreadCount === 0) return;
    this.studentDashboardApi.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => (n.isRead = true));
        this.unreadCount = 0;
      },
    });
  }

  goToNotification(item: StudentNotificationItem): void {
    this.markAsRead(item);
    if (item.linkUrl) this.router.navigateByUrl(item.linkUrl);
  }

  /** First letter of user name or email for avatar fallback. */
  get userInitial(): string {
    const u = this.user;
    if (!u) return '?';
    const name = (u.firstName || u.userName || u.email || '').trim();
    return (name.charAt(0) || (u.email || '?').charAt(0)).toUpperCase();
  }

  getFilterCourse(item){
    this.authService.commonCourse.next({status: item})
  }

  scrollToContent(data:string){
    this.selectedContent = data;
    this.authService.curriculumDetails.next(data);
  }

  goBack(){
    // this.location.back()
    var path=`app/${this.roleUrl}/courses`
    this.router.navigate([path])
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
    this.mobileSearchOpen = false;
    this.cdr.markForCheck();
    this.router.navigate(['/app/student/details/curriculum-list', id]);
  }

  /** Open search on mobile (show input and focus it). */
  openMobileSearch(): void {
    this.mobileSearchOpen = true;
    this.cdr.markForCheck();
    setTimeout(() => this.studentSearchInputRef?.nativeElement?.focus(), 100);
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen = false;
    this.cdr.markForCheck();
  }

  /** Open the left sidebar drawer (mobile student). */
  openSidebarDrawer(): void {
    this.sidebarDrawer.open();
    this.mobileMenuOpen = false;
    this.cdr.markForCheck();
  }

  /** True when current route is practice-questions (curriculum-questions). */
  isOnPracticeQuestionsPage(): boolean {
    return this.router.url.includes('curriculum-questions');
  }

  /** True when on curriculum details (e.g. Class 1 video page) – show curriculum sidebar icon. */
  isOnCurriculumDetailsPage(): boolean {
    return this.router.url.includes('curriculum-details');
  }

  toggleCurriculumSidebar(): void {
    this.curriculumSidebar.toggle();
    this.cdr.markForCheck();
  }

  togglePracticeQuestionsDrawer(): void {
    this.practiceQuestionsDrawer.toggle();
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.studentSearchDropdown && this.studentSearchContainerRef?.nativeElement && !this.studentSearchContainerRef.nativeElement.contains(target)) {
      this.studentSearchDropdown = false;
    }
    if (this.mobileMenuOpen && this.elementRef.nativeElement && !this.elementRef.nativeElement.contains(target)) {
      this.mobileMenuOpen = false;
    }
    this.cdr.markForCheck();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.cdr.markForCheck();
  }

  /** Close mobile menu when clicking a link inside (navigation); ignore clicks on dropdown toggles. */
  onMobileNavClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('a[routerLink]') || target.closest('button.notifications-mark-all')) {
      this.mobileMenuOpen = false;
      this.cdr.markForCheck();
    }
  }

  logout() {
    if (this.roleUrl === 'student') {
      this.studentSessionService.endSession().subscribe(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      });
    } else {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
