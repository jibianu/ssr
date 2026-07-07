import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  eventCertificateList: any[] = [];
  loading = true;
  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {
    this.sharedService.certificateName.next('Certificates');
  }

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Certificates' }]);
    this.fnFetchCertificates();
  }

  gadata:any;
  eventGadata: any[] = [];

  fnFetchCertificates() {
    this.loading = true;
    const courseReq = this.appService.getEnrolledCourses({
      'Filter.IsCompleted': true,
      pageNumber: 1,
    }).pipe(catchError(() => of({ results: [] })));

    const eventReq = this.appService.getEventCertificates().pipe(catchError(() => of([])));

    this.subscription.add(
      forkJoin({ courses: courseReq, events: eventReq }).subscribe(({ courses, events }) => {
        this.courseList = courses?.results ?? [];
        this.gadata = this.courseList.map(x => ({
          ...x,
          bgColor: this.getRandomColor()
        }));
        this.eventCertificateList = Array.isArray(events) ? events : [];
        this.eventGadata = this.eventCertificateList.map(x => ({
          ...x,
          id: x.eventId ?? x.EventId,
          occurrenceId: x.eventOccurrenceId ?? x.EventOccurrenceId,
          title: x.title ?? x.Title,
          occurrenceStartDate: x.occurrenceStartDate ?? x.OccurrenceStartDate,
          bgColor: this.getRandomColor()
        }));
        this.loading = false;
      })
    );
  }

  get hasAnyCertificates(): boolean {
    return (this.courseList?.length ?? 0) > 0 || (this.eventCertificateList?.length ?? 0) > 0;
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
