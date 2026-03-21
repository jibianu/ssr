import { SideNavService } from './../sidebar.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Role } from 'src/app/shared/models/role';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

/** Management menu items. null permission = always shown. */
const MANAGEMENT_MENU = [
  { link: '/app/management/dashboard', label: 'Dashboard', permission: null, icon: 'fa fa-home' },
  { link: '/app/management/revenue', label: 'Revenue share', permission: null, icon: 'fa fa-chart-pie' },
  { link: '/app/management/students', label: 'Student List', permission: 'StudentList', icon: 'fa fa-users' },
  { link: '/app/management/trainers', label: 'Trainer List', permission: null, icon: 'fa fa-graduation-cap' },
  { link: '/app/management/companies', label: 'Company List', permission: 'CompanyList', icon: 'fa fa-building' },
  { link: '/app/management/management', label: 'Management List', permission: 'ManagementList', icon: 'fa fa-list' },
  { link: '/app/management/category', label: 'Category List', permission: 'CategoryList', icon: 'fa fa-folder' },
  { link: '/app/management/course', label: 'Course List', permission: 'CourseList', icon: 'fa fa-book' },
  { link: '/app/management/blog', label: 'Blog', permission: null, icon: 'fa fa-blog' },
  { link: '/app/management/newsletter-subscriptions', label: 'NewsletterSubscriptions', permission: null, icon: 'fa fa-envelope' },
  { link: '/app/management/notifications', label: 'Push notifications', permission: null, icon: 'fa fa-bell' },
  { link: '/app/management/affiliates', label: 'Affiliates', permission: null, icon: 'fa fa-hand-holding-usd' },
  { link: '/app/management/profile', label: 'Profile', permission: null, icon: 'fa fa-user-circle' }
];

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    standalone: false
})
export class SidebarComponent implements OnInit {

  menuItem = [];
  menu: any;
  userName: string;

  constructor(
    public sideNavService: SideNavService,
    private route: ActivatedRoute,
    private router: Router,
    private appService: AdminAppService
  ) { }

  ngOnInit() {
    const data = this.route.snapshot.data['roles'];
    const isManagement = (data && data[0] === Role.Manager) || this.router?.url?.includes('/management');
    this.menuItem = [
      { link: '/app/admin/dashboard', label: 'Dashboard', icon: 'fa fa-tachometer' },
      { link: '/app/admin/revenue', label: 'Revenue share', icon: 'fa fa-chart-pie' },
      { link: '/app/admin/analytics', label: 'Analytics', icon: 'fa fa-chart-line' },
      { link: '/app/admin/students', label: 'Student List', icon: 'fa fa-users' },
      { link: '/app/admin/trainers', label: 'Trainer List', icon: 'fa fa-graduation-cap' },
      { link: '/app/admin/companies', label: 'Company List', icon: 'fa fa-building' },
      { link: '/app/admin/management', label: 'Management List', icon: 'fa fa-list' },
      { link: '/app/admin/category', label: 'Category List', icon: 'fa fa-folder' },
      { link: '/app/admin/course', label: 'Course List', icon: 'fa fa-book' },
      { link: '/app/admin/blog', label: 'Blog', icon: 'fa fa-blog' },
      { link: '/app/admin/newsletter-subscriptions', label: 'NewsletterSubscriptions', icon: 'fa fa-envelope' },
      { link: '/app/admin/events', label: 'Events', icon: 'fa fa-calendar-alt' },
      { link: '/app/admin/chat', label: 'Chat', icon: 'fa fa-comment' },
      { link: '/app/admin/notifications', label: 'Push notifications', icon: 'fa fa-bell' },
      { link: '/app/admin/profile', label: 'Profile', icon: 'fa fa-user-circle' },
    ];
    if (isManagement) {
      this.appService.getMyManagementPermissions().subscribe({
        next: (perms: string[]) => {
          const allowed = new Set(perms || []);
          this.menuItem = MANAGEMENT_MENU
            .filter(m => !m.permission || allowed.has(m.permission))
            .map(m => ({ link: m.link, label: m.label, icon: m.icon }));
        },
        error: () => {
          this.menuItem = MANAGEMENT_MENU.map(m => ({ link: m.link, label: m.label, icon: m.icon }));
        }
      });
    }
  }

}
