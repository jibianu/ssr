import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlayerStateService } from '../../core/services/player-state.service';
import { StudentSessionService } from '../../core/services/student-session.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { SharedService } from '../../shared/service/shared-service.service';

/**
 * Dedicated layout for the student role.
 * Uses sidebar + topbar + content; nav items are student-only (My Courses + In Progress/Completed/Wishlisted, Explore, Profile, Certificates).
 * Locks body scroll so only inner content (e.g. course player right panel) scrolls.
 * Hides topbar when Video Focus Mode is active.
 */
@Component({
  selector: 'app-student-layout',
  templateUrl: './student-layout.component.html',
  styleUrls: ['./student-layout.component.scss'],
  standalone: false,
})
export class StudentLayoutComponent implements OnInit, OnDestroy {
  /** Full logo shown when sidebar is expanded (hover); falls back to oilandgas_club.svg like login/topbar. */
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  /** Small icon shown in collapsed sidebar; use vector SVG so it renders clearly at 32x32. */
  logoIconUrl = 'assets/img/oilandgas_club.svg';
  currentCourseFilter: number | null = null;
  /** User for sidebar avatar (from auth, updated on init). */
  user: any = null;
  /** Set when sidebar avatar image fails to load. */
  sidebarAvatarError = false;
  /** Updated when user changes profile photo so sidebar avatar updates immediately. */
  profileImageUrlOverride: string | null = null;
  private sub = new Subscription();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public playerState: PlayerStateService,
    private authService: AuthenticationService,
    private sharedService: SharedService,
    private router: Router,
    private studentSessionService: StudentSessionService,
    private analyticsService: AnalyticsService
  ) {}

  setCourseFilter(status: number): void {
    this.currentCourseFilter = status;
    this.authService.commonCourse.next({ status });
  }

  isCourseFilter(status: number): boolean {
    return this.currentCourseFilter === status;
  }

  /** True when current route is the student courses page (so sub-links In Progress/Completed/Wishlisted can be highlighted). */
  isOnCoursesRoute(): boolean {
    return this.router.url.includes('/courses');
  }

  /** True when My Courses sidebar item should be highlighted (courses list or any course details: curriculum-list, curriculum-details, test-list, etc.). */
  isMyCoursesActive(): boolean {
    const url = this.router.url || '';
    return url.includes('/courses') || url.includes('/details/');
  }

  /** Profile image URL: use latest from profile update, then user from auth. */
  get profileImageUrl(): string | null {
    const url = this.profileImageUrlOverride ?? this.user?.profilePictureUrl ?? this.user?.ProfilePictureUrl;
    return url || null;
  }

  /** First letter of user name/email for sidebar avatar fallback. */
  get userInitial(): string {
    const u = this.user;
    if (!u) return '?';
    const name = (u.firstName || u.userName || u.email || '').trim();
    return (name.charAt(0) || (u.email || '?').charAt(0)).toUpperCase();
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !(img as any).dataset['logoFallback']) {
      (img as any).dataset['logoFallback'] = '1';
      img.src = '/assets/img/oilandgas_club.svg';
    }
  }

  /** Fallback for sidebar icon if primary asset fails to load. */
  onLogoIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !(img as any).dataset['logoIconFallback']) {
      (img as any).dataset['logoIconFallback'] = '1';
      this.logoIconUrl = 'assets/img/ogclubsvg.svg';
    }
  }

  ngOnInit(): void {
    this.document.body.classList.add('student-layout-active');
    this.sharedService.showStudentCourseSearch.next(true); // show search in common-topbar (student)
    this.user = this.authService.currentUser();
    this.sub.add(
      this.authService.getUserInfo().subscribe((user) => {
        if (user) {
          this.user = user;
        }
      })
    );
    this.studentSessionService.startSession().subscribe();
    this.analyticsService.startSession().subscribe();
    this.sub.add(
      this.authService.commonCourse.subscribe((v) => {
        if (v && typeof v.status !== 'undefined') this.currentCourseFilter = v.status;
        else if (v && v.isWishList) this.currentCourseFilter = 3;
        else if (v && v.pageType === 1) this.currentCourseFilter = 1;
        else if (v && v.pageType === 2) this.currentCourseFilter = 2;
      })
    );
    this.sub.add(
      this.sharedService.profileImageUrl$.subscribe((url) => {
        this.profileImageUrlOverride = url;
        this.sidebarAvatarError = false;
      })
    );
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    const token = this.authService.currentToken();
    this.studentSessionService.endSessionBeforeUnload(token);
    this.analyticsService.endSessionBeforeUnload(token);
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('student-layout-active');
    this.sharedService.showStudentCourseSearch.next(false);
    this.studentSessionService.endSession().subscribe();
    this.analyticsService.endSession().subscribe();
    this.sub.unsubscribe();
  }
}
