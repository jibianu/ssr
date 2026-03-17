import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAppService } from '../../adminapp.service';

export interface BlogAuthor {
  id: string;
  name: string;
  profilePictureUrl?: string;
  email?: string;
  blogCount: number;
}

@Component({
  selector: 'app-blog-users-list',
  templateUrl: './blog-users-list.component.html',
  styleUrls: ['./blog-users-list.component.scss'],
  standalone: false,
})
export class BlogUsersListComponent implements OnInit {
  authors: BlogAuthor[] = [];
  loading = true;
  loadError: string | null = null;

  constructor(
    private appService: AdminAppService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchAuthors();
  }

  fetchAuthors(): void {
    this.loading = true;
    this.loadError = null;
    this.appService.getBlogAuthors().subscribe({
      next: (list) => {
        this.authors = (list || []).map((a: any) => ({
          id: a.id ?? a.Id ?? '',
          name: a.name ?? a.Name ?? '',
          profilePictureUrl: a.profilePictureUrl ?? a.ProfilePictureUrl,
          email: a.email ?? a.Email,
          blogCount: a.blogCount ?? a.BlogCount ?? 0
        }));
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Failed to load blog authors.';
        this.loading = false;
      }
    });
  }

  goToAuthorBlogs(authorId: string): void {
    const url = this.router.url;
    const base = url.includes('/management/') ? '/app/management' : '/app/admin';
    this.router.navigate([base, 'blog', 'list'], { queryParams: { authorId } });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
