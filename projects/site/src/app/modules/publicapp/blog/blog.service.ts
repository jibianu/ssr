import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface BlogCategoryDto {
  id: string;
  name: string;
  appsName?: string;
}

export interface BlogListItemDto {
  id: string;
  title: string;
  canonicalUrl: string;
  metaDescription: string;
  titleImgUrl?: string;
  showOnDashboard: boolean;
  createdOn: string;
  updatedOn?: string;
  category?: BlogCategoryDto;
  authorId?: string;
  authorName?: string;
  authorProfilePictureUrl?: string;
}

export interface BlogSectionDto {
  id: string;
  title: string;
  content: string;
  sequenceNumber?: number;
}

export interface BlogDetailDto {
  id: string;
  title: string;
  canonicalUrl: string;
  content: string;
  metaDescription: string;
  titleImgUrl?: string;
  showOnDashboard: boolean;
  createdOn: string;
  updatedOn?: string;
  category?: BlogCategoryDto;
  blogSections?: BlogSectionDto[];
  authorId?: string;
  authorName?: string;
  authorProfilePictureUrl?: string;
}

export interface PagedBlogResponse {
  pageNumber: number;
  pageSize: number;
  totalNumberOfRecords: number;
  results: BlogListItemDto[];
}

/** One social link for author profile (platform + url). */
export interface AuthorSocialLinkDto {
  platform?: string;
  url?: string;
}

/** Public author/trainer profile for "posts by author" page header. */
export interface AuthorProfileDto {
  id: string;
  displayName: string;
  profilePictureUrl?: string;
  bio?: string;
  website?: string;
  email?: string;
  socialLinks?: AuthorSocialLinkDto[];
}

/** Loop Marketing content (API returns PascalCase; we use as-is or map in component). */
export interface LoopMarketingContentDto {
  id?: string;
  categoryId?: string | null;
  title: string;
  description: string;
  brand: string;
  graphicText: string;
  expressFeature: string;
  tailorFeature: string;
  amplifyFeature: string;
  evolveFeature: string;
  downloadButtonText: string;
  learnMoreText: string;
  downloadUrl: string;
  learnMoreUrl: string;
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly apiUrl = environment.apiUrl + 'api/blog';

  constructor(private http: HttpClient) {}

  getBlogs(pageNumber: number = 1, pageSize: number = 10, category?: string, authorId?: string, search?: string): Observable<PagedBlogResponse> {
    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));
    if (category?.trim()) {
      params = params.set('category', category.trim());
    }
    if (authorId?.trim()) {
      params = params.set('authorId', authorId.trim());
    }
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PagedBlogResponse>(this.apiUrl, { params });
  }

  getCategories(): Observable<BlogCategoryDto[]> {
    return this.http.get<BlogCategoryDto[]>(`${this.apiUrl}/categories`).pipe(
      catchError(() => of([]))
    );
  }

  getBlogBySlug(slug: string): Observable<BlogDetailDto | null> {
    const encoded = encodeURIComponent(slug);
    return this.http.get<BlogDetailDto>(`${this.apiUrl}/${encoded}`).pipe(
      catchError(() => of(null))
    );
  }

  /** Get public author/trainer profile for "posts by author" header (display name, photo, bio, website). */
  getAuthorProfile(authorId: string): Observable<AuthorProfileDto | null> {
    if (!authorId?.trim()) return of(null);
    return this.http.get<AuthorProfileDto>(`${this.apiUrl}/author/${encodeURIComponent(authorId.trim())}`).pipe(
      catchError(() => of(null))
    );
  }

  /** Get Loop Marketing content by category (null = default). Public API. */
  getLoopMarketingByCategory(categoryId?: string | null): Observable<LoopMarketingContentDto> {
    let params = new HttpParams();
    if (categoryId != null && categoryId !== '') {
      params = params.set('categoryId', categoryId);
    }
    return this.http.get<LoopMarketingContentDto>(`${this.apiUrl}/loop-marketing/category`, { params }).pipe(
      catchError(() => of({
        title: '',
        description: '',
        brand: '',
        graphicText: '',
        expressFeature: '',
        tailorFeature: '',
        amplifyFeature: '',
        evolveFeature: '',
        downloadButtonText: '',
        learnMoreText: '',
        downloadUrl: '',
        learnMoreUrl: ''
      }))
    );
  }
}
