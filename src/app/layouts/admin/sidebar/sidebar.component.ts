import { SideNavService } from './../sidebar.service';
import { Component, OnInit } from '@angular/core';
import { CookieService } from 'src/app/core/services/cookie.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  menuItem = [];
  menu: any;

  constructor(
    private cookieService: CookieService,
    public sideNavService: SideNavService
  ) { }

  ngOnInit() {
    const user = JSON.parse(this.cookieService.getCookie('currentUser'));
    if (user && user.isAdmin) {
      this.menuItem = [
        {
          link: '/app/course/list',
          label: 'Course',
        },
        {
          link: '/app/category/list',
          label: 'Category',
        },
        {
          link: '/app/location/list',
          label: 'Location',
        },
        {
          link: '/app/user/list',
          label: 'User',
        },
        {
          link: '/app/icon/list',
          label: 'Icon',
        },
      ]
    } else {
      this.menuItem = [
        {
          link: '/app/course/list',
          label: 'Course',
        }]
    }
  }

}
