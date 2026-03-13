import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../auth.service';

@Component({
  selector: 'app-register-trainer',
  templateUrl: './register-trainer.component.html',
  styleUrls: ['./register-trainer.component.scss'],
  standalone: false
})
export class RegisterTrainerComponent implements OnInit {
  email = '';
  password = '';
  givenName = '';
  name = '';

  /** Logo URL from environment; same as Login/Register. */
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {}

  register(): void {
    try {
      this.registerTrainer();
    } catch (error) {
      console.log('error signing up:', error);
    }
  }

  registerTrainer(): void {
    try {
      const request = {
        LastName: this.email,
        FirstName: this.email,
        UserName: this.email,
        Email: this.email,
        Password: this.password
      };
      this.authenticationService.registerTrainer(request).pipe(first()).subscribe({
        next: (data) => {
          if (data) {
            this.router.navigate(['auth', 'verification'], { queryParams: { code: btoa(this.email) } });
          }
        },
        error: (err) => {
          console.log('error signing up:', err);
        }
      });
    } catch (error) {
      console.log('error signing up:', error);
    }
  }
}
