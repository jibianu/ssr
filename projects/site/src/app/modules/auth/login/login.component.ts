import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, NavigationStart, NavigationEnd, NavigationError, NavigationCancel, Event } from '@angular/router';
import { first } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthenticationService } from './../auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { environment } from 'src/environments/environment';

// ✅ PERFORMANCE: OnPush change detection for faster change detection (30-50% improvement)
@Component({
  selector: 'app-login',
  standalone : false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit, OnDestroy {

  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  returnUrl = '/';
  error = '';
  private subscription = new Subscription();
  logoUrl = environment.logoUrl;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef, // ✅ PERFORMANCE: Required for OnPush - manually trigger change detection after async operations
    private ngZone: NgZone // ✅ FIX: Use NgZone to ensure navigation runs in Angular zone
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    // read returnUrl from query params
    
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/course/list';
    console.log('[LoginComponent] ✅ returnUrl:', this.returnUrl);
  }

  // getter for form controls
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.cdr.markForCheck(); // ✅ PERFORMANCE: Trigger change detection for OnPush

    // ✅ PERFORMANCE: Add subscription to cleanup on destroy
        this.subscription.add(
      this.authenticationService.login(this.f['username'].value, this.f['password'].value)
        .pipe(first())
        .subscribe({
          next: data => {
            if (data) {
              // ✅ FIX: Add small delay to ensure token is fully stored before calling getUserInfo
              // This prevents race conditions where getUserInfo is called before token is in localStorage
              setTimeout(() => {
                // ✅ CRITICAL: Verify ID Token is available before calling getUserInfo
                const token = this.authenticationService.getIdToken();
                if (token) {
                  console.log('[LoginComponent] ✅ ID Token available after login, calling getUserInfo()');
                  this.getUserInfo();
                } else {
                  console.error('[LoginComponent] ❌ ID Token NOT available after login!');
                  console.error('[LoginComponent]   This will cause 401 error on getUserInfo()');
                  this.error = 'Login successful but ID token not stored. Please try again.';
                  this.loading = false;
                  this.cdr.markForCheck();
                  return;
                }
              }, 100); // Small delay to ensure storage is complete
              
              this.toasterService.showSuccess('Logged in successfully');
              this.cdr.markForCheck(); // ✅ PERFORMANCE: Trigger change detection for OnPush after login
            }
          },
          error: (err) => {
            this.error =
              typeof err === 'string'
                ? err
                : err?.error?.message ?? err?.message ?? 'Login failed';
            this.loading = false;
            this.cdr.markForCheck(); // ✅ PERFORMANCE: Trigger change detection for OnPush on error
          }
        })
    );
  }

  private getUserInfo() {
    // ✅ PERFORMANCE: Add subscription to cleanup on destroy
    this.subscription.add(
      this.authenticationService.getUserInfo().pipe(first()).subscribe({
        next: (data: any) => {
          this.loading = false; // ✅ FIX: Always reset loading state
          this.cdr.markForCheck();
          
          if (data) {
            console.log('[LoginComponent] ✅ User info loaded successfully (200 OK)');
            console.log('[LoginComponent]   User data:', data);
            console.log('[LoginComponent]   Return URL:', this.returnUrl);
            console.log('[LoginComponent]   Current router URL before navigation:', this.router.url);
            
            // ✅ FIX: Ensure token is loaded in memory before navigation
            // Force token load to avoid timing issues with the guard
            const token = this.authenticationService.getIdToken();
            const hasValidToken = this.authenticationService.hasValidAccessToken();
            
            console.log('[LoginComponent] 🔍 Pre-navigation token check:');
            console.log('[LoginComponent]   ID Token available:', !!token);
            console.log('[LoginComponent]   ID Token length:', token?.length ?? 0);
            console.log('[LoginComponent]   hasValidAccessToken():', hasValidToken);
            
            // ✅ FIX: Since /getinfo returned 200 OK, we know the token is valid
            // Navigate immediately - use a small delay to ensure token is in memory
            console.log('[LoginComponent] 🚀 Starting navigation to:', this.returnUrl);
            
            // ✅ FIX: Force load tokens from storage into memory before navigation
            // This ensures the guard can validate the tokens
            this.authenticationService.ensureTokensLoaded();
            
            // Verify tokens are loaded
            const verifyToken = this.authenticationService.getIdToken();
            const verifyValid = this.authenticationService.hasValidAccessToken();
            
            console.log('[LoginComponent] 🔄 Pre-navigation token verification:');
            console.log('[LoginComponent]   ID Token available:', !!verifyToken);
            console.log('[LoginComponent]   hasValidAccessToken():', verifyValid);
            
            if (!verifyToken) {
              console.error('[LoginComponent] ❌ CRITICAL: ID Token not available after force load!');
              console.error('[LoginComponent]   This will cause navigation to fail');
              this.error = 'Authentication token not loaded. Please try logging in again.';
              this.cdr.markForCheck();
              return;
            }
            
            // Navigate using Angular zone to ensure proper change detection
            // Add a small delay to ensure all async operations complete
            setTimeout(() => {
              this.ngZone.run(() => {
                console.log('[LoginComponent] 🚀 Executing navigation to:', this.returnUrl);
                console.log('[LoginComponent]   Router URL before navigation:', this.router.url);
                
                // ✅ FIX: Use the exact returnUrl - let Angular routing handle redirects
                // Navigate to /app/course and let the route redirect to /app/course/list
                console.log('[LoginComponent]   Navigating to:', this.returnUrl);
                console.log('[LoginComponent]   (Route will auto-redirect to /app/course/list if configured)');
                
              // ✅ FIX: Subscribe to router events to see what's happening
              // Track all navigation events for the next 5 seconds to catch redirects and lazy loading
              const subscription = this.router.events.subscribe((event: Event) => {
                if (event instanceof NavigationStart) {
                  console.log('[LoginComponent] 🔄 NavigationStart event');
                  console.log('[LoginComponent]   URL:', event.url);
                  console.log('[LoginComponent]   Navigation ID:', event.id);
                } else if (event instanceof NavigationEnd) {
                  console.log('[LoginComponent] ✅ NavigationEnd event');
                  console.log('[LoginComponent]   Final URL:', event.url);
                  console.log('[LoginComponent]   Navigation ID:', event.id);
                  console.log('[LoginComponent]   Router URL after NavigationEnd:', this.router.url);
                  // Don't unsubscribe - keep tracking for redirects
                } else if (event instanceof NavigationError) {
                  console.error('[LoginComponent] ❌ NavigationError event');
                  console.error('[LoginComponent]   Error:', event.error);
                  console.error('[LoginComponent]   Error message:', event.error?.message);
                  console.error('[LoginComponent]   Error stack:', event.error?.stack);
                  console.error('[LoginComponent]   URL:', event.url);
                  console.error('[LoginComponent]   Navigation ID:', event.id);
                  // Don't unsubscribe - might be followed by another navigation
                } else if (event instanceof NavigationCancel) {
                  console.warn('[LoginComponent] ⚠️  NavigationCancel event');
                  console.warn('[LoginComponent]   URL:', event.url);
                  console.warn('[LoginComponent]   Reason:', event.reason);
                  console.warn('[LoginComponent]   Navigation ID:', event.id);
                  // Don't unsubscribe - might be followed by another navigation
                }
              });
              
              // Unsubscribe after 5 seconds to prevent memory leaks
              setTimeout(() => {
                subscription.unsubscribe();
                console.log('[LoginComponent] 🔇 Stopped tracking router events');
              }, 5000);
              
              // ✅ FIX: Ensure we navigate to the full path, not relying on redirects
              // Navigate directly to /app/course/list to avoid redirect issues
              const targetUrl = this.returnUrl === '/app/course' ? '/app/course/list' : this.returnUrl;
              console.log('[LoginComponent] 📤 Calling router.navigateByUrl()...');
              console.log('[LoginComponent]   Original returnUrl:', this.returnUrl);
              console.log('[LoginComponent]   Target URL (after redirect fix):', targetUrl);
              this.router.navigateByUrl(targetUrl, { 
                skipLocationChange: false,
                replaceUrl: false
              }).then(
                (success: boolean) => {
                  console.log('[LoginComponent] ⚡ Navigation promise resolved:', success);
                  console.log('[LoginComponent]   Current router URL:', this.router.url);
                  
                  if (!success) {
                    console.error('[LoginComponent] ❌ Navigation promise returned FALSE');
                    console.error('[LoginComponent]   This usually means the route was blocked or not found');
                    console.error('[LoginComponent]   Current URL:', this.router.url);
                    this.error = 'Navigation was blocked or route not found.';
                    subscription.unsubscribe();
                    this.cdr.markForCheck();
                    return;
                  }
                  
                  // Check actual navigation result after a delay to allow redirects and lazy loading
                  setTimeout(() => {
                    const finalUrl = this.router.url;
                    const targetUrl = this.returnUrl === '/app/course' ? '/app/course/list' : this.returnUrl;
                    console.log('[LoginComponent] 📍 Checking final URL after navigation:');
                    console.log('[LoginComponent]   Current URL:', finalUrl);
                    console.log('[LoginComponent]   Target was:', targetUrl);
                    console.log('[LoginComponent]   Navigation succeeded:', success);
                    
                    if (finalUrl.includes('/page-not-found')) {
                      console.error('[LoginComponent] ❌ NAVIGATION FAILED - Ended at 404 page!');
                      console.error('[LoginComponent] ⚠️  DIAGNOSIS: Route not found in routing config');
                      console.error('[LoginComponent]   Expected:', targetUrl);
                      console.error('[LoginComponent]   Got: /page-not-found');
                      console.error('[LoginComponent]   ⚠️  IMPORTANT: Check console above for AuthGuard logs');
                      console.error('[LoginComponent]   If no AuthGuard logs, the route may not be matching at all');
                      console.error('[LoginComponent]   Possible causes:');
                      console.error('[LoginComponent]     1. Route doesn\'t exist');
                      console.error('[LoginComponent]     2. Lazy loading failed');
                      console.error('[LoginComponent]     3. Route redirect failed');
                      this.error = 'Route not found. Check console for details.';
                    } else if (finalUrl === '/auth/login' || finalUrl.startsWith('/auth/login')) {
                      console.error('[LoginComponent] ❌ NAVIGATION FAILED - Redirected to login!');
                      console.error('[LoginComponent] ⚠️  DIAGNOSIS: AuthGuard blocked navigation');
                      console.error('[LoginComponent]   Check AuthGuard logs above for token validation');
                      this.error = 'AuthGuard blocked navigation. Token may be invalid.';
                    } else if (finalUrl.includes('/app/course')) {
                      console.log('[LoginComponent] ✅ NAVIGATION SUCCESSFUL!');
                      console.log('[LoginComponent]   Successfully navigated to course route:', finalUrl);
                      // Success - no error message needed
                    } else {
                      console.warn('[LoginComponent] ⚠️  Navigation completed but URL changed');
                      console.warn('[LoginComponent]   Target:', targetUrl);
                      console.warn('[LoginComponent]   Final:', finalUrl);
                      // This might be okay if route redirected internally
                    }
                  }, 1000); // Wait longer for lazy loading and redirects (1 second)
                  
                  subscription.unsubscribe();
                  this.cdr.markForCheck();
                },
                  (error: any) => {
                    console.error('[LoginComponent] ❌ Navigation promise rejected with error:');
                    console.error('[LoginComponent]   Error:', error);
                    console.error('[LoginComponent]   Error type:', typeof error);
                    console.error('[LoginComponent]   Error stack:', error?.stack);
                    this.error = 'Navigation failed with error. Check console.';
                    this.cdr.markForCheck();
                  }
                ).catch((error: any) => {
                  console.error('[LoginComponent] ❌ Navigation exception caught:');
                  console.error('[LoginComponent]   Exception:', error);
                  this.error = 'Navigation exception occurred.';
                  this.cdr.markForCheck();
                });
              });
            }, 150); // Small delay to ensure token is fully ready
          } else {
            // ✅ FIX: Handle case where getUserInfo returns null (401 error)
            console.warn('getUserInfo returned null - user may not be authenticated');
            this.error = 'Failed to load user information. Please try logging in again.';
            // Don't navigate - stay on login page
          }
        },
        error: (err) => {
          this.loading = false; // ✅ FIX: Always reset loading state on error
          this.error = err?.error?.message ?? err?.message ?? 'Failed to load user information';
          console.error('Error fetching user info:', err);
          this.cdr.markForCheck(); // ✅ PERFORMANCE: Trigger change detection for OnPush on error
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
