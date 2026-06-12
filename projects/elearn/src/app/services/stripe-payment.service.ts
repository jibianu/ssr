import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreatePaymentIntentRequest {
  amount: number;   // in paise (e.g. 199900 = ₹1999)
  courseId: string;
  userId?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId?: string;
}

export interface EnsureEnrollmentRequest {
  courseId: string;
  paymentIntentId: string;
}

/** Options for create-order (revenue share: UTM, coupon, referral, campaign, affiliate). */
export interface CreateOrderOptions {
  userId?: string;
  couponCode?: string;
  referralInstructorId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** Marketing campaign code (cmp). */
  campaignCode?: string;
  /** Affiliate tracking code (aff). */
  affiliateCode?: string;
}

export interface CreateOrderResponse {
  paymentIntentId: string;
  clientSecret: string;
  enrolledFree?: boolean;
  finalAmountPaise?: number;
}

@Injectable({ providedIn: 'root' })
export class StripePaymentService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Create order with revenue-share channel (UTM/coupon/referral), then create PaymentIntent.
   * Use this for checkout so Order + OrderRevenueSplits are created on confirm.
   */
  createOrder(
    amountPaise: number,
    courseId: string,
    options?: CreateOrderOptions
  ): Observable<CreateOrderResponse> {
    const body: Record<string, unknown> = {
      amount: amountPaise,
      courseId,
      userId: options?.userId ?? '',
      couponCode: options?.couponCode ?? '',
      referralInstructorId: options?.referralInstructorId ?? '',
      utmSource: options?.utmSource ?? '',
      utmMedium: options?.utmMedium ?? '',
      utmCampaign: options?.utmCampaign ?? '',
      affiliateCode: options?.affiliateCode ?? '',
      campaignCode: options?.campaignCode ?? ''
    };
    return this.http.post<CreateOrderResponse>(
      `${this.apiUrl}api/Checkout/create-order`,
      body
    );
  }

  /**
   * Confirm payment and create Order + OrderRevenueSplits (when order was created via create-order).
   * Call on the success page after Stripe redirect.
   */
  confirmPayment(courseId: string, paymentIntentId: string): Observable<{ enrolled: boolean }> {
    return this.http.post<{ enrolled: boolean }>(
      `${this.apiUrl}api/Payments/confirm`,
      { courseId, paymentIntentId }
    );
  }

  /**
   * Create a PaymentIntent for the Payment Element (cards, UPI).
   * UPI works with Google Pay, PhonePe, Paytm apps. Returns clientSecret to mount Stripe Elements.
   * Prefer createOrder() for checkout so revenue share is tracked.
   */
  createPaymentIntent(amountPaise: number, courseId: string, userId?: string): Observable<CreatePaymentIntentResponse> {
    const body: CreatePaymentIntentRequest = { amount: amountPaise, courseId };
    if (userId) body.userId = userId;
    return this.http.post<CreatePaymentIntentResponse>(
      `${this.apiUrl}api/Payments/create-intent`,
      body
    );
  }

  /**
   * Ensures the user is enrolled for the course after payment success.
   * Call this on the success page so enrollment is applied even if the webhook is delayed.
   * Prefer confirmPayment() when checkout used create-order.
   */
  ensureEnrollment(courseId: string, paymentIntentId: string): Observable<{ enrolled: boolean }> {
    return this.http.post<{ enrolled: boolean }>(
      `${this.apiUrl}api/Payments/ensure-enrollment`,
      { courseId, paymentIntentId }
    );
  }
}
