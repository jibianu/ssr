import { Role } from '../shared/models/role';

export { normalizeRoleLandingRoute, normalizeAppRouterUrl } from '../core/helpers/app-url.helper';

export interface NavbarMenuItem {
  link: string;
  label: string;
  icon?: string;
  /** Optional fragment (e.g. 'analytics') so the link is distinct and clickable when the path is the same as another item. */
  fragment?: string;
  /** Permission key for Management (filtered by getMyManagementPermissions); null = always show. Admin/Trainer/Company use full menu for their role. */
  permission?: string | null;
  /** Content permission for Trainer (Blog, Course, Event). Item shown only if user has this permission. Omit = always show for trainer. */
  contentPermission?: 'Blog' | 'Course' | 'Event' | null;
}

const APP = '/app';

export const NAVBAR_MENU: Record<number, NavbarMenuItem[]> = {
  [Role.Admin]: [
    { link: `${APP}/admin/dashboard`, label: 'Dashboard', icon: 'fa fa-tachometer' },
    { link: `${APP}/admin/revenue`, label: 'Revenue share', icon: 'fa fa-chart-pie' },
    { link: `${APP}/admin/billing`, label: 'Billing & Licenses', icon: 'fa fa-credit-card' },
    { link: `${APP}/admin/analytics/dashboard`, label: 'Analytics Dashboard', icon: 'fa fa-chart-line' },
    { link: `${APP}/admin/analytics`, label: 'Student Analytics', icon: 'fa fa-users' },
    { link: `${APP}/admin/blog`, label: 'Blog', icon: 'fa fa-blog' },
    { link: `${APP}/admin/blog/corporate`, label: 'Corporate blog', icon: 'fa fa-building' },
    { link: `${APP}/admin/students`, label: 'Student List', icon: 'fa fa-users' },
    { link: `${APP}/admin/trainers`, label: 'Trainer List', icon: 'fa fa-graduation-cap' },
    { link: `${APP}/admin/companies`, label: 'Company List', icon: 'fa fa-building' },
    { link: `${APP}/admin/management`, label: 'Management List', icon: 'fa fa-list' },
    { link: `${APP}/admin/category`, label: 'Category List', icon: 'fa fa-folder' },
    { link: `${APP}/admin/course`, label: 'Course List', icon: 'fa fa-book' },
    { link: `${APP}/admin/events`, label: 'Events', icon: 'fa fa-calendar-alt' },
    { link: `${APP}/admin/coupons`, label: 'Coupons', icon: 'fa fa-ticket-alt' },
    { link: `${APP}/admin/newsletter-subscriptions`, label: 'NewsletterSubscriptions', icon: 'fa fa-envelope' },
    { link: `${APP}/admin/chat`, label: 'Chat', icon: 'fa fa-comments' },
    { link: `${APP}/admin/notification-list`, label: 'Notifications', icon: 'fa fa-bell' },
    { link: `${APP}/admin/notification-history`, label: 'Notification History', icon: 'fa fa-history' },
    { link: `${APP}/admin/trainer-payouts`, label: 'Trainer Payouts', icon: 'fa fa-money-check-alt' },
    { link: `${APP}/admin/affiliates`, label: 'Affiliates', icon: 'fa fa-hand-holding-usd' },
    { link: `${APP}/profile`, label: 'Profile', icon: 'fa fa-user-circle' },
  ],
  [Role.Manager]: [
    { link: `${APP}/management/dashboard`, label: 'Dashboard', icon: 'fa fa-home', permission: null },
    { link: `${APP}/management/revenue`, label: 'Revenue share', icon: 'fa fa-chart-pie', permission: null },
    { link: `${APP}/management/students`, label: 'Student List', icon: 'fa fa-users', permission: 'StudentList' },
    { link: `${APP}/management/trainers`, label: 'Trainer List', icon: 'fa fa-graduation-cap', permission: null },
    { link: `${APP}/management/companies`, label: 'Company List', icon: 'fa fa-building', permission: 'CompanyList' },
    { link: `${APP}/management/management`, label: 'Management List', icon: 'fa fa-list', permission: 'ManagementList' },
    { link: `${APP}/management/category`, label: 'Category List', icon: 'fa fa-folder', permission: 'CategoryList' },
    { link: `${APP}/management/course`, label: 'Course List', icon: 'fa fa-book', permission: 'CourseList' },
    { link: `${APP}/management/blog`, label: 'Blog', icon: 'fa fa-blog', permission: null },
    { link: `${APP}/management/newsletter-subscriptions`, label: 'NewsletterSubscriptions', icon: 'fa fa-envelope', permission: null },
    { link: `${APP}/management/notification-list`, label: 'Notifications', icon: 'fa fa-bell', permission: null },
    { link: `${APP}/management/notification-history`, label: 'Notification History', icon: 'fa fa-history', permission: null },
    { link: `${APP}/management/trainer-payouts`, label: 'Trainer Payouts', icon: 'fa fa-money-check-alt', permission: null },
    { link: `${APP}/management/affiliates`, label: 'Affiliates', icon: 'fa fa-hand-holding-usd', permission: null },
    { link: `${APP}/profile`, label: 'Profile', icon: 'fa fa-user-circle', permission: null },
  ],
  [Role.Trainer]: [
    { link: `${APP}/trainer/dashboard`, label: 'Dashboard', icon: 'fa fa-tachometer' },
    { link: `${APP}/trainer/courses`, label: 'My Courses', icon: 'fa fa-th-list', contentPermission: 'Course' },
    { link: `${APP}/trainer/course/list`, label: 'Assigned course', icon: 'fa fa-book', contentPermission: 'Course' },
    { link: `${APP}/trainer/earnings`, label: 'Earnings', icon: 'fa fa-money' },
    { link: `${APP}/trainer/payout`, label: 'Payout & Tax', icon: 'fa fa-credit-card' },
    { link: `${APP}/trainer/events`, label: 'Event', icon: 'fa fa-calendar-alt', contentPermission: 'Event' },
    { link: `${APP}/trainer/blog`, label: 'Blog', icon: 'fa fa-blog', contentPermission: 'Blog' },
    { link: `${APP}/trainer/profile`, label: 'Profile', icon: 'fa fa-user-circle' },
  ],
  [Role.Company]: [
    { link: `${APP}/company/dashboard`, label: 'Dashboard', icon: 'fa fa-home' },
    { link: `${APP}/company/courses`, label: 'Courses', icon: 'fa fa-book' },
    { link: `${APP}/company/categories`, label: 'Explore', icon: 'fa fa-compass' },
    { link: `${APP}/company/billing`, label: 'Billing & Licenses', icon: 'fa fa-credit-card' },
    { link: `${APP}/company/blog`, label: 'Blog', icon: 'fa fa-blog' },
    { link: `${APP}/company/users`, label: 'Users', icon: 'fa fa-users' },
    { link: `${APP}/company/trainers`, label: 'Trainers', icon: 'fa fa-graduation-cap' },
    { link: `${APP}/company/settings/sso`, label: 'SSO configuration', icon: 'fa fa-key' },
    { link: `${APP}/company/profile`, label: 'Profile', icon: 'fa fa-user-circle' },
    { link: `${APP}/company/certificate`, label: 'Certificates', icon: 'fa fa-certificate' },
  ],
  [Role.Student]: [
    { link: `${APP}/student/dashboard`, label: 'Dashboard', icon: 'fa fa-home' },
    { link: `${APP}/student/courses`, label: 'My Courses', icon: 'fa fa-book' },
    { link: `${APP}/student/categories`, label: 'Explore', icon: 'fa fa-compass' },
    { link: `${APP}/student/profile`, label: 'Profile', icon: 'fa fa-user-circle' },
    { link: `${APP}/student/certificate`, label: 'Certificates', icon: 'fa fa-certificate' },
  ],
  [Role.Affiliate]: [
    { link: `${APP}/affiliate/dashboard`, label: 'Dashboard', icon: 'fa fa-tachometer' },
    { link: `${APP}/affiliate/profile`, label: 'Profile', icon: 'fa fa-user-circle' },
  ],
};

export function getNavbarMenuForRole(roleId: number | null): NavbarMenuItem[] {
  if (roleId == null) return [];
  return NAVBAR_MENU[roleId] ?? [];
}

