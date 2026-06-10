import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Options for Razorpay create-order (shared revenue-share fields: UTM, coupon, referral, campaign, affiliate). */
export interface RazorpayCreateOrderOptions {
  userId?: string;
  eventId?: string;
  couponCode?: string;
  referralInstructorId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  campaignCode?: string;
  affiliateCode?: string;
}

export interface RazorpayCreateOrderResponse {
  orderId: string;
  amount: number;        // paise
  currency: string;
  keyId: string;
  courseTitle?: string;
  alreadyEnrolled?: boolean;
  enrolledFree?: boolean;
  appliedDiscounts?: string[];
}

export interface RazorpayVerifyRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  courseId?: string;
  eventId?: string;
}

/** Minimal typing for the Razorpay Checkout global injected by checkout.js. */
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (resp: unknown) => void) => void };
  }
}

@Injectable({ providedIn: 'root' })
export class RazorpayPaymentService {
  private readonly apiUrl = environment.apiUrl;
  private readonly checkoutSrc = 'https://checkout.razorpay.com/v1/checkout.js';
  private scriptPromise: Promise<boolean> | null = null;

  constructor(private http: HttpClient) {}

  /** Create a Razorpay order on the backend (applies coupon/affiliate, persists order). Amount in paise. */
  createOrder(
    amountPaise: number,
    courseId: string,
    options?: RazorpayCreateOrderOptions
  ): Observable<RazorpayCreateOrderResponse> {
    const body: Record<string, unknown> = {
      amount: amountPaise,
      courseId: options?.eventId ? '' : courseId,
      eventId: options?.eventId ?? '',
      userId: options?.userId ?? '',
      couponCode: options?.couponCode ?? '',
      referralInstructorId: options?.referralInstructorId ?? '',
      utmSource: options?.utmSource ?? '',
      utmMedium: options?.utmMedium ?? '',
      utmCampaign: options?.utmCampaign ?? '',
      affiliateCode: options?.affiliateCode ?? '',
      campaignCode: options?.campaignCode ?? ''
    };
    return this.http.post<RazorpayCreateOrderResponse>(`${this.apiUrl}api/Razorpay/create-order`, body);
  }

  /** Verify the Razorpay Checkout signature server-side and enroll the user. */
  verify(req: RazorpayVerifyRequest): Observable<{ enrolled: boolean }> {
    return this.http.post<{ enrolled: boolean }>(`${this.apiUrl}api/Razorpay/verify`, req);
  }

  /** Best-effort: record a dismissed/cancelled checkout so the order is not left dangling. */
  cancel(razorpayOrderId: string, entityId: string, entityType: 'course' | 'event' = 'course'): Observable<{ cancelled: boolean }> {
    return this.http.post<{ cancelled: boolean }>(`${this.apiUrl}api/Razorpay/cancel`, {
      razorpayOrderId,
      courseId: entityType === 'course' ? entityId : '',
      eventId: entityType === 'event' ? entityId : '',
      razorpayPaymentId: '',
      razorpaySignature: ''
    });
  }

  /** Lazy-load the Razorpay Checkout script once. Resolves true when ready. */
  loadCheckoutScript(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.Razorpay) return Promise.resolve(true);
    if (this.scriptPromise) return this.scriptPromise;

    this.scriptPromise = new Promise<boolean>((resolve) => {
      const existing = document.querySelector(`script[src="${this.checkoutSrc}"]`) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', () => resolve(false));
        if (window.Razorpay) resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = this.checkoutSrc;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
    return this.scriptPromise;
  }
}
