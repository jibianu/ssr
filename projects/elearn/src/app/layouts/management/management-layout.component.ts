import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Component({
  selector: 'app-management-layout',
  templateUrl: './management-layout.component.html',
  styleUrls: ['./management-layout.component.scss'],
  standalone: false,
})
export class ManagementLayoutComponent implements OnInit {
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
    this.showBlogSectionTabs = /\/management\/(blog|category|blog-users|loop-marketing)(\/|$)/.test(url);
  }
}
