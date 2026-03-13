import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { Role } from 'src/app/shared/models/role';

@Component({
    selector: 'app-shared-curriculum-list',
    templateUrl: './shared-curriculum-list.component.html',
    styleUrls: ['./shared-curriculum-list.component.scss'],
    standalone: false
})
export class SharedCurriculumListComponent implements OnInit {


  courseId: string;
  courseDetails: any = {}
  curriculumList = [];
  questionsSetList = [];
  questions = [];
  subscription: Subscription = new Subscription();
  config: any;
  tableSizes = [5, 10, 20, 25, 50];
  term = '';
  sortDir = 1;
  role: any;
  redirectTo: string;
  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
    private router:Router,
    private authService:AuthenticationService
  ) {
    this.authService.courseStructure.next("Course Structure")
   }

  ngOnInit(): void {
    this.config = {
      itemsPerPage: 20,
      currentPage: 1,
    };
    this.role = +sessionStorage.getItem('Role');
    if (this.role === Role.Company) {
      this.redirectTo = 'company';
    } else if (this.role === Role.Student) {
      this.redirectTo = 'student';
    } else if (this.role === Role.Trainer) {
      this.redirectTo = 'trainer';
    }

    this.activatedRoute.params.subscribe(params => {
      if (params.courseId) {
        this.courseId = params.courseId;
        // Trainer: curriculum-list page not used; go directly to course-details.
        if (this.role === Role.Trainer) {
          this.router.navigate(['/app/trainer/course-details', this.courseId], { replaceUrl: true });
          return;
        }
        this.getCurriculumList(this.courseId);
      }
    });
  }

  /** For trainer: open curriculum editor sidebar (course-details page with modal). For student/company: go to curriculum-details. */
  goToCurriculumDetails(item) {
    localStorage.setItem('curriculum', JSON.stringify(item));
    if (this.redirectTo === 'trainer' && this.courseId) {
      this.router.navigate(['/app/trainer/course-details', this.courseId], { queryParams: { openCurriculum: item.id } });
      return;
    }
    setTimeout(() => {
      this.router.navigate([`/app/${this.redirectTo}/details/curriculum-details/${item.id}`]);
    }, 100);
  }
  // setCourseProgressDetails(item) {
  //   debugger
  //   var req = {
  //     "courseProgressId": sessionStorage.getItem('courseProgressID'),
  //     "entityType": item.title,
  //     "entityId": item.id,
  //     "startDateTime": new Date(),
  //   }
  //   this.subscription.add(this.appService.addCourseProgressDetail(req)
  //     .subscribe(
  //       response => {
  //         console.log(response);
  //       },
  //       error => {
  //         console.log(error);
  //       }));
  // }

  getCurriculumList(courseId) {
    this.subscription.add(this.appService.getCurriculumByCourseId1(courseId).subscribe((res: any) => {
      if (res) {
        this.curriculumList = res.curriculumResponseList;
        console.log(this.curriculumList)
      }
    }));
  }

  getquestionSetByCourseId(courseId) {
    this.subscription.add(this.appService.getQuetionSetCourseId(courseId).subscribe((res: any) => {
      if (res) {
        this.questionsSetList = res;
        this.getRandomQuestions(this.questionsSetList[0].id, this.questionsSetList[0].difficultyLevelId)
      }
    }));
  }

  getRandomQuestions(questionSetId, difficultyLevelId) {
    this.subscription.add(this.appService.getRandomQuestions(questionSetId, difficultyLevelId).subscribe((res: any) => {
      if (res) {
        this.questions = res;
      }
    }));
  }

  pageChanged(event) {
    this.config.currentPage = event;
  }

  onTableSizeChange(event): void {
    this.config.itemsPerPage = event.target.value;
    this.config.currentPage = 1;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  navigateTo(r){
    console.log(r)
    this.router.navigateByUrl(r)
  }
}


