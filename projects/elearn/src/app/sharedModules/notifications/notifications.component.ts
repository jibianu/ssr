import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  StudentDashboardApiService,
  StudentNotificationItem,
  StudentNotificationsResponse,
} from '../../modules/student/student-dashboard-api.service';
import { CommonPaginationComponent } from '../../shared/component/common-pagination/common-pagination.component';
import { StudentBreadcrumbService } from '../../core/services/student-breadcrumb.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, CommonPaginationComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent implements OnInit {
  loading = true;
  items: StudentNotificationItem[] = [];
  unreadCount = 0;
  page = 1;
  pageSize = 20;
  totalCount = 0;
  readonly pageSizeOptions = [10, 20, 50];

  constructor(
    private api: StudentDashboardApiService,
    private studentBreadcrumb: StudentBreadcrumbService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Notifications' }]);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getNotifications(this.page, this.pageSize).subscribe({
      next: (res: StudentNotificationsResponse) => {
        this.items = res.items || [];
        this.unreadCount = res.unreadCount ?? 0;
        this.totalCount = res.totalCount ?? 0;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.load();
  }

  markAsRead(item: StudentNotificationItem): void {
    if (item.isRead) return;
    this.api.markNotificationAsRead(item.id).subscribe({
      next: () => {
        item.isRead = true;
        if (this.unreadCount > 0) this.unreadCount--;
      },
    });
  }

  /** Mark as read and navigate to notification link when present. */
  goToNotification(item: StudentNotificationItem): void {
    this.markAsRead(item);
    const url = item.linkUrl?.trim();
    if (url) {
      if (url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        const path = url.startsWith('/') ? url : '/' + url;
        this.router.navigateByUrl(path);
      }
    }
  }

  markAllAsRead(): void {
    if (this.unreadCount === 0) return;
    this.api.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.items.forEach((n) => (n.isRead = true));
        this.unreadCount = 0;
      },
    });
  }

  clearAllHistory(): void {
    if (this.items.length === 0) return;
    if (!confirm('Remove all notification history? This cannot be undone.')) return;
    this.api.clearAllNotifications().subscribe({
      next: () => this.load(),
      error: () => this.load(),
    });
  }
}
