import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

/**
 * Embeds the public site course details page (e.g. localhost:4200/:courseId) inside
 * the Elearn layout. Used for /app/student/category-courses-description/:courseID
 * so users stay on 4201 and see 4201's topbar/sidebar with the course page in the main area.
 */
@Component({
  selector: 'app-public-course-embed',
  templateUrl: './public-course-embed.component.html',
  styleUrls: ['./public-course-embed.component.scss'],
  standalone: false
})
export class PublicCourseEmbedComponent {
  iframeUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {
    const courseId = this.route.snapshot.paramMap.get('courseID') || '';
    const base = (environment as { publicCourseSiteUrl?: string }).publicCourseSiteUrl?.replace(/\/$/, '') || '';
    const path = courseId ? `/${encodeURIComponent(courseId)}` : '';
    const embedQuery = 'embed=1';
    const url = base ? `${base}${path}?${embedQuery}` : `${path}?${embedQuery}`;
    this.iframeUrl = url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }
}
