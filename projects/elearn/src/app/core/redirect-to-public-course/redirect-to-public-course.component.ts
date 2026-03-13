import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

/**
 * Redirects old Elearn route /app/student/category-courses-description/:courseID
 * to the site's canonical course URL: /:slug (no /courses/ prefix).
 */
@Component({
  selector: 'app-redirect-to-public-course',
  template: '<p class="p-3">Redirecting to course…</p>',
  standalone: false
})
export class RedirectToPublicCourseComponent implements OnInit {
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const courseIdOrSlug = this.route.snapshot.paramMap.get('courseID');
    const base = (environment as { publicCourseSiteUrl?: string }).publicCourseSiteUrl?.replace(/\/$/, '') || '';
    const target = base ? `${base}/${encodeURIComponent(courseIdOrSlug || '')}` : `/${encodeURIComponent(courseIdOrSlug || '')}`;
    window.location.href = target;
  }
}
