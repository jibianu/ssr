import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

@Component({
    selector: 'app-invite-user',
    templateUrl: './invite-user.component.html',
    styleUrls: ['./invite-user.component.scss'],
    standalone: false
})
export class InviteUserComponent implements OnInit {

  constructor(public activeModal: NgbActiveModal,private appService: AdminAppService) { }
userList=[];
user:string;
  ngOnInit(): void {
  }
  closeModal(sendData) {
    this.activeModal.close(sendData);
}
addToList(){
  this.userList.push(this.user);
  this.user="";
}
removeUser(ix){
  // console.log(ix)
  this.userList.splice(ix,1);
}
InviteUsers(){
  if(this.userList.length>0){
    var obj={
      users:this.userList
    }
    this.appService.inviteUser(obj)
    .subscribe(res=>{
      this.activeModal.close(res);
    })

  }
}
}
