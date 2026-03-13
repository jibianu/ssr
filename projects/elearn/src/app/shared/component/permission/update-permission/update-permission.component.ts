import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Role } from 'src/app/shared/models/role';

@Component({
    selector: 'app-update-permission',
    templateUrl: './update-permission.component.html',
    styleUrls: ['./update-permission.component.css'],
    standalone: false
})
export class UpdatePermissionomponent implements OnInit {

    permissionList: any = [];
    rolesList: any;
    userRoleId: any;
    rolePermission: [number];
    @Input() userId: any;
    @Input() role: Role;
    userExistingPermissions: any;
    selectedRole: string;

    constructor(
        public activeModal: NgbActiveModal,
        private appService: AdminAppService
    ) { }

    ngOnInit(): void {
        this.fetchPermission();
    }

    fetchPermission() {
        this.appService.Get('api/User/permissions/byuser/' + this.userId)
            .then(response => {
                this.rolesList = response.roleResponse;
                this.permissionList = response.permissionResponse;
                this.userRoleId = response.roleId;
                this.userExistingPermissions = response.userPermissions;
                this.rolePermission = response.rolePermission;
                if (this.role != Role.Admin) {
                    this.permissionList = this.permissionList.filter(x => this.rolePermission.includes(x.id));
                }
                this.selectedRole = this.rolesList?.find(x => x.id == this.userRoleId)?.name;
                this.permissionList.forEach(element => {
                    element.IsChecked = this.userExistingPermissions?.includes(element.id) ?? false;
                });
            });
    }

    closeModal(sendData?: any) {
        this.activeModal.close(sendData);
    }

    updateStudent() {
        const req = {
                roleId: this.userRoleId,
                userId: this.userId,
                userPermissions: this.permissionList.filter(x => x.IsChecked).map(el => ({
                    permissionId: el.id,
                    name: el.name,
                    selected: el.IsChecked
                }))
            };
            this.appService.updateStudent(req).subscribe({
                next: () => { this.closeModal('saved'); },
                error: () => { }
            });
    }
}
