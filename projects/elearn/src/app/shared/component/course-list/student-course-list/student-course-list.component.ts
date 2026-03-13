import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Category } from 'src/app/modules/adminapp/category/category.model';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from '../../toaster/toaster.service';

@Component({
    selector: 'app-student-course-list',
    templateUrl: './student-course-list.component.html',
    styleUrls: ['./student-course-list.component.scss'],
    standalone: false
})
export class StudentCourseListComponent implements OnInit {
  categories = new Array<Category>();
  @Input() userID: any;
  @Input() showNoOfUserField: boolean;
  @Input() name: any;
  @Input() email: any;
  /** When true, show View and Edit permission checkboxes in navbar and per course (e.g. assign course to trainer). */
  @Input() showViewEditPermissions: boolean = false;
  courseList: any;
  enrolledCourses:any;
  startDate: NgbDateStruct;
  endDate: NgbDateStruct;
  submitted: boolean = false;
  modalcourseList: any;
  selectedCategory: string = 'Select Category';
  sortDir = 1;
  today:any;
  date=new Date();
  constructor(public activeModal: NgbActiveModal, private appService: AdminAppService,
    private toasterService: ToasterService) { }

  ngOnInit(): void {
    var now=new Date();
    this.today={year: now.getFullYear(), month: now.getMonth(), day: now.getDate()}
    this.fetchCourses();
  }
  fetchCourses() {
    this.appService.getCategoriesForModal()
      .then(
        response => {
          this.categories = response;
          this.sortArr('name');
        },
        error => {
          console.log(error);
        })
  }
getDate(date):Date{
  // console.log(d)
  try{
    return new Date(date.year, date.month - 1, date.day);
  }catch{
    return new Date();
  }
}
  sortArr(colName: any) {
    this.categories.sort((a, b) => {
      a = a[colName].toLowerCase();
      b = b[colName].toLowerCase();
      if (a < b) {
        return -1 * this.sortDir;
      }
      else if (a > b) {
        return 1 * this.sortDir;
      }
      else {
        return 0;
      }
    });
  }
  updateCourse(): void {
    // debugger
    let req = [];
    this.submitted = true;
    var list = this.modalcourseList.filter(x => x.isChecked == true);
    for(let element of list){
      if (this.showNoOfUserField) {
        if (element.noOfUsers < 1) {
          this.toasterService.showError('Please fill mandatory fields');
          return;
        }
      }
      if (!this.showNoOfUserField) {
        element.startDate={year:2022,month:10,day:1}
        element.endDate={year:2022,month:10,day:1};
      }
      if (element.startDate == null || element.endDate == null) {
        this.toasterService.showError('Please fill mandatory fields');
        return;
      }
      // debugger
      let obj: any = {
        userId: this.userID,
        courseId: element.courseID,
        noOfUsers: +element.noOfUsers,
        isSelected: true,
        startDate: new Date(element.startDate.year, element.startDate.month - 1, (element.startDate.day)),
        endDate: new Date(element.endDate.year, element.endDate.month - 1, (element.endDate.day))
      };
      if (this.showViewEditPermissions) {
        obj.canView = !!element.canView;
        obj.canEdit = !!element.canEdit;
      }
      req.push(obj);
    }
//     list.forEach(element => {
      
//     })
// console.log(list)
    //get un-enolled courses
    var allUnselectedCourses= this.modalcourseList.filter(x => x.isChecked == false);
     allUnselectedCourses.forEach(element => {
      let unenrollCourse = this.enrolledCourses.find(x => x.courseId == element.courseID);
     //if de-enrolled
      if (unenrollCourse){
        var startDate = element?.startDate ? (new Date(element.startDate)) : null;
        var endDate = element?.endDate ? (new Date(element.endDate)) : null;
        let deEnrollObj = {
          userId: this.userID,
          courseId: element.courseID,
          noOfUsers: element.noOfUsers,
          isSelected: false,
          startDate: element.startDate?new Date(element.startDate.year + '-' + element.startDate.month + '-' + (element.startDate.day)):new Date(),
          endDate: element.endDate?new Date(element.endDate.year + '-' + element.endDate.month + '-' + (element.endDate.day)):new Date()
        }
        // debugger
        req.push(deEnrollObj);
      }
    });


    if (req.length > 0) {
      this.appService.enrollCourse(req).subscribe({
        next: (res) => this.toasterService.showSuccess(res?.message || res || 'Course successfully enrolled'),
        error: (err) => this.toasterService.showError(err?.error?.message || 'Failed to enroll')
      });
    }
  }
  closeModal(sendData) {
    this.activeModal.close(sendData);
  }
  getCourseByCategory(item) {
    this.selectedCategory = item.name;
    this.modalcourseList = [];
    // this.appService.getCourseByCategory(item.id).then(
    this.appService.getCourseByUserAndCategory(this.userID, item.id).then(
      res => {
        this.courseList = res.courses;
        this.enrolledCourses = res.enrolledCourses;
        this.courseList.forEach(element => {
          let enrollCourse = this.enrolledCourses.find(x => x.courseId == element.id);
          var startDate = enrollCourse?.startDate ? (new Date(enrollCourse.startDate)) : null;
          var endDate = enrollCourse?.endDate ? (new Date(enrollCourse.endDate)) : null;
          let obj = {
            courseID: element.id,
            title: element.title,
            isChecked: enrollCourse ? true : false,
            noOfUsers: enrollCourse?.noOfUsers ? enrollCourse.noOfUsers : 0,
            startDate: startDate ? ({ year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate() }) :
              null,
            endDate: endDate ? ({ year: endDate.getFullYear(), month: endDate.getMonth() + 1, day: endDate.getDate() }) :
              null,
            isPublished: element.isPublished,
            canView: enrollCourse?.canView !== false,
            canEdit: enrollCourse?.canEdit === true,
          };
          this.modalcourseList.push(obj);
        });
      }
    )
  }
}
