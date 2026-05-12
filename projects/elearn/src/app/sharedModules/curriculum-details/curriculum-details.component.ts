import { RetakeQuestionComponent } from './../../shared/modals/retake-question/retake-question.component';
import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, Renderer2, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { CurriculamStatus, QuestionType, Role } from 'src/app/shared/models/role';
import { CommonServiceService } from 'src/app/shared/service/common-service.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { Location } from '@angular/common';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { PlayerStateService } from 'src/app/core/services/player-state.service';
import { AnalyticsService } from 'src/app/core/services/analytics.service';
import { CurriculumSidebarService } from 'src/app/core/services/curriculum-sidebar.service';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-curriculum-details',
    templateUrl: './curriculum-details.component.html',
    styleUrls: ['./curriculum-details.component.scss'],
    standalone: false
})
export class CurriculumDetailsComponent implements OnInit, OnDestroy {
  curriculumDetails: any = {};
  curriculumId: string;
  subscription: Subscription = new Subscription();
  private readonly destroy$ = new Subject<void>();
  role: any;
  redirectTo: string;
  questionType: any;
  showQuestionTab: any;
  showStudyTab: any;
  showVideoTab: any;
  showConceptTab: any;
  CurriculumConceptsEnum: CurriculamStatus;
  CurriumStudyMateialEnum: CurriculamStatus;
  CurriculumVideoLecturesEnum: CurriculamStatus;
  QuestionsEnum: CurriculamStatus;
  courseName: string;
  selectedTab = 'C'
  curriculamNextPrev:any;
  Curriculams:any;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  constructor(
    private appService: AdminAppService,
    private ngZone: NgZone,
    private el: ElementRef,
    private activatedRoute: ActivatedRoute, private _service: CommonServiceService,
    private _authService:AuthenticationService,
    private route: Router, private modalService: NgbModal, private location: Location,
    private playerState: PlayerStateService,
    private analyticsService: AnalyticsService,
    public curriculumSidebar: CurriculumSidebarService
  ) {
    // Removed auto scrollIntoView – it was causing the page to jump when curriculumDetails emitted
    this.subscription.add(
      this._authService.curriculumDetails.subscribe(key => {
        if (!key) { return; }
        switch (key) {
          case 'KeyPoint':
            this.scrollToSection('KeyPoints');
            this.setCourseProgressDetails(this.CurriculumConceptsEnum, 'C');
            break;
          case 'StudyMaterials':
            this.scrollToSection('StudyMaterials');
            this.setCourseProgressDetails(this.CurriumStudyMateialEnum, 'S');
            break;
          case 'VideoLectures':
            this.scrollToSection('VideoLectures');
            this.setCourseProgressDetails(this.CurriculumVideoLecturesEnum, 'V');
            break;
          case 'Questions':
            this.scrollToSection('Questions');
            this.setCourseProgressDetails(this.QuestionsEnum, 'Q');
            break;
        }
      })
    );
    this._authService.courseStructure.next('');
  }

  display: any;
  questionLength:number = 0;

  ngOnInit(): void {
    this.role = +sessionStorage.getItem('Role');
    if (this.role === Role.Company) {
      this.redirectTo = 'company';
    } else if (this.role === Role.Student) {
      this.redirectTo = 'student';
    }
    this.questionType = QuestionType.CurriculumQA;

    // IMPORTANT: Avoid duplicate re-initialization for the same curriculumId
    // (router may emit params repeatedly in some edge cases; also prevents leaks on recreate).
    this.activatedRoute.params
      .pipe(
        takeUntil(this.destroy$),
        map((params) => (params as any)?.curriculumId as string | undefined),
        distinctUntilChanged()
      )
      .subscribe((id) => {
        if (!id) return;
        this.curriculumId = id;

        this.curriculumDetails = JSON.parse(localStorage.getItem('curriculum'));
        const role = +sessionStorage.getItem('Role');
        if (role === Role.Student || role === Role.Company) {
          this.analyticsService.recordEvent(
            'LessonOpen',
            'Curriculum',
            this.curriculumId,
            JSON.stringify({ curriculumId: this.curriculumId })
          );
        }

        const d = JSON.parse(localStorage.getItem('course'));
        this.Curriculams = JSON.parse(localStorage.getItem('curriculams'));
        this.checkNextCurriculam(this.curriculumId);
        if (d && d.title) {
          this.courseName = d.title;
        }
        this.showHideTab();

        // Only fetch question count when Quiz tab is shown.
        if (this.showQuestionTab) {
          this.subscription.add(
            this.appService.getQuestionsByCurriculumId(this.curriculumId).subscribe((res: any) => {
              this.questionLength = res?.length ?? 0;
            })
          );
        }
      });
  }

