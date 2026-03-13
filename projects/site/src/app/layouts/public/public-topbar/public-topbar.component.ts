import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, PLATFORM_ID, Inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { SharedModule } from 'src/app/shared/shared.module';
import { environment } from 'src/environments/environment';
import { PublicAppService } from 'src/app/modules/publicapp/publicapp.service';

// ✅ PERFORMANCE: OnPush change detection for faster change detection (30-50% improvement)
// ✅ HYDRATION: SSR-safe - menu visibility state handled in browser only
@Component({
    selector: 'app-public-topbar',
    standalone: true,
    templateUrl: './public-topbar.component.html',
    styleUrls: ['./public-topbar.component.scss'],
    imports: [
      CommonModule,
      RouterLink,
      SharedModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicTopbarComponent implements OnInit, OnDestroy {
  @ViewChild('searchContainer') searchContainerRef: ElementRef<HTMLElement> | null = null;

  private readonly isBrowser: boolean;
  private isDestroyed: boolean = false; // ✅ SSR FIX: Track destruction state
  private searchSubject = new Subject<string>();
  private searchSub: any = null;

  // ✅ HYDRATION: Initialize as false for SSR, updated in browser only
  isVisible: boolean = false;

  /** Topbar course search (2+ chars triggers API). */
  searchText = '';
  searchResults: { id: string; title: string; slug: string }[] = [];
  searchLoading = false;
  showDropdown = false;

  /** Elearn app base URL for login/register (from environment). */
  get elearnBaseUrl(): string {
    const base = (environment as { elearnAppUrl?: string }).elearnAppUrl || '';
    return base.trim().replace(/\/$/, '');
  }
  get loginUrl(): string {
    return this.elearnBaseUrl ? `${this.elearnBaseUrl}/auth/login` : '/auth/login';
  }
  get registerUrl(): string {
    return this.elearnBaseUrl ? `${this.elearnBaseUrl}/auth/register` : '/auth/register';
  }

  constructor(
    private cdr: ChangeDetectorRef, // ✅ PERFORMANCE: Required for OnPush - manually trigger change detection
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private publicApp: PublicAppService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.searchSub = this.searchSubject.pipe(
        debounceTime(300),
        switchMap(term => this.publicApp.searchCourses(term))
      ).subscribe(results => {
        this.searchResults = results;
        this.searchLoading = false;
        this.showDropdown = this.searchText.trim().length >= 2;
        this.cdr.markForCheck();
      });
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.searchSub) {
      this.searchSub.unsubscribe();
      this.searchSub = null;
    }
    if (this.isBrowser && this.isVisible) {
      try {
        this.lockBodyScroll(false);
      } catch (error) {
        // Silently handle errors during cleanup
      }
    }
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input?.value ?? '';
    if (this.searchText.trim().length < 2) {
      this.searchResults = [];
      this.showDropdown = false;
      this.cdr.markForCheck();
      return;
    }
    this.searchLoading = true;
    this.showDropdown = true;
    this.searchSubject.next(this.searchText.trim());
    this.cdr.markForCheck();
  }

  onSearchFocus(): void {
    if (this.searchText.trim().length >= 2 && this.searchResults.length > 0) {
      this.showDropdown = true;
      this.cdr.markForCheck();
    }
  }

  onSelectCourse(course: { id: string; title: string; slug: string }): void {
    const slug = (course?.slug ?? '').trim();
    if (!slug) return;
    this.searchText = '';
    this.searchResults = [];
    this.showDropdown = false;
    this.cdr.markForCheck();
    this.closeMenu();
    this.router.navigate(['/', slug]).catch(() => {});
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isBrowser || !this.searchContainerRef?.nativeElement?.contains(event.target as Node)) {
      this.showDropdown = false;
      this.cdr.markForCheck();
    }
  }

  // ✅ ESC key handler to close menu - SSR safe
  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    // ✅ SSR FIX: Check if component is not destroyed before accessing services
    if (this.isBrowser && !this.isDestroyed && this.isVisible) {
      try {
        this.closeMenu();
      } catch (error: any) {
        // Silently handle injector errors during SSR or after destruction
        if (error?.code !== 205) {
          console.warn('Menu close error:', error);
        }
      }
    }
  }

  // ✅ Lock/unlock body scroll when menu is open
  private lockBodyScroll(lock: boolean): void {
    if (!this.isBrowser) return;
    
    if (lock) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
  }

  // ✅ PERFORMANCE: Toggle visibility and trigger change detection for OnPush
  toggleVisibility(): void {
    if (this.isBrowser && !this.isDestroyed) {
      try {
        this.isVisible = true;
        this.lockBodyScroll(true);
        this.cdr.markForCheck(); // ✅ PERFORMANCE: Trigger change detection for OnPush
      } catch (error: any) {
        // Silently handle injector errors during SSR or after destruction
        if (error?.code !== 205) {
          console.warn('Toggle visibility error:', error);
        }
      }
    }
  }

  // ✅ PERFORMANCE: Close menu and trigger change detection for OnPush
  closeMenu(): void {
    if (this.isBrowser && !this.isDestroyed) {
      try {
        this.isVisible = false;
        this.lockBodyScroll(false);
        this.cdr.markForCheck();
      } catch (error: any) {
        // Silently handle injector errors during SSR or after destruction
        if (error?.code !== 205) {
          console.warn('Close menu error:', error);
        }
      }
    }
  }

  // ✅ PERFORMANCE: Toggle invisibility and trigger change detection for OnPush
  toggleinVisibility(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.closeMenu();
  }

  // Navigate to courses page - SSR safe
  navigateToCourses(): void {
    if (this.isBrowser && !this.isDestroyed && this.router) {
      try {
        this.router.navigate(['/courses']).catch((error: any) => {
          // Only log if not an injector error (code 205)
          if (error?.code !== 205) {
            console.error('Navigation error:', error);
          }
        });
      } catch (error: any) {
        // Silently handle injector errors during SSR
        if (error?.code !== 205) {
          console.warn('Navigation error:', error);
        }
      }
    }
  }
}

 