import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Controls the mobile left sidebar drawer (profile icon opens it).
 * Student mobile layout subscribes to open/close; topbar calls open() when profile icon is clicked.
 */
@Injectable({ providedIn: 'root' })
export class StudentSidebarDrawerService {
  private readonly openSubject = new Subject<boolean>();

  /** Emits true when drawer should open, false when it should close. */
  readonly open$ = this.openSubject.asObservable();

  open(): void {
    this.openSubject.next(true);
  }

  close(): void {
    this.openSubject.next(false);
  }
}