  navigateToNext(id){
    var path=`/app/${this.redirectTo}/details/curriculum-details/${id}`
    this.route.navigate([path]);
  }

  /** Mobile: open a curriculum from the sidebar and close the sidebar (data updates via route). */
  openCurriculumAndCloseSidebar(item: any): void {
    if (item?.id) {
      this.curriculumSidebar.close();
      this.navigateToNext(item.id);
    }
  }

  enterVideoFocusMode(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const list = this.Curriculams || [];
    if (!list.length || !this.curriculumId) return;
    this.playerState.setRedirectTo(this.redirectTo);
    this.playerState.enterFocusMode(list, this.curriculumId);
  }
  checkNextCurriculam(id){
    var data=this.Curriculams.map(x=>x.id);
    var ix = data.indexOf(id)
    this.curriculumDetails=this.Curriculams[ix]
    if (ix == -1) return;
    var next = data[ix + 1];
    var prev = data[ix - 1];
    this.curriculamNextPrev={
      next,
      prev
    }
  }
  goBack() {
    this.location.back();
  }

  showHideTab() {
    let obj = {
      title:  this.curriculumDetails.title,
      curriculumConceptCount: this.curriculumDetails.curriculumConceptCount>0 ? true : false,
      curriculumQuestionCount :  this.curriculumDetails.curriculumQuestionCount>0 ? true : false,
      curriculumStudyMaterialCount :  this.curriculumDetails.curriculumStudyMaterialCount>0 ? true : false,
      curriculumVideoLectureCount :  this.curriculumDetails.curriculumVideoLectureCount>0 ? true : false,
      curriculumConceptTotal: this.curriculumDetails.curriculumConceptCount || 0,
      curriculumQuestionTotal: this.curriculumDetails.curriculumQuestionCount || 0,
      curriculumStudyMaterialTotal: this.curriculumDetails.curriculumStudyMaterialCount || 0,
      curriculumVideoLectureTotal: this.curriculumDetails.curriculumVideoLectureCount || 0,
    };
    this._authService.curriculumData.next(obj);

    this.showConceptTab = this.curriculumDetails.curriculumConceptCount > 0 ? true : false;
    this.showStudyTab = this.curriculumDetails.curriculumStudyMaterialCount > 0 ? true : false;
    this.showVideoTab = this.curriculumDetails.curriculumVideoLectureCount > 0 ? true : false;
    this.showQuestionTab = this.curriculumDetails.curriculumQuestionCount > 0 ? true : false;
    this.CurriculumConceptsEnum = CurriculamStatus.CurriculumConcepts;
    this.CurriumStudyMateialEnum = CurriculamStatus.CurriculumStudyMaterials;
    this.CurriculumVideoLecturesEnum = CurriculamStatus.CurriculumVideoLectures;
    this.QuestionsEnum = CurriculamStatus.Questions;
    var QuestionTab = false;
    //add course progress details for 1st hit
    if (this.showConceptTab) {
      this.selectedTab = 'C'
      this.setCourseProgressDetails(this.CurriculumConceptsEnum, this.selectedTab);
    }
    else if (this.showStudyTab) {
      this.selectedTab = 'S'
      this.setCourseProgressDetails(this.CurriumStudyMateialEnum, this.selectedTab);
    }
    else if (this.showVideoTab) {
      this.selectedTab = 'V'
      this.setCourseProgressDetails(this.CurriculumVideoLecturesEnum, this.selectedTab);
    }
    else if (this.showQuestionTab) {
      this.selectedTab = 'Q'
      this.setCourseProgressDetails(this.QuestionsEnum, this.selectedTab);
      // this.fnQuestion(this.QuestionsEnum)
      QuestionTab = true;
    }

    if (!this.showQuestionTab) {
      this._service.startTest(null, CurriculamStatus.Curriculums, this.curriculumId);
    }
    //  if(QuestionTab){
    //   setTimeout(() => {
    //     this.fnQuestion(this.QuestionsEnum)
    //   }, 100);
    //  }
  }
  ngOnDestroy() {
    this.curriculumSidebar.close();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this._authService.curriculumData.next({
      curriculumConceptCount: false,
      curriculumQuestionCount : false,
      curriculumStudyMaterialCount : false,
      curriculumTopicCount : false,
      curriculumVideoLectureCount : false,
      curriculumConceptTotal: 0,
      curriculumQuestionTotal: 0,
      curriculumStudyMaterialTotal: 0,
      curriculumVideoLectureTotal: 0,
    }  )
    // localStorage.removeItem('curriculum')
  }
  setCourseProgressDetails(entityType, x) {
    this.selectedTab = x

    let courseProgressID = sessionStorage.getItem('courseProgressID')
    if (courseProgressID) {
      this._service.setCourseProgressDetails(courseProgressID, entityType, this.curriculumId);
    }
  }

