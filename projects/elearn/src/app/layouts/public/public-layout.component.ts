import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-public-layout',
    templateUrl: './public-layout.component.html',
    styleUrls: ['./public-layout.component.scss'],
    standalone: false
})
export class PublicLayoutComponent implements OnInit {

  showTopBar = true;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateShowTopBar(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateShowTopBar(e.url));
  }

  private updateShowTopBar(url: string): void {
    const path = url.split('?')[0].replace(/\/$/, '') || '/';
    this.showTopBar = path !== '/';
  }

}
