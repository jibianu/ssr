import { AdminAppService } from '../../adminapp.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-event-user-list',
  templateUrl: './event-user-list.component.html',
  styleUrls: ['./event-user-list.component.scss'],
  standalone: false
})
export class EventUserListComponent implements OnInit, OnDestroy {
  config: any = { itemsPerPage: 10, currentPage: 1 };
  tableSizes = [5, 10, 25, 50];
  subscription = new Subscription();
  users: any[] = [];
  term = '';
  sortDir = 1;
  eventId: string | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {}

  get eventsListPath(): string {
    return (this.router?.url ?? '').includes('/trainer/events') ? '/app/trainer/events' : '/app/admin/events';
  }

  ngOnInit(): void {
    this.subscription.add(
      this.activatedRoute.params.subscribe(params => {
        this.eventId = params['id'] ?? null;
        if (this.eventId) this.loadUsers();
      })
    );
  }

  loadUsers(): void {
    if (!this.eventId) return;
    this.loading = true;
    this.error = null;
    this.subscription.add(
      this.appService.getEventUsers(this.eventId).subscribe({
        next: (response) => {
          this.users = Array.isArray(response) ? response : [];
          this.sortArr('name');
          this.loading = false;
        },
        error: (err) => {
          this.users = [];
          this.error = err?.error?.message ?? err?.message ?? 'Failed to load registrations.';
          this.loading = false;
        }
      })
    );
  }

  pageChanged(page: number): void {
    this.config.currentPage = page;
  }

  onTableSizeChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    this.config.itemsPerPage = Number(el?.value) || 10;
    this.config.currentPage = 1;
  }

  onSortClick(_event: Event, colName: string): void {
    this.sortDir = this.sortDir === 1 ? -1 : 1;
    this.sortArr(colName);
  }

  sortArr(colName: string): void {
    this.users.sort((a, b) => {
      const aVal = a[colName] ?? a[colName === 'name' ? 'Name' : colName] ?? '';
      const bVal = b[colName] ?? b[colName === 'name' ? 'Name' : colName] ?? '';
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return -1 * this.sortDir;
      if (aStr > bStr) return 1 * this.sortDir;
      return 0;
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
