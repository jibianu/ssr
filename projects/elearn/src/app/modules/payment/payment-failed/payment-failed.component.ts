import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

const RESERVATION_SECONDS = 10 * 60; // 10 minutes

@Component({
  selector: 'app-payment-failed',
  templateUrl: './payment-failed.component.html',
  styleUrls: ['./payment-failed.component.scss'],
  standalone: false
})
export class PaymentFailedComponent implements OnInit, OnDestroy {
  orderId = '';
  courseName = '';
  amount: number | null = null;

  remainingSeconds = RESERVATION_SECONDS;
  formattedTime = '10:00';
  reservationExpired = false;

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.orderId = params['orderId'] ?? params['entityId'] ?? '';
      this.courseName = params['courseName'] ?? '';
      const amt = params['amount'];
      this.amount = amt != null && amt !== '' ? Number(amt) : null;

      if (!this.orderId) {
        this.router.navigate(['/app/student/courses']);
        return;
      }
      this.startTimer();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimer();
  }

  private startTimer(): void {
    this.remainingSeconds = RESERVATION_SECONDS;
    this.updateFormattedTime();
    this.reservationExpired = false;

    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      this.updateFormattedTime();

      if (this.remainingSeconds <= 0) {
        this.reservationExpired = true;
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateFormattedTime(): void {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    this.formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  retryPayment(): void {
    if (this.reservationExpired || !this.orderId) return;
    this.router.navigate(['/checkout', this.orderId]);
  }
}
