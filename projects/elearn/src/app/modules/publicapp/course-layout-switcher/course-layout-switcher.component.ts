import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthenticationService } from '../../auth/auth.service';

/**
 * Canonical course route: /courses/:slug (e.g. /courses/api-580).
 * Same page, same URL – only the layout wrapper changes by login state.
 *
 * - NOT logged in → Oilandgas header + footer + public course landing design.
 * - Logged in → Same public course content + Elearn sidebar + topbar. No redirect to /Elearn/... or /app/student/...
 */
@Component({
  selector: 'app-course-layout-switcher',
  templateUrl: './course-layout-switcher.component.html',
  styleUrls: ['./course-layout-switcher.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseLayoutSwitcherComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  /** JWT or cookie present and valid enough to show student chrome (sidebar + topbar). */
  get isLoggedIn(): boolean {
    return !!(this.authService.currentToken() || this.authService.currentUser());
  }

  constructor(
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.add(this.authService.roleId$.subscribe(() => this.cdr.markForCheck()));
    this.subs.add(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd)
      ).subscribe(() => this.cdr.markForCheck())
    );
    // Re-check so cookie-restored session is detected and Elearn sidebar + header show
    setTimeout(() => this.cdr.markForCheck(), 0);
    setTimeout(() => this.cdr.markForCheck(), 200);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
