import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { PlayerStateService, LessonItem } from '../../../core/services/player-state.service';

@Component({
  selector: 'app-curriculum-sidebar',
  templateUrl: './curriculum-sidebar.component.html',
  styleUrls: ['./curriculum-sidebar.component.scss'],
  standalone: false,
})
export class CurriculumSidebarComponent {
  @Input() lessons: LessonItem[] = [];
  @Input() currentLessonId: string | null = null;
  @Input() redirectTo = 'company';

  constructor(
    private router: Router,
    private playerState: PlayerStateService
  ) {}

  trackByLessonId(_index: number, item: LessonItem): string {
    return item.id;
  }

  goToLesson(item: LessonItem): void {
    this.playerState.setCurrentLessonId(item.id);
    this.router.navigate(['/app', this.redirectTo, 'details', 'curriculum-details', item.id]);
  }
}
