import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LessonItem {
  id: string;
  title: string;
  curriculumVideoLectureCount?: number;
  isCompleted?: boolean;
  [key: string]: unknown;
}

/**
 * Controls Video Focus Mode: lock/unlock body scroll, current lesson, next/prev navigation.
 * Used by course-player-layout, curriculum-details (enter), and student layout (hide header).
 */
@Injectable({ providedIn: 'root' })
export class PlayerStateService {
  private readonly focusMode$Subject = new BehaviorSubject<boolean>(false);
  private readonly currentLessonId$Subject = new BehaviorSubject<string | null>(null);
  private readonly isFullPage$Subject = new BehaviorSubject<boolean>(false);

  private scrollPositionBeforeFocus = 0;
  private previousOverflow = '';
  private previousHeight = '';
  private lessons: LessonItem[] = [];
  private redirectTo = 'company';

  readonly focusMode$: Observable<boolean> = this.focusMode$Subject.asObservable();
  readonly currentLessonId$: Observable<string | null> = this.currentLessonId$Subject.asObservable();
  readonly isFullPage$: Observable<boolean> = this.isFullPage$Subject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {}

  get focusMode(): boolean {
    return this.focusMode$Subject.getValue();
  }

  get currentLessonId(): string | null {
    return this.currentLessonId$Subject.getValue();
  }

  getLessons(): LessonItem[] {
    return this.lessons;
  }

  /** 0-based index of current lesson in lessons array. Returns -1 when not found. */
  getCurrentLessonIndex(): number {
    const id = this.currentLessonId$Subject.getValue();
    if (!id || !this.lessons.length) return -1;
    return this.lessons.findIndex(l => String(l.id) === String(id));
  }

  /** Total number of lessons in current focus-mode playlist. */
  getLessonCount(): number {
    return this.lessons.length;
  }

  setRedirectTo(redirectTo: string): void {
    this.redirectTo = redirectTo;
  }

  /**
   * Enter video focus mode: lock body scroll, store position, set current lesson.
   */
  enterFocusMode(lessons: LessonItem[], currentLessonId: string): void {
    if (this.focusMode$Subject.getValue()) return;
    // Normalize ids to strings so next/prev work even if source ids are numbers
    this.lessons = lessons && lessons.length ? lessons.map(l => ({ ...l, id: String(l.id) })) : [];
    this.currentLessonId$Subject.next(String(currentLessonId));
    this.scrollPositionBeforeFocus = this.getScrollTop();
    this.previousOverflow = this.document.body.style.overflow || '';
    this.previousHeight = this.document.body.style.height || '';
    this.document.body.style.overflow = 'hidden';
    this.document.body.style.height = '100%';
    this.focusMode$Subject.next(true);
  }

  /**
   * Exit focus mode: restore body scroll and scroll position.
   */
  exitFocusMode(): void {
    if (!this.focusMode$Subject.getValue()) return;
    this.focusMode$Subject.next(false);
    this.isFullPage$Subject.next(false);
    this.document.body.style.overflow = this.previousOverflow;
    this.document.body.style.height = this.previousHeight;
    this.restoreScrollPosition();
    this.currentLessonId$Subject.next(null);
  }

  setCurrentLessonId(id: string | null): void {
    this.currentLessonId$Subject.next(id != null ? String(id) : null);
  }

  getNextLessonId(): string | null {
    const id = this.currentLessonId$Subject.getValue();
    if (!id || !this.lessons.length) return null;
    const idx = this.lessons.findIndex((l) => String(l.id) === String(id));
    if (idx < 0 || idx >= this.lessons.length - 1) return null;
    return this.lessons[idx + 1].id;
  }

  getPrevLessonId(): string | null {
    const id = this.currentLessonId$Subject.getValue();
    if (!id || !this.lessons.length) return null;
    const idx = this.lessons.findIndex((l) => String(l.id) === String(id));
    if (idx <= 0) return null;
    return this.lessons[idx - 1].id;
  }

  getRedirectTo(): string {
    return this.redirectTo;
  }

  toggleFullPage(): void {
    this.isFullPage$Subject.next(!this.isFullPage$Subject.getValue());
  }

  private getScrollTop(): number {
    const win = this.document.defaultView;
    if (win) return win.scrollY ?? win.pageYOffset ?? this.document.documentElement.scrollTop ?? 0;
    return 0;
  }

  private restoreScrollPosition(): void {
    const win = this.document.defaultView;
    if (win) win.scrollTo(0, this.scrollPositionBeforeFocus);
  }
}
