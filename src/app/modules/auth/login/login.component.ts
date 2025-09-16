import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthenticationService } from './../auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-login',
  standalone : true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  returnUrl = '/';
  error = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private toasterService: ToasterService
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    // read returnUrl from query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/course';
  }

  // getter for form controls
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;

    this.authenticationService.login(this.f['username'].value, this.f['password'].value)
      .pipe(first())
      .subscribe({
        next: data => {
          if (data) {
            this.getUserInfo();
            this.toasterService.showSuccess('Logged in successfully');
          }
        },
        error: (err) => {
          this.error =
            typeof err === 'string'
              ? err
              : err?.error?.message ?? err?.message ?? 'Login failed';
          this.loading = false;
        }
      });
  }

  private getUserInfo() {
    this.authenticationService.getUserInfo().pipe(first()).subscribe({
      next: (data: any) => {
        if (data) {
          console.log(this.returnUrl, data)
          this.router.navigate([this.returnUrl]);
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
