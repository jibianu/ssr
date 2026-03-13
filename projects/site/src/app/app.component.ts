import { Component, OnDestroy, ChangeDetectionStrategy, Inject, PLATFORM_ID } from '@angular/core';
import { NgxSpinnerModule, NgxSpinnerService } from "ngx-spinner";
import { AuthModule } from './modules/auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { Subject, takeUntil } from 'rxjs';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
  RouterModule
} from "@angular/router";
import { isPlatformBrowser } from '@angular/common';
import { BackendHealthService } from './core/services/backend-health.service';
import { GtmService } from './services/gtm.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [
      AuthModule,
      RouterModule,
      NgxSpinnerModule,
      SharedModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnDestroy {
    title = 'Course';
    public isLoading: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private router: Router,
        private spinner: NgxSpinnerService,
        private backendHealthService: BackendHealthService,
        private gtmService: GtmService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.setupNavigationInterceptor();
        // ✅ DIAGNOSTIC: Expose backend health service to window for debugging
        if (isPlatformBrowser(this.platformId)) {
            (window as any).backendHealth = this.backendHealthService;
            console.log('💡 Debug helper: Use window.backendHealth.testBackendConnection() in console to test backend');
        }
    }

    private setupNavigationInterceptor(): void {
        this.router.events
            .pipe(takeUntil(this.destroy$))
            .subscribe(event => {
                this.handleNavigationEvent(event);
            });
    }

    private handleNavigationEvent(event: any): void {
        if (event instanceof NavigationStart) {
            console.log('[AppComponent] 🔄 NavigationStart:', event.url);
            console.log('[AppComponent]   Navigation ID:', event.id);
            this.isLoading = true;
        } else if (event instanceof NavigationEnd) {
            console.log('[AppComponent] ✅ NavigationEnd:', event.url);
            console.log('[AppComponent]   Navigation ID:', event.id);
            // Track pageview in GTM using urlAfterRedirects
            this.gtmService.pushPageView(event.urlAfterRedirects);
            this.isLoading = false;
        } else if (event instanceof NavigationCancel) {
            console.warn('[AppComponent] ⚠️  NavigationCancel:', event.url);
            console.warn('[AppComponent]   Reason:', event.reason);
            console.warn('[AppComponent]   Navigation ID:', event.id);
            this.isLoading = false;
        } else if (event instanceof NavigationError) {
            console.error('[AppComponent] ❌ NavigationError:', event.url);
            console.error('[AppComponent]   Error:', event.error);
            console.error('[AppComponent]   Navigation ID:', event.id);
            this.isLoading = false;
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}

