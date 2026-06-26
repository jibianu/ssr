import { stripeConfirmRedirectMode, stripePaymentReturnUrl, stripePaymentSuccessPath } from './stripe-confirm.helper';

describe('stripeConfirmRedirectMode', () => {
  it('uses always redirect on localhost HTTP', () => {
    expect(stripeConfirmRedirectMode()).toBe('always');
  });
});

describe('stripePaymentSuccessPath', () => {
  it('builds checkout success URL with encoded entity id', () => {
    expect(stripePaymentSuccessPath('course-123')).toContain('/checkout/success?');
    expect(stripePaymentSuccessPath('course-123')).toContain('entityId=course-123');
  });

  it('includes entityType=event for event checkout', () => {
    expect(stripePaymentSuccessPath('evt-1', 'event')).toContain('entityType=event');
  });

  it('appends extra query params when provided', () => {
    const path = stripePaymentSuccessPath('c1', undefined, { payment_intent: 'pi_123', redirect_status: 'succeeded' });
    expect(path).toContain('payment_intent=pi_123');
    expect(path).toContain('redirect_status=succeeded');
  });
});

describe('stripePaymentReturnUrl', () => {
  it('uses checkout success path', () => {
    expect(stripePaymentReturnUrl('course-123')).toContain('/checkout/success');
  });
});
