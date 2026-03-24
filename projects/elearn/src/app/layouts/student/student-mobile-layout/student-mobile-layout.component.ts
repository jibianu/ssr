import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { StudentSessionService } from '../../../core/services/student-session.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AuthenticationService } from '../../../modules/auth/auth.service';
import { SharedService } from '../../../shared/service/shared-service.service';
import { StudentSidebarDrawerService } from '../../../core/services/student-sidebar-drawer.service';

/**
 * Mobile-only student layout: mobile topbar, content (router-outlet), bottom navigation.
 * Left sidebar drawer opens from profile icon in topbar (same content as reference).
 */
@Component({
  selector: 'app-student-mobile-layout',
  templateUrl: './student-mobile-layout.component.html',
  styleUrls: ['./student-mobile-layout.component.scss'],
  standalone: false,
})
export class StudentMobileLayoutComponent implements OnInit, OnDestroy {
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  logoIconUrl = 'assets/img/oilandgas_club.svg';
  user: any = null;
  avatarError = false;
  sidebarAvatarError = false;
  profileImageUrlOverride: string | null = null;
  /** Left sidebar drawer open state (profile icon in topbar opens it). */
  drawerOpen = false;
  currentCourseFilter: number | null = null;
  private sub = new Subscription();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public playerState: PlayerStateService,
    private authService: AuthenticationService,
    private sharedService: SharedService,
    private router: Router,
    private studentSessionService: StudentSessionService,
    private analyticsService: AnalyticsService,
    private sidebarDrawer: StudentSidebarDrawerService
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

  closeDrawer(): void {
    this.drawerOpen = false;
    this.sidebarDrawer.close();
  }

  get profileImageUrl(): string | null {
    const u = this.user;
    return (
      this.profileImageUrlOverride ??
      u?.profilePictureUrl ??
      u?.ProfilePictureUrl ??
      u?.profilePicture ??
      u?.ProfilePicture ??
      u?.imageUrl ??
      u?.avatarUrl ??
      null
    );
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !(img as any).dataset['logoFallback']) {
      (img as any).dataset['logoFallback'] = '1';
      this.logoUrl = '/assets/img/oilandgas_club.svg';
    }
  }

  onLogoIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !(img as any).dataset['logoIconFallback']) {
      (img as any).dataset['logoIconFallback'] = '1';
      this.logoIconUrl = 'assets/img/ogclubsvg.svg';
    }
  }

  get userInitial(): string {
    const u = this.user;
    if (!u) return '?';
    const name = (u.firstName || u.userName || u.email || '').trim();
    return (name.charAt(0) || (u.email || '?').charAt(0)).toUpperCase();
  }

  ngOnInit(): void {
    this.document.body.classList.add('student-layout-active', 'student-mobile-layout-active');
    this.sharedService.showStudentCourseSearch.next(true);
    this.user = this.authService.currentUser();
    this.studentSessionService.startSession().subscribe();
    this.analyticsService.startSession().subscribe();
    this.sub.add(
      this.sharedService.profileImageUrl$.subscribe((url) => {
        this.profileImageUrlOverride = url;
        this.avatarError = false;
        this.sidebarAvatarError = false;
      })
    );
    this.sub.add(
      this.authService.commonCourse.subscribe((v) => {
        if (v && typeof v.status !== 'undefined') this.currentCourseFilter = v.status;
        else if (v && v.isWishList) this.currentCourseFilter = 3;
        else if (v && v.pageType === 1) this.currentCourseFilter = 1;
        else if (v && v.pageType === 2) this.currentCourseFilter = 2;
      })
    );
    this.sub.add(
      this.sidebarDrawer.open$.subscribe((open) => {
        this.drawerOpen = open;
      })
    );
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('student-layout-active', 'student-mobile-layout-active');
    this.sharedService.showStudentCourseSearch.next(false);
    this.studentSessionService.endSession().subscribe();
    this.analyticsService.endSession().subscribe();
    this.sub.unsubscribe();
  }

  logout(): void {
    this.studentSessionService.endSession().subscribe(() => {
      this.authService.logout();
      this.router.navigate(['/login']);
    });
  }
}
