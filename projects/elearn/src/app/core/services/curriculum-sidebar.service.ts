import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Controls the mobile right-side curriculum sidebar on the curriculum-details page.
 * Topbar right icon opens it; shows list of classes; clicking one navigates and closes.
 */
@Injectable({ providedIn: 'root' })
export class CurriculumSidebarService {
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
