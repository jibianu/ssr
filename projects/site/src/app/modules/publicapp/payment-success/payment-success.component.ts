import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PublicAppService } from '../publicapp.service';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentSuccessComponent implements OnInit {
  verifying = true;
  success = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicApp: PublicAppService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id') || '';
    const entityId = this.route.snapshot.queryParamMap.get('entityId') || '';
    if (!sessionId || !entityId) {
      this.verifying = false;
      this.error = 'Invalid success link. Missing session or course.';
      return;
    }
    if (!isPlatformBrowser(this.platformId)) {
      this.verifying = false;
      return;
    }
    this.publicApp.verifyPayment(sessionId, entityId).subscribe({
      next: (ok) => {
        this.verifying = false;
        if (ok) {
          this.success = true;
          this.router.navigate(['/app/my-courses']).catch(() => {
            window.location.href = '/app/my-courses';
          });
        } else {
          this.error = 'We could not confirm your payment. If you were charged, contact support.';
        }
      },
      error: () => {
        this.verifying = false;
        this.error = 'We could not confirm your payment. If you were charged, contact support.';
      }
    });
  }
}
