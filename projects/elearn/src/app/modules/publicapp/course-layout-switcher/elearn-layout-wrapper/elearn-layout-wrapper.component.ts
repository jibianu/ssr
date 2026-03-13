import { Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthenticationService } from '../../../auth/auth.service';
import { SharedService } from '../../../../shared/service/shared-service.service';

/**
 * Wraps content with Elearn sidebar + topbar (same chrome as student layout).
 * Used when user is logged in on /courses/:slug so the same canonical URL shows student chrome.
 */
@Component({
  selector: 'app-elearn-layout-wrapper',
  templateUrl: './elearn-layout-wrapper.component.html',
  styleUrls: ['./elearn-layout-wrapper.component.scss'],
  standalone: false
})
export class ElearnLayoutWrapperComponent {
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  logoIconUrl = 'assets/img/oilandgas_club.svg';
  user: any = null;
  sidebarAvatarError = false;
  profileImageUrlOverride: string | null = null;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private authService: AuthenticationService,
    private sharedService: SharedService,
    private router: Router
  ) {
    this.user = this.authService.currentUser();
    this.sharedService.profileImageUrl$.subscribe(url => {
      this.profileImageUrlOverride = url;
      this.sidebarAvatarError = false;
    });
  }

  get profileImageUrl(): string | null {
    return this.profileImageUrlOverride ?? this.user?.profilePictureUrl ?? this.user?.ProfilePictureUrl ?? null;
  }

  get userInitial(): string {
    if (!this.user) return '?';
    const name = (this.user.firstName || this.user.userName || this.user.email || '').trim();
    return (name.charAt(0) || (this.user.email || '?').charAt(0)).toUpperCase();
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

  /** True when viewing a public course page (/courses/...) so Explore is highlighted in sidebar. */
  isExploreActive(): boolean {
    const url = this.router.url.split('?')[0];
    return url.startsWith('/courses/');
  }
}
