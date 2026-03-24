// import { Component, OnInit } from '@angular/core';
// import { FormGroup, FormBuilder, Validators } from '@angular/forms';
// import { ActivatedRoute, Router } from '@angular/router';
// import { first } from 'rxjs/operators';
// import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
// import { AuthenticationService } from '../auth.service';

// @Component({
//   selector: 'app-register-company',
//   templateUrl: './register-company.component.html',
//   styleUrls: ['./register-company.component.scss']
// })
// export class RegisterCompanyComponent implements OnInit {

//   registerForm: FormGroup;
//   loading = false;
//   submitted = false;
//   returnUrl: string;
//   error = '';

//   constructor(
//     private formBuilder: FormBuilder,
//     private route: ActivatedRoute,
//     private router: Router,
//     private authenticationService: AuthenticationService,
//     private toasterService: ToasterService
//   ) { }

//   ngOnInit() {
//     this.registerForm = this.formBuilder.group({
//       username: ['', Validators.required],
//       password: ['', Validators.required],
//       firstName: ['', Validators.required],
//       lastName: ['', Validators.required],
//       profilePictureUrl: [''],
//       email: ['', [Validators.required, Validators.email]],
//       companyName: ['', Validators.required],
//     });

//   }

//   // convenience getter for easy access to form fields
//   get f() { return this.registerForm.controls; }

//   onSubmit() {
//     this.submitted = true;

//     // stop here if form is invalid
//     if (this.registerForm.invalid) {
//       return;
//     }

//     this.loading = true;
//     this.authenticationService.registerCompany(this.registerForm.value)
//       .pipe(first())
//       .subscribe(
//         data => {
//           if (data) {
//             this.toasterService.showSuccess('Registered successfully');
//             this.router.navigate(['/auth/login']);
//           }
//         },
//         error => {
//           this.error = error;
//           this.loading = false;
//         });
//   }

// }


import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../auth.service';

@Component({
  selector: 'app-register-company',
  templateUrl: './register-company.component.html',
  styleUrls: ['./register-company.component.scss'],
  standalone: false
})
export class RegisterCompanyComponent implements OnInit {
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
      //   const user = Auth.signUp({
      //     username: this.email,
      //     password: this.password,
      //     attributes: {
      //       email: this.email,
      //       given_name: this.givenName,
      //       name: this.name,
           
      //     }
      //   });
      //   console.log({ user });
      //   if (user!=null){
      //     alert('User signup completed , please check verify your email.');
          this.registerCompany();
      //   }
       
        //this.router.navigate(['login']);
      } catch (error) {
        console.log('error signing up:', error);
      }
  }

  private usernameFromEmail(email: string): string {
    if (!email || typeof email !== 'string') return email || '';
    const at = email.indexOf('@');
    return at > 0 ? email.slice(0, at).trim() : email.trim();
  }

  registerCompany(): void {
    try {
      const defaultUserName = this.usernameFromEmail(this.email) || this.email;
      const request = {
        LastName: this.email,
        FirstName: this.email,
        UserName: defaultUserName,
        Email: this.email,
        Password: this.password
      };
      this.authenticationService.registerCompany(request).pipe(first()).subscribe({
        next: (data) => {
          if (data) {
            this.router.navigate(['/verification'], { queryParams: { code: btoa(this.email) } });
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
