import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { SsrResponseStatusService } from '../../../core/services/ssr-response-status.service';

@Component({
    selector: 'app-page-not-found',
    templateUrl: './page-not-found.component.html',
    styleUrls: ['./page-not-found.component.scss'],
    standalone: true,
    imports: [CommonModule],
    // ✅ FIX: Move ngSkipHydration to component host element (required by Angular)
    host: {
      'ngSkipHydration': 'true'
    }
})
export class PageNotFoundComponent implements OnInit {
  private readonly ssrStatus = inject(SsrResponseStatusService);

  ngOnInit(): void {
    // SSR must answer unknown routes with a real 404, not a soft-404 (200).
    this.ssrStatus.setNotFound();
  }
}
