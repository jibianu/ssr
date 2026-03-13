import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';

@Component({
    selector: 'app-common-certificate',
    templateUrl: './common-certificate.component.html',
    styleUrls: ['./common-certificate.component.scss'],
    standalone: false
})
export class CommonCertificateComponent implements OnInit, OnDestroy {

  subscription: Subscription = new Subscription();
  courseList: any;
  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {
    this.sharedService.certificateName.next('Certificates');
  }

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Certificates' }]);
    this.fnFechCertificateCourse();
  }

  gadata:any;
  fnFechCertificateCourse() {
    let obj = {
      'Filter.IsCompleted': true,
      // 'Sort.PropertyName': this.sortBy,
      // 'Sort.IsAscending': this.isAsc,
      // pageSize: this.tableSize,
      pageNumber: 1,
    }
    this.subscription.add(
      this.appService.getEnrolledCourses(obj)
        .subscribe(res => {
          // console.log(res)
          this.courseList = res.results;
          this.gadata = this.courseList.map(x => ({
            ...x,
            bgColor: this.getRandomColor()
        
          }));
        })
    )
  }

  getRandomColor() {
    var color = Math.floor(0x1000000 * Math.random()).toString(16);
    var color1 = Math.floor(0x1000000 * Math.random()).toString(16);
    var color2 = Math.floor(0x1000000 * Math.random()).toString(16);
    return "background-image: linear-gradient(to bottom right," + "#" + ("000000" + color).slice(-6) + ",#" + ("000000" + color1).slice(-6) + ",#" + ("000000" + color2).slice(-6) + ")";
  }


  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.sharedService.certificateName.next('');
  }

}
