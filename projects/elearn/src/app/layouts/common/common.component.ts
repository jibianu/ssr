import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { Role } from './../../shared/models/role';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-common',
    templateUrl: './common.component.html',
    styleUrls: ['./common.component.scss'],
    standalone: false
})
export class CommonComponent implements OnInit {
setActive(arg0: string) {
throw new Error('Method not implemented.');
}

  showSidebar = false;
  hideExplore=false;
  isTrainer=false;
  isStudent=false;
  user;
userName: any;
userRole: any;
userProfileImage: any;
  constructor(
    private authService : AuthenticationService
  ) { }

  ngOnInit(): void {
    this.user = this.authService.currentUser();
    console.log(this.user);    
    const role = this.user.roleId;
    if (role === Role.Trainer) {
      this.showSidebar = true;
      this.hideExplore=true;
      this.isTrainer=true;
    }
    if(role==Role.Student){
      this.isStudent=true;
    }
  }
  bgValue:string = 'course';
  activeBackground(val:string){
    this.bgValue = val;
  }

}
