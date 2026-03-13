import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminAnalyticsApiService, AdminAnalyticsStudentDetail } from '../admin-analytics-api.service';

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

@Component({
  selector: 'app-analytics-student-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './analytics-student-detail.component.html',
  styleUrls: ['./analytics-student-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsStudentDetailComponent implements OnInit {
  dateRangePreset: DateRangePreset = 'last7';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';
  loading = true;
  studentId: string | null = null;
  detail: AdminAnalyticsStudentDetail | null = null;
  notFound = false;

  constructor(
    private api: AdminAnalyticsApiService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.studentId = params['id'] || null;
      this.route.queryParams.subscribe((q) => {
        const from = q['from'];
        const to = q['to'];
        if (from && to) {
          this.fromDate = from;
          this.toDate = to;
          this.dateRangePreset = 'custom';
        } else {
          this.setDateRangeFromPreset('last7');
        }
        this.load();
      });
    });
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

  load(): void {
    if (!this.studentId || !this.fromDate || !this.toDate) return;
    this.loading = true;
    this.notFound = false;
    this.cdr.markForCheck();
    this.api.getStudentById(this.studentId, this.fromDate, this.toDate).subscribe({
      next: (d) => {
        this.detail = d;
        this.notFound = !d;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.detail = null;
        this.notFound = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  backToList(): void {
    this.router.navigate(['/app/admin/analytics'], { queryParams: { from: this.fromDate, to: this.toDate } });
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return seconds + 's';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return m + 'm ' + s + 's';
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h + 'h ' + mm + 'm';
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
}
