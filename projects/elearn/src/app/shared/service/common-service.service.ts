import { Injectable } from '@angular/core';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Subscription } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class CommonServiceService {

  subscription: Subscription = new Subscription();
  constructor(private appService: AdminAppService) { }

  setCourseProgressDetails(courseProgreessId, entityType, entityID) {
    var req = {
      "courseProgressId": courseProgreessId,
      "entityType": entityType,
      "entityId": entityID,
      "startDateTime": new Date(),
    }
    this.subscription.add(this.appService.addCourseProgressDetail(req)
      .subscribe(
        response => {
          console.log(response);
        },
        error => {
          console.log(error);
        }));
  }

  startTest(questionSetID, entityType, entityID) {
    const raw = localStorage.getItem('course');
    if (!raw) return;
    let course: any;
    try {
      course = JSON.parse(raw);
    } catch {
      return;
    }
    if (!course?.id || !course?.courseEnrollmentsResponse?.id) return;
    const obj = {
      courseId: course.id,
      usersCourseEnrollmentsId: course.courseEnrollmentsResponse.id,
      questionSetId: questionSetID,
      entityType: entityType,
      entityId: entityID
    };
    this.subscription.add(this.appService.startTest(obj).subscribe((res: any) => {
      if (res?.testId) {
        sessionStorage.setItem('testID', res.testId);
      }
    }));
  }
}
