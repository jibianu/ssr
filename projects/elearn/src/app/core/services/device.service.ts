import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

/** Breakpoint (px) below which we consider the device "mobile". Use 768 so bottom nav and mobile layout show at 100% zoom in typical mobile widths. */
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * Detects screen size for layout switching.
 * isMobile$ is true when viewport width < MOBILE_BREAKPOINT_PX.
 * Defaults to desktop (false) so full-width windows get desktop layout; re-checks after load.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly isMobileSubject = new BehaviorSubject<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT_PX : false
  );

  /** True when viewport width < MOBILE_BREAKPOINT_PX. */
  readonly isMobile$: Observable<boolean> = this.isMobileSubject.pipe(distinctUntilChanged());

  constructor() {
    if (typeof window !== 'undefined') {
      this.update();
      window.addEventListener('resize', () => this.update());
      window.addEventListener('load', () => this.update());
      setTimeout(() => this.update(), 0);
    }
  }

  getIsMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT_PX;
  }

  /** Current value (synchronous). */
  get isMobile(): boolean {
    return this.isMobileSubject.value;
  }

  private update(): void {
    const next = this.getIsMobile();
    if (next !== this.isMobileSubject.value) {
      this.isMobileSubject.next(next);
    }
  }
}
