import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../auth.service';

@Component({
    selector: 'app-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss'],
    standalone: false
})
export class ChangePasswordComponent implements OnInit {

  constructor(
    private authenticationService: AuthenticationService,
    private router:Router,private route:ActivatedRoute
  ) { 
this.route.queryParams.subscribe(res=>{
  if(res.code){
    this.email=atob(res.code);
  }
})
  }
  email:string;
  password:string='';
  confirmPassword:string=''
  ngOnInit(): void {
  }
  changePassword(){
if(this.password==this.confirmPassword){
  var obj={
    username:this.email,
    newPassword:this.password
  }
  this.authenticationService.change_password(obj)
  .subscribe(res=>{
    this.router.navigate(['auth','login']);
  })
}
  }
}
