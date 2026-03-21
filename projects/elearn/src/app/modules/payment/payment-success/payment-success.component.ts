import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { StripePaymentService } from '../../../services/stripe-payment.service';
import { StudentDashboardApiService } from '../../student/student-dashboard-api.service';

@Component({
    selector: 'app-payment-success',
    templateUrl: './payment-success.component.html',
    styleUrls: ['./payment-success.component.scss'],
    standalone: false
})
export class PaymentSuccessComponent implements OnInit {

  sessionId = '';
  entityId = '';
  entityType = '';
  subscription: Subscription = new Subscription();
  constructor(
    private route: ActivatedRoute,
    private appService: AdminAppService,
    private stripePaymentService: StripePaymentService,
    private studentApi: StudentDashboardApiService,
    private router: Router
  ) {
    const q = route.snapshot.queryParams || {};
    this.sessionId = q['session_id'] || '';
    this.entityId = q['entityId'] || '';
    this.entityType = q['entityType'] || '';
  }

  ngOnInit(): void {
    // Event: Payment Element return – confirm event registration then go to event detail.
    if (this.entityType === 'event' && this.entityId) {
      const paymentIntentId = sessionStorage.getItem('paymentIntentId_' + this.entityId);
      const goToEvent = () => this.router.navigate(['/app/student/events/event', this.entityId], { queryParams: { registered: 'true' } });
      if (paymentIntentId) {
        sessionStorage.removeItem('paymentIntentId_' + this.entityId);
        this.subscription.add(
          this.studentApi.confirmEventPaymentIntent(paymentIntentId).subscribe({
            next: goToEvent,
            error: goToEvent
          })
        );
      } else {
        goToEvent();
      }
      return;
    }

    // Course: Payment Element return – ensure enrollment, set course in localStorage, then go to course (curriculum page).
    if (this.entityId && !this.sessionId) {
      const paymentIntentId = sessionStorage.getItem('paymentIntentId_' + this.entityId);
      const goToCourse = () => {
        this.appService.getCourseByCourseID(this.entityId, true).subscribe({
          next: (course: any) => {
            if (course) localStorage.setItem('course', JSON.stringify(course));
            this.router.navigate(['/app/student/course', this.entityId]);
          },
          error: () => this.router.navigate(['/app/student/course', this.entityId])
        });
      };
      if (paymentIntentId) {
        sessionStorage.removeItem('paymentIntentId_' + this.entityId);
        this.subscription.add(
          this.stripePaymentService.confirmPayment(this.entityId, paymentIntentId).subscribe({
            next: goToCourse,
            error: goToCourse
          })
        );
      } else {
        goToCourse();
      }
      return;
    }
    // Legacy Checkout Session: verify session then redirect to course curriculum.
    if (!this.sessionId || !this.entityId) {
      this.router.navigate(['/app/student/courses']);
      return;
    }
    const data = { entityId: this.entityId, sessionId: this.sessionId };
    this.subscription.add(
      this.appService.verifyPayment(this.sessionId, data)
        .pipe(
          switchMap((res1: any) =>
            this.appService.getCourseById(this.entityId).pipe(
              switchMap((res2: any) => {
                const userId = res2?.loggedInUserId;
                const obj = {
                  courseId: this.entityId,
                  userId,
                  startDate: new Date(),
                  endDate: new Date(),
                  noOfUsers: 1,
                  isSelected: true
                };
                return this.appService.addEnrollCourse(obj);
              })
            )
          )
        )
        .subscribe({
          next: () => this.router.navigate(['/app/student/course', this.entityId]),
          error: () => this.router.navigate(['/app/student/courses'])
        })
    );
  }

}
