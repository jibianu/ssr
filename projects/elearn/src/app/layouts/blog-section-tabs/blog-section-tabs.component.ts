import { Component, Input } from '@angular/core';

export interface BlogSectionTabItem {
  link: string;
  label: string;
  icon: string;
}

/** Horizontal tab bar (Blog | Category | User | Loop Marketing) for blog admin section. */
@Component({
  selector: 'app-blog-section-tabs',
  templateUrl: './blog-section-tabs.component.html',
  styleUrls: ['./blog-section-tabs.component.scss'],
  standalone: false,
})
export class BlogSectionTabsComponent {
  /** Base path for links, e.g. '/app/admin' or '/app/management'. */
  @Input() set basePath(path: string) {
    this._basePath = path || '/app/admin';
    this.tabItems = this.buildTabItems();
  }
  get basePath(): string {
    return this._basePath;
  }
  private _basePath = '/app/admin';

  tabItems: BlogSectionTabItem[] = [];

  private buildTabItems(): BlogSectionTabItem[] {
    const base = this._basePath;
    return [
      { link: `${base}/blog`, label: 'Blog', icon: 'fa fa-file-text' },
      { link: `${base}/category`, label: 'Category', icon: 'fa fa-tags' },
      { link: `${base}/blog-users`, label: 'User', icon: 'fa fa-users' },
      { link: `${base}/loop-marketing`, label: 'Loop Marketing', icon: 'fa fa-edit' },
    ];
  }
}
