import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../auth.service';

@Component({
    selector: 'app-verification-code',
    templateUrl: './verification-code.component.html',
    styleUrls: ['./verification-code.component.scss'],
    standalone: false
})
export class VerificationCodeComponent implements OnInit {

  constructor(private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParams.subscribe(res => {
      console.log(res)
      if (res.code) {
        this.email = atob(res.code)
      }
      // btoa()
    })
  }
  code: string = ''
  email: string = ''
  user: any;
  data: any;
  ngOnInit(): void {

  }
  verifyAccount() {
    var obj = {
      email: this.email,
      ConfirmationCode: this.code
    }
    this.user = this.authenticationService.confirmation(obj)
      .subscribe(res => {
        this.router.navigate(['auth', 'login'])
      })
  }
  resend() {
    var obj = {
      email: this.email
    }
    this.authenticationService.ResendConformationCode(obj)
      .subscribe(res => {

      })
  }

  clickEvent(first, last) {
    if (first.value.length) {
      document.getElementById(last).focus();
    }
  }
}
