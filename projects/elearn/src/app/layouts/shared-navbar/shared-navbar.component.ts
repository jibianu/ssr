import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { Role } from '../../shared/models/role';
import { getNavbarMenuForRole, NavbarMenuItem } from '../../config/navbar-menu.config';
import { CookieService } from '../../core/services/cookie.service';
import { SidebarToggleService } from '../../core/services/sidebar-toggle.service';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';
import { SharedService } from '../../shared/service/shared-service.service';

@Component({
  selector: 'app-shared-navbar',
  templateUrl: './shared-navbar.component.html',
  styleUrls: ['./shared-navbar.component.scss'],
  standalone: false,
})
export class SharedNavbarComponent implements OnInit, OnDestroy {
  @Input() role: number | null = null;

  menuItems: NavbarMenuItem[] = [];
  userName = '';
  userDisplayName = '';
  userEmail = '';
  userImageUrl: string | null = null;
  hideSideNav = false;
  private sub = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private cookieService: CookieService,
    private sidebarToggle: SidebarToggleService,
    private appService: AdminAppService,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    const roleId = this.role ?? this.authService.getRoleId();
    this.menuItems = getNavbarMenuForRole(roleId);

    if (roleId === Role.Manager) {
      this.appService.getMyManagementPermissions().subscribe({
        next: (perms: string[]) => {
          const allowed = new Set(perms || []);
          const full = getNavbarMenuForRole(Role.Manager);
          this.menuItems = full.filter(m => !m.permission || allowed.has(m.permission));
        },
        error: () => {
          this.menuItems = getNavbarMenuForRole(Role.Manager);
        },
      });
    }

    if (roleId === Role.Trainer) {
      // Show all trainer menu items (Dashboard, My Courses, Assigned course, Event, Blog, etc.)
      // so trainers can always open those pages; Add vs Request Permission is handled on each page.
      this.menuItems = getNavbarMenuForRole(Role.Trainer);
    }

    this.sub.add(
      this.sidebarToggle.onOpenRequest.subscribe(() => {
        this.hideSideNav = false;
      })
    );

    this.loadUserFromCookie();
    this.sub.add(
      this.appService.getUserInfo().subscribe({
        next: (res: any) => {
          if (res) {
            this.userDisplayName = this.buildDisplayName(res.firstName, res.lastName, res.userName);
            this.userEmail = res.email ?? '';
            this.userImageUrl = res.profilePictureUrl ?? res.ProfilePictureUrl ?? null;
          }
        },
        error: () => {
          // 401 or network: keep showing cookie user or defaults; don't break navbar or redirect
        },
      })
    );
    this.sub.add(
      this.sharedService.profileImageUrl$.subscribe((url) => {
        this.userImageUrl = url;
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private loadUserFromCookie(): void {
    const user = this.authService.currentUser();
    let u = user;
    if (!u) {
      try {
        u = JSON.parse(this.cookieService.getCookie('currentUser') || '{}');
      } catch {
        u = {};
      }
    }
    this.userName = u?.email ?? 'User';
    this.userDisplayName = this.buildDisplayName(u?.firstName, u?.lastName, u?.userName);
    this.userEmail = u?.email ?? '';
    this.userImageUrl = u?.profilePictureUrl ?? u?.ProfilePictureUrl ?? null;
  }

  private buildDisplayName(firstName?: string, lastName?: string, userName?: string): string {
    const full = [firstName, lastName].filter(Boolean).join(' ').trim();
    return full || userName || 'User';
  }

  toggleSideNav(): void {
    this.hideSideNav = !this.hideSideNav;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
