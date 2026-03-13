import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Controls the mobile right-side drawer on the practice-questions page (question list).
 * Topbar shows an icon on the right when on this page; clicking toggles the drawer.
 */
@Injectable({ providedIn: 'root' })
export class PracticeQuestionsDrawerService {
  private readonly openSubject = new BehaviorSubject<boolean>(false);

  readonly open$: Observable<boolean> = this.openSubject.asObservable();

  get isOpen(): boolean {
    return this.openSubject.getValue();
  }

  open(): void {
    this.openSubject.next(true);
  }

  close(): void {
    this.openSubject.next(false);
  }

  toggle(): void {
    this.openSubject.next(!this.openSubject.getValue());
  }
}
