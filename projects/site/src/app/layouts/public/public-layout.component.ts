import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { PublicTopbarComponent } from './public-topbar/public-topbar.component';
import { RouterModule, Router, NavigationEnd, ActivatedRouteSnapshot } from '@angular/router';
import { PublicFooterComponent } from './public-footer/public-footer.component';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Component({
    selector: 'app-public-layout',
    templateUrl: './public-layout.component.html',
    styleUrls: ['./public-layout.component.scss'],
    imports: [
      PublicTopbarComponent,
      RouterModule,
      PublicFooterComponent,
      CommonModule
    ],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicLayoutComponent implements OnInit, OnDestroy {
  isAuthRoute = false;
  isEmbedMode = false;
  /** When true, URL is /:courseId (e.g. /123) → Elearn layout; hide public header/footer. */
  isElearnCoursePage = false;
  isCorporateTrainingPage = false;
  private subs = new Subscription();

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private auth: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.checkRoute();
    this.subs.add(
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
        this.checkRoute();
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private checkRoute(): void {
    this.isAuthRoute = this.router.url.startsWith('/auth');
    this.isEmbedMode = this.router.url.includes('embed=1');
    this.isElearnCoursePage = this.isCourseIdParam(this.router.routerState.snapshot.root);
    this.isCorporateTrainingPage =
      this.router.url.includes('/corporate-training') ||
      this.router.url.endsWith('/corporate-training');
    this.cdr.markForCheck();
  }

  private isCourseIdParam(route: ActivatedRouteSnapshot): boolean {
    const param = route.paramMap.get('courseSlug') ?? route.params['courseSlug'];
    if (param != null && typeof param === 'string') {
      const t = param.trim();
      if (/^\d+$/.test(t)) return true;
      if (/^[0-9a-fA-F]{8,9}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(t)) return true;
    }
    for (const child of route.children) if (this.isCourseIdParam(child)) return true;
    return false;
  }
}
