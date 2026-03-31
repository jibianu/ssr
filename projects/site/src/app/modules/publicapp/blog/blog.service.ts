import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, map, concatMap, first } from 'rxjs/operators';
import { API_URL } from 'src/app/core/config/api-url.config';

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
  private readonly apiRoot: string;

  constructor(
    private http: HttpClient,
    @Inject(API_URL) apiBase: string
  ) {
    const base = (apiBase || '').endsWith('/') ? apiBase : `${apiBase}/`;
    this.apiRoot = `${base}api/blog`;
  }

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
    return this.http.get<PagedBlogResponse>(this.apiRoot, { params });
  }

  getCategories(): Observable<BlogCategoryDto[]> {
    return this.http.get<BlogCategoryDto[]>(`${this.apiRoot}/categories`).pipe(
      catchError(() => of([]))
    );
  }

  getBlogBySlug(slug: string): Observable<BlogDetailDto | null> {
    const raw = (slug ?? '').toString().trim();
    if (!raw) return of(null);

    const noLead = raw.replace(/^\/+/, '');
    const noTrail = noLead.replace(/\/+$/, '');
    const candidates = Array.from(
      new Set(
        [
          raw,
          noLead,
          noTrail,
          `/${noLead}`,
          `/${noTrail}`,
          raw.toLowerCase(),
          noLead.toLowerCase(),
          noTrail.toLowerCase()
        ].map((s) => (s ?? '').toString().trim()).filter(Boolean)
      )
    );

    // Some backends store canonicalUrl with/without leading '/', or case-normalize it.
    // Try a few variants before returning null.
    return from(candidates).pipe(
      concatMap((s) =>
        this.http.get<any>(`${this.apiRoot}/${encodeURIComponent(s)}`).pipe(
          map((res) => this.normalizeBlogDetailDto(res)),
          catchError(() => of(null))
        )
      ),
      first((b) => b != null, null)
    );
  }

  /** Get public author/trainer profile for "posts by author" header (display name, photo, bio, website). */
  getAuthorProfile(authorId: string): Observable<AuthorProfileDto | null> {
    if (!authorId?.trim()) return of(null);
    return this.http.get<AuthorProfileDto>(`${this.apiRoot}/author/${encodeURIComponent(authorId.trim())}`).pipe(
      catchError(() => of(null))
    );
  }

  /** Get Loop Marketing content by category (null = default). Public API. */
  getLoopMarketingByCategory(categoryId?: string | null): Observable<LoopMarketingContentDto> {
    let params = new HttpParams();
    if (categoryId != null && categoryId !== '') {
      params = params.set('categoryId', categoryId);
    }
    return this.http.get<LoopMarketingContentDto>(`${this.apiRoot}/loop-marketing/category`, { params }).pipe(
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

  /** Map .NET PascalCase or partial responses to BlogDetailDto for templates + SSR. */
  private normalizeBlogDetailDto(raw: any): BlogDetailDto | null {
    if (raw == null || typeof raw !== 'object') {
      return null;
    }
    const sectionsRaw = raw.blogSections ?? raw.BlogSections;
    let blogSections: BlogSectionDto[] | undefined;
    if (Array.isArray(sectionsRaw)) {
      blogSections = sectionsRaw.map((s: any) => ({
        id: String(s?.id ?? s?.Id ?? ''),
        title: s?.title ?? s?.Title ?? '',
        content: s?.content ?? s?.Content ?? '',
        sequenceNumber: s?.sequenceNumber ?? s?.SequenceNumber
      }));
    }
    const catRaw = raw.category ?? raw.Category;
    let category: BlogCategoryDto | undefined;
    if (catRaw && typeof catRaw === 'object') {
      category = {
        id: String(catRaw.id ?? catRaw.Id ?? ''),
        name: catRaw.name ?? catRaw.Name ?? '',
        appsName: catRaw.appsName ?? catRaw.AppsName
      };
    }
    return {
      id: String(raw.id ?? raw.Id ?? ''),
      title: raw.title ?? raw.Title ?? '',
      canonicalUrl: raw.canonicalUrl ?? raw.CanonicalUrl ?? '',
      content: raw.content ?? raw.Content ?? '',
      metaDescription: raw.metaDescription ?? raw.MetaDescription ?? '',
      titleImgUrl: raw.titleImgUrl ?? raw.TitleImgUrl,
      showOnDashboard: raw.showOnDashboard ?? raw.ShowOnDashboard ?? false,
      createdOn: raw.createdOn ?? raw.CreatedOn ?? '',
      updatedOn: raw.updatedOn ?? raw.UpdatedOn,
      category,
      blogSections,
      authorId: raw.authorId ?? raw.AuthorId,
      authorName: raw.authorName ?? raw.AuthorName,
      authorProfilePictureUrl: raw.authorProfilePictureUrl ?? raw.AuthorProfilePictureUrl
    };
  }
}
