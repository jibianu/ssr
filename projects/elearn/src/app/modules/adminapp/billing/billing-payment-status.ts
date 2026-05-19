/** Matches backend Courses.Domain.Enums.BillingPaymentStatus */
export const BILLING_PAYMENT_STATUS_OPTIONS = [
  { id: 0, label: 'Draft' },
  { id: 1, label: 'Pending' },
  { id: 2, label: 'Paid' },
  { id: 3, label: 'Overdue' },
  { id: 4, label: 'Failed' },
  { id: 5, label: 'Cancelled' }
] as const;

export const BILLING_PAYMENT_STATUS_PAID = 2;

export function isBillingPaid(paymentStatusId: number, paymentStatus?: string): boolean {
  return paymentStatusId === BILLING_PAYMENT_STATUS_PAID
    || (paymentStatus || '').toLowerCase() === 'paid';
}
