import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** Call requestOpen() from any page to open the side navbar (e.g. "Open menu" button). */
@Injectable({ providedIn: 'root' })
export class SidebarToggleService {
  private readonly openRequest$ = new Subject<void>();
  readonly onOpenRequest = this.openRequest$.asObservable();

  requestOpen(): void {
    this.openRequest$.next();
  }
}
