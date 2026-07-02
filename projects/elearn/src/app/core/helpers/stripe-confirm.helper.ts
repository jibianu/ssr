import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';

export interface StripeConfirmOutcome {
  success: boolean;
  paymentIntentId?: string;
  errorMessage?: string;
  processing?: boolean;
}

function mapStripeError(error: { code?: string; message?: string; param?: string; decline_code?: string }): string {
  const message = error.message || '';
  if (error.code === 'payment_intent_authentication_failure') {
    return 'Bank authentication failed or was cancelled. Please try again or use another card.';
  }
  if (message.toLowerCase().includes('shipping information on this paymentintent was last set with a secret key')) {
    return 'Payment could not be completed. Please click Proceed to payment again to start a fresh checkout.';
  }
  if (message.toLowerCase().includes('export transactions require a description') || error.param === 'description') {
    return 'Payment could not be completed due to a configuration issue. Please try again or contact support.';
  }
  if (
    message.toLowerCase().includes('does not support this type of purchase') ||
    error.decline_code === 'transaction_not_allowed'
  ) {
    return (
      'Your bank declined this card for online payments (IDBI and some Indian banks block Stripe card charges). ' +
      'Try Razorpay on this page, use another card with e-commerce enabled, or contact your bank to allow online/international transactions.'
    );
  }
  if (error.code === 'card_declined') {
    return message || 'Your card was declined. Please try another card or contact your bank.';
  }
  return message || 'Payment could not be completed.';
}

/** Origin for checkout success / Stripe return URLs (always Elearn app, not marketing site :4200). */
export function getStripeCheckoutOrigin(): string {
  const env = environment as { elearnAppUrl?: string; googleRedirectUri?: string };
  const configured = env.elearnAppUrl?.trim().replace(/\/+$/, '');
  if (configured?.startsWith('http')) {
    return configured;
  }
  if (env.googleRedirectUri?.trim()) {
    try {
      return new URL(env.googleRedirectUri).origin.replace(/\/+$/, '');
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

/** On localhost HTTP, Stripe 3DS iframe/fingerprint often fails — use full-page redirect instead. */
export function stripeConfirmRedirectMode(): 'always' | 'if_required' {
  if (typeof window === 'undefined') {
    return 'if_required';
  }
  const host = window.location.hostname;
  const isLocalHost =
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (isLocalHost && window.location.protocol === 'http:') {
    return 'always';
  }
  return 'if_required';
}

/**
 * Confirm Payment Element charge and complete 3DS (including international cards).
 * When confirmPayment returns requires_action, explicitly runs handleNextAction
 * so AU / cross-border cards open bank verification.
 */
export async function confirmStripePaymentWith3ds(params: {
  stripe: Stripe;
  elements: StripeElements;
  clientSecret: string;
  returnUrl: string;
  receiptEmail?: string;
}): Promise<StripeConfirmOutcome> {
  const { stripe, elements, clientSecret, returnUrl, receiptEmail } = params;
  const redirectMode = stripeConfirmRedirectMode();

  // Shipping for India compliance is set server-side on PaymentIntent (secret key).
  // Do not pass shipping here — Stripe rejects publishable-key updates to server-set shipping.
  const confirmParams: { return_url: string; receipt_email?: string } = { return_url: returnUrl };
  if (receiptEmail?.trim()) {
    confirmParams.receipt_email = receiptEmail.trim();
  }

  // Stripe typings use separate overloads per redirect literal — branch to satisfy TypeScript.
  if (redirectMode === 'always') {
    const result = await stripe.confirmPayment({
      elements,
      confirmParams,
      redirect: 'always'
    });
    if (result.error) {
      return { success: false, errorMessage: mapStripeError(result.error) };
    }
    // Browser navigates to return_url; this line runs only if redirect did not occur.
    return {
      success: false,
      processing: true,
      errorMessage: 'Redirecting to complete bank verification...'
    };
  }

  const result = await stripe.confirmPayment({
    elements,
    confirmParams,
    redirect: 'if_required'
  });

  if (result.error) {
    return { success: false, errorMessage: mapStripeError(result.error) };
  }

  let pi = result.paymentIntent;

  // With redirect:'if_required', run handleNextAction when 3DS still pending (HTTPS/production).
  if (pi?.status === 'requires_action' && clientSecret) {
    const next = await stripe.handleNextAction({ clientSecret });
    if (next.error) {
      return { success: false, errorMessage: mapStripeError(next.error) };
    }
    pi = next.paymentIntent;
  }

  if (pi?.status === 'succeeded' && pi.id) {
    return { success: true, paymentIntentId: pi.id };
  }

  if (pi?.status === 'processing') {
    return {
      success: false,
      processing: true,
      paymentIntentId: pi.id,
      errorMessage: 'Payment is processing. You will get access once your bank confirms.'
    };
  }

  if (pi?.status === 'requires_action') {
    return {
      success: false,
      errorMessage:
        'Your bank requires verification. Complete the popup or redirected bank page, then click Complete purchase once.'
    };
  }

  return { success: false, errorMessage: 'Payment could not be completed. Please try again.' };
}

/** Build query string for the post-payment success page (under /checkout/success — no app role guards). */
export function stripePaymentSuccessPath(
  entityId: string,
  entityType?: 'event' | 'membership',
  extra?: Record<string, string | undefined>
): string {
  const params = new URLSearchParams({ entityId });
  if (entityType === 'event' || entityType === 'membership') {
    params.set('entityType', entityType);
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value != null && value !== '') {
        params.set(key, value);
      }
    }
  }
  return `/checkout/success?${params.toString()}`;
}

/** Absolute HTTPS return URL for Stripe 3DS redirects (must match live domain). */
export function stripePaymentReturnUrl(entityId: string, entityType?: 'event' | 'membership'): string {
  if (typeof window === 'undefined') {
    return stripePaymentSuccessPath(entityId, entityType);
  }
  const origin = getStripeCheckoutOrigin();
  return `${origin}${stripePaymentSuccessPath(entityId, entityType)}`;
}
/** Shared Payment Element options for embedded checkout (course + event). */
export function stripePaymentElementOptions(): Record<string, unknown> {
  return {
    layout: 'tabs',
    defaultCollapsed: false,
    radios: true,
    spacing: 'tight',
    // Link calls POST /v1/consumers/sessions/lookup; 404 when Link is not enabled on the account.
    wallets: {
      applePay: 'never',
      googlePay: 'never',
      link: 'never'
    },
    fields: {
      billingDetails: {
        name: 'auto',
        email: 'auto',
        address: {
          country: 'auto',
          line1: 'auto',
          city: 'auto',
          state: 'auto',
          postalCode: 'auto'
        }
      }
    }
  };
}
