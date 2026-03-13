import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Reusable pagination component for Admin, Trainer, Management, Company list pages.
 * Uses totalCount for server-side pagination; pageNumber is 1-based.
 */
@Component({
  selector: 'app-common-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './common-pagination.component.html',
  styleUrls: ['./common-pagination.component.scss'],
})
export class CommonPaginationComponent {
  @Input() pageNumber = 1;
  @Input() pageSize = 20;
  @Input() totalCount = 0;
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50, 100];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  sizeSelectId = `pagination-size-${Math.random().toString(36).slice(2, 9)}`;

  get totalPages(): number {
    if (this.pageSize <= 0) return 0;
    return Math.max(0, Math.ceil((this.totalCount ?? 0) / this.pageSize));
  }

  get canGoPrev(): boolean {
    return this.pageNumber > 1;
  }

  get canGoNext(): boolean {
    return this.pageNumber < this.totalPages && this.totalPages > 0;
  }

  get rangeStart(): number {
    const total = this.totalCount ?? 0;
    if (total === 0) return 0;
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    const total = this.totalCount ?? 0;
    if (total === 0) return 0;
    return Math.min(this.pageNumber * this.pageSize, total);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 0) return [];
    const maxVisible = 5;
    let start = Math.max(1, this.pageNumber - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  onPrev(): void {
    if (this.canGoPrev) {
      this.pageChange.emit(this.pageNumber - 1);
    }
  }

  onNext(): void {
    if (this.canGoNext) {
      this.pageChange.emit(this.pageNumber + 1);
    }
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.pageNumber) {
      this.pageChange.emit(p);
    }
  }

  onPageSizeSelect(value: string): void {
    const size = Number(value);
    if (!Number.isNaN(size) && size > 0 && size !== this.pageSize) {
      this.pageSizeChange.emit(size);
    }
  }
}
