import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  standalone: false,
})
export class AdminLayoutComponent implements OnInit {
  userRole: number | null = null;

  constructor(private authService: AuthenticationService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRoleId();
  }
}
