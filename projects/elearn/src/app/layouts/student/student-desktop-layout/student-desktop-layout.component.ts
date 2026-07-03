import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { StudentSessionService } from '../../../core/services/student-session.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AuthenticationService } from '../../../modules/auth/auth.service';
import { SharedService } from '../../../shared/service/shared-service.service';

/**
 * Desktop-only student layout: existing sidebar, topbar, and content.
 * Used by LayoutSwitcher when screen width >= 768px. No CSS changes from original.
 */
@Component({
  selector: 'app-student-desktop-layout',
  templateUrl: './student-desktop-layout.component.html',
  styleUrls: ['./student-desktop-layout.component.scss'],
  standalone: false,
})
export class StudentDesktopLayoutComponent implements OnInit, OnDestroy {
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  logoIconUrl = 'assets/img/oilandgas_club.svg';
  currentCourseFilter: number | null = null;
  user: any = null;
  sidebarAvatarError = false;
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

  isOnCoursesRoute(): boolean {
    return this.router.url.includes('/courses');
  }

  isMyCoursesActive(): boolean {
    const url = this.router.url || '';
    return url.includes('/courses') || url.includes('/details/');
  }

  get profileImageUrl(): string | null {
    const u = this.user;
    const url =
      this.profileImageUrlOverride ??
      u?.profilePictureUrl ??
      u?.ProfilePictureUrl ??
      u?.profilePicture ??
      u?.ProfilePicture ??
      u?.imageUrl ??
      u?.avatarUrl ??
      null;
    return url && typeof url === 'string' && url.trim() ? url.trim() : null;
  }

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

  onLogoIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !(img as any).dataset['logoIconFallback']) {
      (img as any).dataset['logoIconFallback'] = '1';
      this.logoIconUrl = 'assets/img/ogclubsvg.svg';
    }
  }

  ngOnInit(): void {
    this.document.body.classList.add('student-layout-active');
    this.sharedService.showStudentCourseSearch.next(true);
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
