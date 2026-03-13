import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PlayerStateService, LessonItem } from '../../../core/services/player-state.service';

@Component({
  /**
   * Lesson player shell: full-screen lesson surface (sidebar + video).
   * Previously named CoursePlayerLayoutComponent.
   */
  selector: 'app-lesson-player-shell',
  templateUrl: './course-player-layout.component.html',
  styleUrls: ['./course-player-layout.component.scss'],
  standalone: false,
})
export class LessonPlayerShellComponent implements OnDestroy {
  lessons: LessonItem[] = [];
  currentLessonId: string | null = null;
  currentLessonTitle = '';
  redirectTo = 'company';
  isFullPage = false;
  /** On mobile, when true the lesson list is expanded (collapsible section open). */
  mobileLessonsOpen = false;

  private sub = new Subscription();

  constructor(public playerState: PlayerStateService) {
    this.lessons = this.playerState.getLessons();
    this.currentLessonId = this.playerState.currentLessonId;
    this.redirectTo = this.playerState.getRedirectTo();
    this.updateCurrentLessonTitle();

    this.sub.add(
      this.playerState.currentLessonId$.subscribe((id) => {
        this.currentLessonId = id;
        this.updateCurrentLessonTitle();
      })
    );
    this.sub.add(
      this.playerState.isFullPage$.subscribe((v) => {
        this.isFullPage = v;
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private updateCurrentLessonTitle(): void {
    if (!this.currentLessonId || !this.lessons?.length) {
      this.currentLessonTitle = '';
      return;
    }
    const match = this.lessons.find(l => String(l.id) === String(this.currentLessonId));
    this.currentLessonTitle = match?.title ?? '';
  }
}
