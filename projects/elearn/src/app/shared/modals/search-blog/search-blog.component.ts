import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export type BlogStatusFilterValue = 'all' | 'pending-review';

export interface SearchBlogResult {
  statusFilter: number | null;
  statusLabel: string | null;
  categoryId: string | null;
  categoryName: string | null;
  authorName: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

@Component({
  selector: 'app-search-blog',
  templateUrl: './search-blog.component.html',
  styleUrls: ['./search-blog.component.scss'],
  standalone: false
})
export class SearchBlogComponent {
  selectedLabel = 'All blog';
  statusFilter: number | null = null;
  statusLabel: string | null = null;

  /** Initial status filter when opening (1 = Pending Review, null = All). */
  initialStatusFilter: number | null = null;

  @Input() categories: { id?: string; Id?: string; name?: string; Name?: string }[] = [];
  @Input() authorList: string[] = [];
  @Input() initialCategoryId: string | null = null;
  @Input() initialCategoryName: string | null = null;
  @Input() initialAuthorName: string | null = null;
  @Input() initialDateFrom: string | null = null;
  @Input() initialDateTo: string | null = null;

  selectedCategoryId: string | null = null;
  selectedCategoryName = 'All Categories';
  selectedAuthorName = 'All Authors';
  dateFrom = '';
  dateTo = '';

  constructor(public activeModal: NgbActiveModal) {}

  setInitialStatusFilter(value: number | null): void {
    this.initialStatusFilter = value;
    if (value === 1) {
      this.selectedLabel = 'Trainer requested review';
      this.statusFilter = 1;
      this.statusLabel = 'Trainer requested review';
    } else {
      this.selectedLabel = 'All blog';
      this.statusFilter = null;
      this.statusLabel = null;
    }
  }

  setInitialFilters(): void {
    if (this.initialCategoryId != null && this.initialCategoryName != null) {
      this.selectedCategoryId = this.initialCategoryId;
      this.selectedCategoryName = this.initialCategoryName;
    }
    if (this.initialAuthorName != null && this.initialAuthorName.trim()) {
      this.selectedAuthorName = this.initialAuthorName.trim();
    }
    if (this.initialDateFrom != null && this.initialDateFrom !== '') {
      this.dateFrom = this.initialDateFrom;
    }
    if (this.initialDateTo != null && this.initialDateTo !== '') {
      this.dateTo = this.initialDateTo;
    }
  }

  filterByStatus(value: BlogStatusFilterValue): void {
    if (value === 'pending-review') {
      this.selectedLabel = 'Trainer requested review';
      this.statusFilter = 1;
      this.statusLabel = 'Trainer requested review';
    } else {
      this.selectedLabel = 'All blog';
      this.statusFilter = null;
      this.statusLabel = null;
    }
  }

  filterByCategory(id: string | null, name: string): void {
    this.selectedCategoryId = id;
    this.selectedCategoryName = name;
  }

  filterByAuthor(name: string | null): void {
    this.selectedAuthorName = name != null && name.trim() ? name.trim() : 'All Authors';
  }

  reset(): void {
    this.selectedLabel = 'All blog';
    this.statusFilter = null;
    this.statusLabel = null;
    this.selectedCategoryId = null;
    this.selectedCategoryName = 'All Categories';
    this.selectedAuthorName = 'All Authors';
    this.dateFrom = '';
    this.dateTo = '';
    this.activeModal.close({
      statusFilter: null,
      statusLabel: null,
      categoryId: null,
      categoryName: null,
      authorName: null,
      dateFrom: null,
      dateTo: null
    });
  }

  search(): void {
    this.activeModal.close({
      statusFilter: this.statusFilter,
      statusLabel: this.statusLabel,
      categoryId: this.selectedCategoryId,
      categoryName: this.selectedCategoryId ? this.selectedCategoryName : null,
      authorName: this.selectedAuthorName !== 'All Authors' ? this.selectedAuthorName : null,
      dateFrom: this.dateFrom && this.dateFrom.trim() ? this.dateFrom.trim() : null,
      dateTo: this.dateTo && this.dateTo.trim() ? this.dateTo.trim() : null
    });
  }
}
