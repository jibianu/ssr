import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { appShellRedirectForSlug } from '../helpers/app-shell-paths';

/**
 * Reserved public-site paths (e.g. /dashboard) must load the Elearn SPA, not the slug resolver.
 */
@Component({
  selector: 'app-redirect-to-app-shell',
  standalone: true,
  template: `<div class="p-4 text-center">Loading your workspace…</div>`,
})
export class RedirectToAppShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const seg =
      this.route.snapshot.routeConfig?.path ??
      this.route.snapshot.paramMap.get('slug') ??
      '';
    const target = appShellRedirectForSlug(seg);
    if (target && typeof window !== 'undefined') {
      window.location.replace(target);
    }
  }
}