  /** Smoothly scroll main content to a section by element id (KeyPoints, StudyMaterials, VideoLectures, Questions). */
  private scrollToSection(elementId: string): void {
    try {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch {
      // fail silently – no scroll target
    }
  }

  /**
   * Header tab click handler:
   * C = Keypoints (Concepts), S = Study Material, V = Video, Q = QA/Questions.
   * Shows only the selected section and updates course progress where applicable.
   */
  onTabClick(tab: 'C' | 'S' | 'V' | 'Q'): void {
    this.selectedTab = tab;

    this.showConceptTab = tab === 'C';
    this.showStudyTab = tab === 'S';
    this.showVideoTab = tab === 'V';
    this.showQuestionTab = tab === 'Q';

    switch (tab) {
      case 'C':
        if (this.showConceptTab) {
          this.setCourseProgressDetails(this.CurriculumConceptsEnum, tab);
        }
        break;
      case 'S':
        if (this.showStudyTab) {
          this.setCourseProgressDetails(this.CurriumStudyMateialEnum, tab);
        }
        break;
      case 'V':
        if (this.showVideoTab) {
          this.setCourseProgressDetails(this.CurriculumVideoLecturesEnum, tab);
        }
        break;
      case 'Q':
        // For QA tab we just show the Quiz section; actual test start/navigation
        // remains driven by the \"Start Quiz\" button and fnQuestion().
        if (this.showQuestionTab) {
          this.setCourseProgressDetails(this.QuestionsEnum, tab);
        }
        break;
    }
  }
  fnQuestion(entityType) {
    this.selectedTab = 'Q'

    let completedCurriculamURL = `/app/${this.redirectTo}/curriculum-questions/${this.curriculumId}/${this.questionType}`;
    if (this.curriculumDetails.isCompleted) {
      // Compute next curriculum strictly from current course sequence (Curriculams),
      // using array order / orderIndex – never by id across courses.
      const list = this.Curriculams || [];
      const ids = list.map((x: any) => x.id);
      const ix = ids.indexOf(this.curriculumId);
      const hasNext = ix !== -1 && ix < list.length - 1;
      const next = hasNext ? list[ix + 1] : null;

      const modal = this.modalService.open(RetakeQuestionComponent, { centered: true });
      modal.componentInstance.completedCurriculamName = this.curriculumDetails.title;
      modal.componentInstance.completedCurriculamURL = completedCurriculamURL;

      if (next) {
        // Persist next curriculum so details page sees correct data when user clicks “Next Curriculum”
        localStorage.setItem('curriculum', JSON.stringify(next));
        modal.componentInstance.nextCurriculamName = next.title;
        modal.componentInstance.nextCurriculamURL =
          `/app/${this.redirectTo}/details/curriculum-details/${next.id}`;
      } else {
        // No further curriculum in this course – hide next section in popup
        modal.componentInstance.nextCurriculamName = null;
        modal.componentInstance.nextCurriculamURL = null;
      }
      // Swal.fire({
      //   icon: 'success',
      //   title: '',
      //   showConfirmButton: false,
      //   html: 'You have completed ' + this.curriculumDetails.title +
      //   '<br/>' +
      //   'Next curriculam' +
      //   '<br/>' +
      //   '<button (click)="retakeTest(' + entityType + ')">Retake Test</button>'
      //   // showCancelButton: true,
      //   // confirmButtonText: 'Retake Test',
      // }).then((result) => {
      //   //
      //   // if (result.isConfirmed) {
      //   //   this.setCourseProgressDetails(entityType);
      //   //   this._service.startTest(null, CurriculamStatus.Curriculums, this.curriculumId);
      //   //   let path = `/app/${this.redirectTo}/curriculum-questions/${this.curriculumId}/${this.questionType}`;
      //   //   this.route.navigate([path]);
      //   // }
      // });
    } else {
      this.setCourseProgressDetails(entityType, this.selectedTab);
      this._service.startTest(null, CurriculamStatus.Curriculums, this.curriculumId);
      this.route.navigate([completedCurriculamURL]);
    }
  }
  retakeTest(entityType) {
    this.setCourseProgressDetails(entityType, this.selectedTab);
    this._service.startTest(null, CurriculamStatus.Curriculums, this.curriculumId);
    let path = `/app/${this.redirectTo}/curriculum-questions/${this.curriculumId}/${this.questionType}`;
    this.route.navigate([path]);
  }

}
