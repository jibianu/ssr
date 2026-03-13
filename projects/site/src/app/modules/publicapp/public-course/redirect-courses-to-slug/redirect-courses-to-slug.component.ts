import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Redirects /courses/:url and /courses/:url/:location to canonical /:url so refresh and bookmarks work without /courses/.
 */
@Component({
  selector: 'app-redirect-courses-to-slug',
  standalone: true,
  template: '',
})
export class RedirectCoursesToSlugComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const url = this.route.snapshot.paramMap.get('url');
    if (url) {
      this.router.navigate(['/', url], { replaceUrl: true, queryParamsHandling: 'preserve' });
    } else {
      this.router.navigate(['/page-not-found'], { replaceUrl: true });
    }
  }
}
