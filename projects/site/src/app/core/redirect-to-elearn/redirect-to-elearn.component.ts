import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';

/**
 * Redirects to the merged Elearn app (login/auth) so all auth flows use the e-learning app.
 */
@Component({
  selector: 'app-redirect-to-elearn',
  standalone: false,
  template: `<div class="p-4 text-center">Redirecting to login…</div>`,
  styles: [`:host { display: block; }`]
})
export class RedirectToElearnComponent implements OnInit {
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const base = (environment as { elearnAppUrl?: string }).elearnAppUrl || '/Elearn';
    const query = this.route.snapshot.queryParams;
    const returnUrl = query['returnUrl'];
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    const target = `${base.replace(/\/$/, '')}/auth/login${params}`;
    window.location.href = target;
  }
}
