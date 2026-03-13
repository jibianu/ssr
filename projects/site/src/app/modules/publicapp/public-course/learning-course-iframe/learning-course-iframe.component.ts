import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';

/**
 * Embeds Elearn curriculum/lessons in an iframe when user is logged in and has purchased the course.
 * Keeps the same URL on the Site (/:courseSlug) while showing learning content.
 */
@Component({
  selector: 'app-learning-course-iframe',
  standalone: true,
  template: `
    <div class="learning-course-iframe-wrapper">
      <iframe
        *ngIf="iframeSrc"
        [src]="iframeSrc"
        class="learning-course-iframe"
        title="Course content"
      ></iframe>
    </div>
  `,
  styles: [`
    .learning-course-iframe-wrapper {
      position: absolute;
      inset: 0;
      min-height: 100vh;
    }
    .learning-course-iframe {
      width: 100%;
      height: 100%;
      min-height: 100vh;
      border: none;
      display: block;
    }
  `],
  imports: [CommonModule]
})
export class LearningCourseIframeComponent implements OnChanges {
  @Input() courseId: string | null = null;
  iframeSrc: SafeResourceUrl | null = null;

  private readonly elearnBase = (environment as { elearnAppUrl?: string }).elearnAppUrl?.replace(/\/$/, '') || '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['courseId'] && this.courseId && this.elearnBase) {
      const url = `${this.elearnBase}/app/student/details/curriculum-list/${encodeURIComponent(this.courseId)}`;
      this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.iframeSrc = null;
    }
  }
}
