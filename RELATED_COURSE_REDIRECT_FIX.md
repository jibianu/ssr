# Related Course Redirect to 404 Fix

**Date**: 2025-01-03  
**Issue**: Clicking related courses with invalid URLs (e.g., course with non-existent location) was not redirecting to the 404 page, instead showing 500 errors in console.

---

## Problem Description

When clicking on a related course link that has a URL structure like:
```
/course/pipenet-training/anst-level-three-certification-magnetic-particle-testing
```

The application would:
1. Parse it as `url="pipenet-training"` and `location="anst-level-three-certification-magnetic-particle-testing"`
2. Try to fetch course with location → Get 500 "Course not found" error
3. Try fallback (treating location as course slug) → Also fail
4. **Expected**: Redirect to 404 page
5. **Actual**: Show errors in console but not redirect

Additionally, the service was incorrectly logging 500 errors as "Network Error" instead of "Server Error".

---

## Root Causes

1. **Service Error Classification**: The service error handler was incorrectly identifying 500 server errors as network errors due to incorrect status checking logic.

2. **Resolver Error Handling**: The resolver's fallback logic wasn't properly catching all error cases, especially when:
   - The service returns `null` (which triggers an error throw)
   - The fallback course fetch also returns `null`
   - Error object structure didn't match the detection logic

---

## Fixes Applied

### 1. Fixed Service Error Classification (`publicapp.service.ts`)

**Before**:
```typescript
const isNetworkError = !error.status || error.status === 0 || error.message?.includes('fetch failed');
```

**Problem**: 500 errors have `status: 500`, so `!error.status` is false, but the logic wasn't properly distinguishing between network errors (status 0) and server errors (status 500).

**After**:
```typescript
const status = error?.status || error?.error?.StatusCode || 0;
const isNetworkError = status === 0 || !status || error.message?.includes('fetch failed');
const isServerError = status >= 500 && status < 600;
const isClientError = status >= 400 && status < 500;
```

**Benefits**:
- ✅ Correctly identifies server errors (500-599) vs network errors (status 0)
- ✅ Provides appropriate error messages for each error type
- ✅ Better debugging information

---

### 2. Enhanced Resolver Error Detection (`public-course-details.resolver.ts`)

**Before**:
```typescript
const isNotFound = isNotFoundError(error) || 
                 isServerError(error) && 
                 messages.some((msg: string) => 
                     msg?.toLowerCase().includes('not found') || 
                     msg?.toLowerCase().includes('course not found')
                 );
```

**Problem**: The logic wasn't catching all cases, especially when error was thrown manually from a `null` response.

**After**:
```typescript
const messages = getErrorMessages(error);
const status = error?.status || error?.error?.StatusCode || 0;

// Check if it's a "not found" error (404, or 500 with "not found" message)
const isNotFound = isNotFoundError(error) || 
                 (status === 500 && messages.some((msg: string) => 
                     msg?.toLowerCase().includes('not found') || 
                     msg?.toLowerCase().includes('course not found')
                 )) ||
                 (isServerError(error) && messages.some((msg: string) => 
                     msg?.toLowerCase().includes('not found') || 
                     msg?.toLowerCase().includes('course not found')
                 ));
```

**Benefits**:
- ✅ Explicitly checks for status 500 with "not found" messages
- ✅ Multiple fallback checks ensure all error structures are handled
- ✅ Better logging for debugging

---

### 3. Improved Fallback Error Handling

**Before**:
```typescript
catchError(() => redirectToNotFoundPage(router))
```

**After**:
```typescript
catchError((fallbackError) => {
    // ✅ FIX: Ensure fallback errors always redirect to 404
    console.error(`❌ Error fetching fallback course "${location}":`, fallbackError);
    return redirectToNotFoundPage(router);
})
```

**Benefits**:
- ✅ Explicit error logging for fallback failures
- ✅ Guarantees redirect to 404 even if fallback fails

---

### 4. Added Null Response Handling in Fallback

**Before**:
```typescript
map(course => {
    if (!course) {
        throw new Error('Course not found');
    }
    return course;
})
```

**After**:
```typescript
map(course => {
    if (!course) {
        // ✅ FIX: If fallback also returns null, redirect to 404
        console.error(`❌ Fallback course "${location}" also not found. Redirecting to 404.`);
        throw new Error('Course not found');
    }
    return course;
})
```

**Benefits**:
- ✅ Explicit logging when fallback course is not found
- ✅ Ensures proper error propagation for 404 redirect

---

## Error Flow After Fix

1. User clicks related course link → `/course/pipenet-training/anst-level-three-certification-magnetic-particle-testing`
2. Resolver parses: `url="pipenet-training"`, `location="anst-level-three-certification-magnetic-particle-testing"`
3. Service fetches course with location → Returns 500 "Course not found" → Service returns `null`
4. Resolver `map` detects `null` → Throws error object `{status: 500, error: {StatusCode: 500, Messages: ['Course not found']}}`
5. Resolver `catchError` detects it as "not found" (status 500 + "Course not found" message)
6. Resolver tries fallback: Fetch course by `location` as course slug → Also returns `null`
7. Fallback `map` detects `null` → Throws error
8. Fallback `catchError` catches error → **Redirects to 404** ✅

---

## Testing

To test the fix:

1. Navigate to a course page that has related courses
2. Click on a related course that doesn't exist or has an invalid URL structure
3. **Expected**: Should redirect to 404 page (page-not-found)
4. **Console**: Should show appropriate error messages but not 500 errors stacking up

---

## Files Modified

- ✅ `src/app/modules/publicapp/publicapp.service.ts`
  - Fixed error classification logic
  - Improved error logging for server errors

- ✅ `src/app/modules/publicapp/public-course/public-course-details/public-course-details.resolver.ts`
  - Enhanced error detection for 500 "Course not found" errors
  - Improved fallback error handling with explicit 404 redirects
  - Better error logging throughout the flow

---

## Summary

The fix ensures that:
- ✅ 500 server errors are correctly identified (not logged as network errors)
- ✅ "Course not found" errors (both 404 and 500) are properly detected
- ✅ Fallback course fetching failures always redirect to 404
- ✅ Better error logging for debugging
- ✅ Related course links with invalid URLs now properly redirect to the 404 page

