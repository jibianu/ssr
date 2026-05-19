import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from '../../../../shared/service/shared-service.service';

@Component({
  selector: 'app-corporate-blog-list',
  templateUrl: './corporate-blog-list.component.html',
  styleUrls: ['./corporate-blog-list.component.scss'],
  standalone: false
})
export class CorporateBlogListComponent implements OnInit, OnDestroy {
  blogs: any[] = [];
  loading = true;
  loadError: string | null = null;
  private sub = new Subscription();

  constructor(private appService: AdminAppService, private sharedService: SharedService) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Corporate blog');
    this.fetch();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  statusLabel(status: number): string {
    switch (status) {
      case 0:
        return 'Draft';
      case 1:
        return 'Pending review';
      case 2:
        return 'Published';
      case 3:
        return 'Rejected';
      default:
        return String(status);
    }
  }

  fetch(): void {
    this.loading = true;
    this.loadError = null;
    this.sub.add(
      this.appService.getCorporateBlogs(1, 500).subscribe({
        next: (res) => {
          this.blogs = (res?.results || []).map((b: any) => ({
            id: b.id || b.Id,
            title: b.title || b.Title,
            subdomain: b.companySubdomain || b.CompanySubdomain || '—',
            authorName: b.authorName || b.AuthorName || '—',
            status: b.status ?? b.Status ?? 0,
            submittedDate: b.submittedDate ?? b.SubmittedDate ?? null,
            publishedDate: b.publishedDate ?? b.PublishedDate ?? null,
            createdOn: b.createdOn || b.CreatedOn
          }));
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          if (err?.status === 401 || err?.status === 404) {
            this.loadError =
              'Corporate blog API is not available yet. Restart the API after pulling latest backend changes.';
          } else {
            this.loadError = 'Unable to load corporate blogs.';
          }
        }
      })
    );
  }
}
