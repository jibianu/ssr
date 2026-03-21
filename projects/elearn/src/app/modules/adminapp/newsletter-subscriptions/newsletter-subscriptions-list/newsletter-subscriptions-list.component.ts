import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { AdminAppService } from '../../adminapp.service';
import { firstValueFrom } from 'rxjs';

interface NewsletterSubscriptionRow {
  id: string;
  email: string;
  source: string;
  blogSlug?: string;
  /** ISO code (e.g. US) � hint or GeoIP */
  countryCode?: string;
  /** Full country name from GeoIP */
  country?: string;
  ipAddress?: string;
  createdOn: string;
}

@Component({
  selector: 'app-newsletter-subscriptions-list',
  templateUrl: './newsletter-subscriptions-list.component.html',
  styleUrls: ['./newsletter-subscriptions-list.component.scss'],
  standalone: false
})
export class NewsletterSubscriptionsListComponent implements OnInit {
  rows: NewsletterSubscriptionRow[] = [];
  loading = false;
  loadError: string | null = null;

  pageNumber = 1;
  pageSize = 25;
  totalNumberOfRecords = 0;
  search = '';
  fromDate = '';
  toDate = '';
  isExporting = false;
  /** Only auto-refresh after user hid the tab (avoids duplicate fetch on first paint). */
  private tabWasHidden = false;

  constructor(
    private appService: AdminAppService,
    private cdr: ChangeDetectorRef
  ) {}

  /** Refetch when user returns to this tab so new signups show without manual reload. */
  @HostListener('document:visibilitychange')
  onDocumentVisibility(): void {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') {
      this.tabWasHidden = true;
      return;
    }
    if (document.visibilityState === 'visible' && this.tabWasHidden) {
      this.tabWasHidden = false;
      this.fetch();
    }
  }

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.loadError = null;
    this.appService.getNewsletterSubscriptions(
      this.pageNumber,
      this.pageSize,
      this.search,
      this.fromDate,
      this.toDate
    ).subscribe({
      next: (res) => {
        const list = res?.results ?? [];
        this.rows = list.map((x: any) => ({
          id: String(x?.id ?? x?.Id ?? ''),
          email: x?.email ?? x?.Email ?? '',
          source: x?.source ?? x?.Source ?? 'site',
          blogSlug: x?.blogSlug ?? x?.BlogSlug ?? '',
          countryCode: x?.countryCode ?? x?.CountryCode ?? '',
          country: x?.country ?? x?.Country ?? '',
          ipAddress: x?.ipAddress ?? x?.IpAddress ?? '',
          createdOn: x?.createdOn ?? x?.CreatedOn ?? ''
        }));
        this.totalNumberOfRecords = res?.totalNumberOfRecords ?? 0;
        // After delete on last page, API returns empty for stale page number � jump back and reload
        const lastPage = Math.max(1, Math.ceil(this.totalNumberOfRecords / this.pageSize));
        if (this.pageNumber > lastPage) {
          this.pageNumber = lastPage;
          this.loading = false;
          this.fetch();
          return;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadError = 'Failed to load newsletter subscriptions.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetch();
  }

  onClear(): void {
    this.search = '';
    this.fromDate = '';
    this.toDate = '';
    this.pageNumber = 1;
    this.fetch();
  }

  prevPage(): void {
    if (this.pageNumber <= 1) return;
    this.pageNumber--;
    this.fetch();
  }

  nextPage(): void {
    if (this.pageNumber >= this.lastPage) return;
    this.pageNumber++;
    this.fetch();
  }

  get lastPage(): number {
    return Math.max(1, Math.ceil(this.totalNumberOfRecords / this.pageSize));
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  /** GeoIP full name, else ISO code, else em dash */
  displayCountry(row: NewsletterSubscriptionRow): string {
    const name = (row.country ?? '').trim();
    const code = (row.countryCode ?? '').trim();
    if (name) return code ? `${name} (${code})` : name;
    return code || '�';
  }

  async exportCsv(): Promise<void> {
    if (this.isExporting) return;
    this.isExporting = true;
    this.loadError = null;
    try {
      const exportPageSize = 200;
      const first = await firstValueFrom(
        this.appService.getNewsletterSubscriptions(1, exportPageSize, this.search, this.fromDate, this.toDate)
      );
      const total = first?.totalNumberOfRecords ?? 0;
      const rows: NewsletterSubscriptionRow[] = (first?.results ?? []).map((x: any) => ({
        id: String(x?.id ?? x?.Id ?? ''),
        email: x?.email ?? x?.Email ?? '',
        source: x?.source ?? x?.Source ?? 'site',
        blogSlug: x?.blogSlug ?? x?.BlogSlug ?? '',
        countryCode: x?.countryCode ?? x?.CountryCode ?? '',
        country: x?.country ?? x?.Country ?? '',
        ipAddress: x?.ipAddress ?? x?.IpAddress ?? '',
        createdOn: x?.createdOn ?? x?.CreatedOn ?? ''
      }));

      const lastPage = Math.max(1, Math.ceil(total / exportPageSize));
      if (lastPage > 1) {
        const requests: Promise<any>[] = [];
        for (let page = 2; page <= lastPage; page++) {
          requests.push(firstValueFrom(
            this.appService.getNewsletterSubscriptions(page, exportPageSize, this.search, this.fromDate, this.toDate)
          ));
        }
        const rest = await Promise.all(requests);
        for (const res of rest) {
          const list = res?.results ?? [];
          for (const x of list) {
            rows.push({
              id: String(x?.id ?? x?.Id ?? ''),
              email: x?.email ?? x?.Email ?? '',
              source: x?.source ?? x?.Source ?? 'site',
              blogSlug: x?.blogSlug ?? x?.BlogSlug ?? '',
              countryCode: x?.countryCode ?? x?.CountryCode ?? '',
              country: x?.country ?? x?.Country ?? '',
              ipAddress: x?.ipAddress ?? x?.IpAddress ?? '',
              createdOn: x?.createdOn ?? x?.CreatedOn ?? ''
            });
          }
        }
      }

      const lines = ['Email,Source,Blog,Country Name,Country Code,IP Address,Subscribed On'];
      for (const row of rows) {
        lines.push([
          this.escapeCsv(row.email),
          this.escapeCsv(row.source || 'site'),
          this.escapeCsv(row.blogSlug || ''),
          this.escapeCsv(row.country || ''),
          this.escapeCsv(row.countryCode || ''),
          this.escapeCsv(row.ipAddress || ''),
          this.escapeCsv(this.formatDate(row.createdOn))
        ].join(','));
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `newsletter-subscriptions-${date}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      this.loadError = 'Failed to export CSV.';
    } finally {
      this.isExporting = false;
    }
  }

  remove(row: NewsletterSubscriptionRow): void {
    if (!row?.id) return;
    if (!confirm(`Delete subscription for ${row.email}?`)) return;
    this.loadError = null;
    this.appService.deleteNewsletterSubscription(row.id).subscribe({
      next: () => {
        this.fetch();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadError = 'Failed to delete subscription.';
        this.cdr.markForCheck();
      }
    });
  }

  private escapeCsv(value: string): string {
    const text = (value ?? '').replace(/"/g, '""');
    return `"${text}"`;
  }
}
