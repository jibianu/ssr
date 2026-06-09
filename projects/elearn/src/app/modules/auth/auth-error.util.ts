/**
 * Parse a registration/sign-up HTTP error into a user-facing message and flags.
 *
 * Backend error envelope (see ErrorResponse / ExceptionMiddleware):
 *   { success: false, statusCode, errorCode, message, messages: [message] }
 *
 * Status / errorCode mapping:
 *   409 USER_ALREADY_EXISTS        -> duplicate account (route to login)
 *   400 VALIDATION_ERROR / WEAK_PASSWORD / INVALID_PARAMETER / SIGNUP_REJECTED -> show real reason
 *   503 DATABASE_UNAVAILABLE / SERVICE_UNAVAILABLE -> temporary outage, ask to retry
 *   502 *_SERVICE_UNAVAILABLE      -> auth provider (Cognito) outage
 *   500 INTERNAL_ERROR             -> generic server error
 */
export interface RegistrationErrorInfo {
  message: string;
  errorCode: string;
  status: number;
  isAlreadyExists: boolean;
  isRetryable: boolean;
}

export function parseRegistrationError(err: any): RegistrationErrorInfo {
  const status: number = Number(err?.status ?? err?.error?.statusCode ?? err?.error?.StatusCode ?? 0);

  const errorCode: string = (
    err?.error?.errorCode ??
    err?.error?.ErrorCode ??
    ''
  ).toString().trim();

  const backendMsg = (
    err?.error?.message ??
    err?.error?.Message ??
    err?.error?.messages?.[0] ??
    err?.error?.Messages?.[0] ??
    (typeof err?.error === 'string' ? err.error : '') ??
    err?.message ??
    ''
  ).toString().trim();

  const code = errorCode.toUpperCase();

  const isAlreadyExists =
    status === 409 ||
    code === 'USER_ALREADY_EXISTS' ||
    /already exist|already registered|user.*exist|email.*exist|username.*exist/i.test(backendMsg);

  const isRetryable =
    status === 503 || status === 502 || status === 504 || status === 0 ||
    code === 'DATABASE_UNAVAILABLE' ||
    code === 'SERVICE_UNAVAILABLE' ||
    code.endsWith('_SERVICE_UNAVAILABLE') ||
    code === 'AUTH_SERVICE_THROTTLED';

  const message = friendlyMessage(status, code, backendMsg);

  return { message, errorCode: code, status, isAlreadyExists, isRetryable };
}

function friendlyMessage(status: number, code: string, backendMsg: string): string {
  if (status === 409 || code === 'USER_ALREADY_EXISTS') {
    return backendMsg || 'An account with this email already exists. Please log in.';
  }
  if (status === 503 || code === 'DATABASE_UNAVAILABLE' || code === 'SERVICE_UNAVAILABLE') {
    return 'Registration service is temporarily unavailable. Please try again in a moment.';
  }
  if (status === 502 || code.endsWith('_SERVICE_UNAVAILABLE') || code === 'AUTH_SERVICE_THROTTLED') {
    return 'Authentication service is unavailable right now. Please try again shortly.';
  }
  if (status === 0) {
    return 'Network error. Please check your connection and try again.';
  }
  if (status === 500 || code === 'INTERNAL_ERROR') {
    return backendMsg || 'Something went wrong on our end. Please try again.';
  }
  // 400 and everything else: prefer the real backend reason (weak password, invalid details, etc.)
  return backendMsg || 'Registration failed. Please check your details and try again.';
}
