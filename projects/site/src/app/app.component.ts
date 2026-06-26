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
        if (isPlatformBrowser(this.platformId) && typeof ngDevMode !== 'undefined' && ngDevMode) {
            (window as any).backendHealth = this.backendHealthService;
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
            this.isLoading = true;
        } else if (event instanceof NavigationEnd) {
            this.gtmService.pushPageView(event.urlAfterRedirects);
            this.isLoading = false;
        } else if (event instanceof NavigationCancel) {
            this.isLoading = false;
        } else if (event instanceof NavigationError) {
            this.isLoading = false;
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}

