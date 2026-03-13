import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminAnalyticsApiService, AdminAnalyticsCourseSummary } from '../admin-analytics-api.service';

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

@Component({
  selector: 'app-analytics-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './analytics-courses.component.html',
  styleUrls: ['./analytics-courses.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsCoursesComponent implements OnInit {
  dateRangePreset: DateRangePreset = 'last7';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';
  loading = true;
  courses: AdminAnalyticsCourseSummary[] = [];

  constructor(
    private api: AdminAnalyticsApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setDateRangeFromPreset('last7');
    this.load();
  }

  setDateRangeFromPreset(preset: DateRangePreset): void {
    this.dateRangePreset = preset;
    const now = new Date();
    let from: Date;
    const to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    switch (preset) {
      case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0); break;
      case 'last7': from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0); break;
      case 'last30': from = new Date(now); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0); break;
      case 'thisMonth': from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0); break;
      case 'custom':
        this.customFrom = this.fromDate || this.formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        this.customTo = this.toDate || this.formatDate(now);
        this.fromDate = this.customFrom;
        this.toDate = this.customTo;
        this.cdr.markForCheck();
        return;
      default: from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0);
    }
    this.fromDate = this.formatDate(from);
    this.toDate = this.formatDate(to);
    this.cdr.markForCheck();
  }

  onPresetChange(preset: DateRangePreset): void {
    this.setDateRangeFromPreset(preset);
    if (preset !== 'custom') this.load();
  }

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) return;
    this.fromDate = this.customFrom;
    this.toDate = this.customTo;
    this.dateRangePreset = 'custom';
    this.load();
  }

  trackByCourseId(_: number, row: AdminAnalyticsCourseSummary): string {
    return row?.courseId ?? '';
  }

  load(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loading = true;
    this.cdr.markForCheck();
    this.api.getCourses(this.fromDate, this.toDate).subscribe({
      next: (list) => {
        this.courses = list;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.courses = [];
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
}
