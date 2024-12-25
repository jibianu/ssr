import { AuthenticationService } from './../../../modules/auth/auth.service';
import { SideNavService } from './../sidebar.service';
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'src/app/core/services/cookie.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {
  userId: string;
  userName: string;

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private cookieService: CookieService,
    public sideNavService: SideNavService
  ) { }

  ngOnInit() {
    const user = JSON.parse(this.cookieService.getCookie('currentUser'));
    this.userName = user.userName;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
