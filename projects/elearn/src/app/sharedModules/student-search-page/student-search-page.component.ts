import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Category } from 'src/app/modules/adminapp/category/category.model';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';

export interface SearchCourseItem {
  id: string;
  title: string;
  slug: string;
}

@Component({
  selector: 'app-student-search-page',
  templateUrl: './student-search-page.component.html',
  styleUrls: ['./student-search-page.component.scss'],
  standalone: false,
})
export class StudentSearchPageComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  private searchTerm$ = new Subject<string>();
  searchQuery = '';
  categories: Category[] = [];
  /** Top search tags: category names from API (so data-driven) */
  topSearchTags: string[] = [];
  loadingCategories = true;
  /** Live search results (shown below input as user types) */
  searchResults: SearchCourseItem[] = [];
  searchLoading = false;
  showSearchDropdown = false;

  constructor(
    private appService: AdminAppService,
    private router: Router,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Search' }]);
    this.loadCategoriesAndTopSearches();
    this.subscription.add(
      this.searchTerm$.pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((term) => {
          this.searchLoading = true;
          return this.appService.searchCourses(term);
        })
      ).subscribe({
        next: (list) => {
          this.searchResults = list || [];
          this.searchLoading = false;
          this.showSearchDropdown = (this.searchQuery || '').trim().length >= 2;
        },
        error: () => {
          this.searchLoading = false;
          this.searchResults = [];
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onSearchInput(): void {
    const q = (this.searchQuery || '').trim();
    this.searchTerm$.next(this.searchQuery);
    if (q.length < 2) {
      this.showSearchDropdown = false;
      this.searchResults = [];
    } else {
      this.showSearchDropdown = true;
    }
  }

  loadCategoriesAndTopSearches(): void {
    this.loadingCategories = true;
    this.subscription.add(
      this.appService.getPublishedCategories().subscribe({
        next: (list) => {
          this.categories = list || [];
          this.topSearchTags = (list || []).map((c) => c.name).filter(Boolean).slice(0, 12);
          this.loadingCategories = false;
        },
        error: () => {
          this.loadingCategories = false;
        },
      })
    );
  }

  onSearchSubmit(): void {
    const q = (this.searchQuery || '').trim();
    if (q.length >= 2) {
      this.showSearchDropdown = false;
      this.router.navigate(['/app/student/courses'], { queryParams: { search: q } });
    }
  }

  onSelectSearchResult(course: SearchCourseItem): void {
    this.showSearchDropdown = false;
    this.searchQuery = course.title;
    this.searchResults = [];
    this.router.navigate(['/app/student/details/curriculum-list', course.id]);
  }

  onTopSearchClick(tag: string): void {
    this.searchQuery = tag;
    this.showSearchDropdown = false;
    this.router.navigate(['/app/student/courses'], { queryParams: { search: tag } });
  }

  closeSearchDropdown(): void {
    this.showSearchDropdown = false;
  }

  goToCategory(category: Category): void {
    if (category?.id) {
      this.router.navigate(['/app/student/category-courses', category.id, (category.name || '').replace(/\s+/g, '-')]);
    }
  }

  /** Placeholder color per category for thumbnail (no image in category model) */
  getCategoryColor(index: number): string {
    const colors = ['#f97316', '#0ea5e9', '#8b5cf6', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#f59e0b'];
    return colors[index % colors.length];
  }
}
