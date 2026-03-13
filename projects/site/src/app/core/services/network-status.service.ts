import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, fromEvent, merge, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

/**
 * Network Status Service
 * 
 * Monitors network connectivity status and provides observables
 * for components to react to online/offline changes.
 * 
 * Benefits:
 * - Detect when user goes offline/online
 * - Show appropriate UI messages
 * - Prevent API calls when offline
 * - Better user experience during network issues
 * 
 * Usage:
 * ```typescript
 * constructor(private networkStatus: NetworkStatusService) {}
 * 
 * ngOnInit() {
 *   this.networkStatus.isOnline$.subscribe(isOnline => {
 *     if (!isOnline) {
 *       this.showOfflineMessage();
 *     }
 *   });
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly isBrowser: boolean;
  
  // ✅ Observable that emits true when online, false when offline
  private readonly onlineStatus$ = new BehaviorSubject<boolean>(true);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // ✅ FIX: Initialize in constructor to prevent injector errors during SSR
    // Field initializers with inject() can fail if injector is destroyed during SSR
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    if (this.isBrowser) {
      this.initializeNetworkMonitoring();
    } else {
      // During SSR, assume online
      this.onlineStatus$.next(true);
    }
  }

  /**
   * Initialize network monitoring using browser's online/offline events
   */
  private initializeNetworkMonitoring(): void {
    // Start with current navigator.onLine status
    const initialStatus = navigator.onLine;
    this.onlineStatus$.next(initialStatus);

    // Listen to online event
    const online$ = fromEvent(window, 'online').pipe(
      map(() => true),
      startWith(initialStatus)
    );

    // Listen to offline event
    const offline$ = fromEvent(window, 'offline').pipe(
      map(() => false),
      startWith(!initialStatus)
    );

    // Merge both observables and update status
    merge(online$, offline$).subscribe(status => {
      this.onlineStatus$.next(status);
      
      // Log status changes for debugging
      console.log(`🌐 Network status changed: ${status ? 'ONLINE' : 'OFFLINE'}`);
    });
  }

  /**
   * Observable that emits true when online, false when offline
   * Use this in components to react to network status changes
   */
  get isOnline$(): Observable<boolean> {
    return this.onlineStatus$.asObservable();
  }

  /**
   * Get current network status synchronously
   * Returns true if online, false if offline
   */
  get isOnline(): boolean {
    if (!this.isBrowser) {
      return true; // Assume online during SSR
    }
    return navigator.onLine;
  }

  /**
   * Check if currently offline
   */
  get isOffline(): boolean {
    return !this.isOnline;
  }

  /**
   * Get a user-friendly message about network status
   */
  getStatusMessage(): string {
    if (this.isOffline) {
      return 'You are currently offline. Please check your internet connection.';
    }
    return 'You are online and connected.';
  }
}

