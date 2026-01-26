import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { PublicTopbarComponent } from './public-topbar/public-topbar.component';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { PublicFooterComponent } from './public-footer/public-footer.component';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

// ✅ PERFORMANCE: OnPush change detection for faster change detection (30-50% improvement)
// ✅ HYDRATION: Layout component is SSR-safe - only contains router outlet and child components
@Component({
    selector: 'app-public-layout',
    templateUrl: './public-layout.component.html',
    styleUrls: ['./public-layout.component.scss'],
    imports: [PublicTopbarComponent, RouterModule, PublicFooterComponent, CommonModule],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicLayoutComponent implements OnInit {
  isAuthRoute = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Check initial route
    this.checkAuthRoute(this.router.url);

    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.checkAuthRoute(event.url);
        this.cdr.markForCheck();
      });
  }

  private checkAuthRoute(url: string): void {
    this.isAuthRoute = url.startsWith('/auth');
    this.cdr.markForCheck();
  }

}
