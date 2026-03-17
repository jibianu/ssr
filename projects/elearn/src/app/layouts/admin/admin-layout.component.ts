import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  standalone: false,
})
export class AdminLayoutComponent implements OnInit {
  userRole: number | null = null;
  showBlogSectionTabs = false;

  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRoleId();
    this.updateShowBlogSectionTabs(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateShowBlogSectionTabs(e.url));
  }

  private updateShowBlogSectionTabs(url: string): void {
    this.showBlogSectionTabs = /\/admin\/(blog|category|blog-users|loop-marketing)(\/|$)/.test(url);
  }
}
