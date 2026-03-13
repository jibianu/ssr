import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../modules/auth/auth.service';

@Component({
  selector: 'app-trainer-layout',
  templateUrl: './trainer-layout.component.html',
  styleUrls: ['./trainer-layout.component.scss'],
  standalone: false,
})
export class TrainerLayoutComponent implements OnInit {
  userRole: number | null = null;

  constructor(private authService: AuthenticationService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRoleId();
  }
}
