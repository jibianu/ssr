import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Component({
  selector: 'app-company-layout',
  templateUrl: './company-layout.component.html',
  styleUrls: ['./company-layout.component.scss'],
  standalone: false,
})
export class CompanyLayoutComponent implements OnInit {
  userRole: number | null = null;

  constructor(private authService: AuthenticationService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRoleId();
  }
}
