import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminAnalyticsApiService,
  AdminAnalyticsCourseSummary,
  DropOffReport,
} from '../admin-analytics-api.service';

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

@Component({
  selector: 'app-analytics-drop-off',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './analytics-drop-off.component.html',
  styleUrls: ['./analytics-drop-off.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsDropOffComponent implements OnInit {
  dateRangePreset: DateRangePreset = 'last30';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';
  courses: AdminAnalyticsCourseSummary[] = [];
  selectedCourseId = '';
  loading = false;
  loadingCourses = false;
  report: DropOffReport | null = null;
  error: string | null = null;

  constructor(
    private api: AdminAnalyticsApiService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setDateRangeFromPreset('last30');
    this.route.queryParams.subscribe((qp) => {
      const courseId = qp['courseId'] ?? '';
      if (courseId && courseId !== this.selectedCourseId) {
        this.selectedCourseId = courseId;
        this.loadReport();
      }
      this.cdr.markForCheck();
    });
    this.loadCourses();
  }

  loadCourses(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loadingCourses = true;
    this.cdr.markForCheck();
    this.api.getCourses(this.fromDate, this.toDate).subscribe({
      next: (list) => {
        this.courses = list;
        this.loadingCourses = false;
        if (!this.selectedCourseId && list.length > 0) this.selectedCourseId = list[0].courseId;
        this.cdr.markForCheck();
      },
      error: () => {
        this.courses = [];
        this.loadingCourses = false;
        this.cdr.markForCheck();
      },
    });
  }

  setDateRangeFromPreset(preset: DateRangePreset): void {
    this.dateRangePreset = preset;
    const now = new Date();
    let from: Date;
    const to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'last7':
        from = new Date(now);
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        break;
      case 'last30':
        from = new Date(now);
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'custom':
        this.customFrom = this.fromDate || this.formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        this.customTo = this.toDate || this.formatDate(now);
        this.fromDate = this.customFrom;
        this.toDate = this.customTo;
        this.cdr.markForCheck();
        return;
      default:
        from = new Date(now);
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
    }
    this.fromDate = this.formatDate(from);
    this.toDate = this.formatDate(to);
    this.cdr.markForCheck();
  }

  onPresetChange(preset: DateRangePreset): void {
    this.setDateRangeFromPreset(preset);
    if (preset !== 'custom') {
      this.loadCourses();
      this.loadReport();
    }
  }

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) return;
    this.fromDate = this.customFrom;
    this.toDate = this.customTo;
    this.dateRangePreset = 'custom';
    this.loadCourses();
    this.loadReport();
  }

  onCourseChange(): void {
    this.updateQueryAndLoad();
  }

  loadReport(): void {
    if (!this.selectedCourseId || !this.fromDate || !this.toDate) {
      this.report = null;
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.api.getDropOffReport(this.selectedCourseId, this.fromDate, this.toDate).subscribe({
      next: (r) => {
        this.report = r;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.report = null;
        this.error = 'Failed to load drop-off report.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private updateQueryAndLoad(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { courseId: this.selectedCourseId || null },
      queryParamsHandling: 'merge',
    });
    this.loadReport();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
}
