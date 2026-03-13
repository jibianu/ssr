import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Component({
  selector: 'app-management-layout',
  templateUrl: './management-layout.component.html',
  styleUrls: ['./management-layout.component.scss'],
  standalone: false,
})
export class ManagementLayoutComponent implements OnInit {
  userRole: number | null = null;

  constructor(private authService: AuthenticationService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRoleId();
  }
}
