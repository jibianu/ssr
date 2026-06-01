import { Component, DoCheck, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Role } from 'src/app/shared/models/role';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { PlayerStateService } from 'src/app/core/services/player-state.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { AnalyticsService } from 'src/app/core/services/analytics.service';

@Component({
    selector: 'app-course-details',
    templateUrl: './course-details.component.html',
    styleUrls: ['./course-details.component.scss'],
    standalone: false
})
export class CourseDetailsComponent implements OnInit, DoCheck, OnDestroy {

  courseId: string;
  courseDetails: any = {};
  role: any;
  redirectTo: string;
  showCurriculumList = false;
  subscription: Subscription = new Subscription();
  curriculumList: any;
  /** Progress for sidebar bar: total and completed tasks (curricula + question sets). */
  totalTask = 0;
  completedTask = 0;
  /** Current topic (from curriculum list) for showing counts below sidebar; synced from route and itemOptions. */
  selectedCurriculumItem: any = null;
  showCurriculum: boolean;
  showPracticeTest: boolean;
  showTest: boolean;
  questionsSetList: any;
  isCurriculum = true;
  isTest = false;
  private courseOpenTracked = false;

  backgroundSelect: any[] = [];
  backgroundColorSetgreen: any;
  backgroundColorSetorange: any;

  constructor(
    private activatedRoute: ActivatedRoute,
    private appService: AdminAppService,
    private router: Router,
    private authService: AuthenticationService,
    public playerState: PlayerStateService,
    private studentBreadcrumb: StudentBreadcrumbService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.courseDetails = JSON.parse(localStorage.getItem('course') || 'null');
    this.authService.updateData(this.courseDetails?.title);
    if (this.courseDetails) {
      this.courseId = this.courseDetails.id;
    }
    // Sync with URL: when on curriculum-list/:courseId (or test-list/:courseId etc.), use that courseId so breadcrumb matches the page (e.g. HTRI not PIPENET)
    if (this.activatedRoute.firstChild) {
      this.subscription.add(
        this.activatedRoute.firstChild.params.subscribe(params => {
          const id = params?.courseId;
          if (id && id !== this.courseDetails?.id) {
            this.courseId = id;
            this.appService.getCourseByCourseID(id, true).subscribe((course: any) => {
              if (course) {
                this.courseDetails = course;
                localStorage.setItem('course', JSON.stringify(course));
                this.authService.updateData(course?.title);
                this.getCurriculumList(id);
                this.setStudentBreadcrumb();
                this.trackCourseOpenIfStudentOrCompany();
              }
            });
          } else if (id) {
            this.courseId = id;
            this.setStudentBreadcrumb();
          }
        })
      );
    }
    // Set role/redirectTo immediately from sessionStorage so template is correct before route data
    this.role = +sessionStorage.getItem('Role');
    if (this.role === Role.Company) {
      this.redirectTo = 'company';
    } else if (this.role === Role.Student) {
      this.redirectTo = 'student';
    }
    this.activatedRoute.data.subscribe(data => {
      if (data?.roles?.[0] != null) {
        this.role = data.roles[0];
        sessionStorage.setItem('Role', String(this.role));
        if (this.role === Role.Company) this.redirectTo = 'company';
        else if (this.role === Role.Student) this.redirectTo = 'student';
      }
      this.setStudentBreadcrumb();
    });
    this.setStudentBreadcrumb();
    // Load curriculum list when we have courseId (from localStorage or will be set from child route above)
    if (this.courseId) {
      this.getCurriculumList(this.courseId);
      this.trackCourseOpenIfStudentOrCompany();
    }
    // Sync selected topic from child route (curriculum-details) so counts update on Next/Previous
    this.syncSelectedCurriculumFromRoute();
    this.subscription.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        this.syncSelectedCurriculumFromRoute();
        // Re-apply breadcrumb (course name + category) when navigating within details so it doesn’t show "Course"
        this.syncCourseFromUrl();
        this.setStudentBreadcrumb();
        if (this.courseId && (this.router.url || '').includes('/details/')) {
          this.getCurriculumList(this.courseId);
        }
      })
    );
  }

  /** Track CourseOpen analytics event once per course when student/company. */
  private trackCourseOpenIfStudentOrCompany(): void {
    if (this.courseOpenTracked || !this.courseId) return;
    const role = +sessionStorage.getItem('Role');
    if (role !== Role.Student && role !== Role.Company) return;
    this.courseOpenTracked = true;
    this.analyticsService.recordEvent('CourseOpen', 'Course', this.courseId, JSON.stringify({ courseId: this.courseId }));
  }

  /** Re-read course from localStorage so breadcrumb has latest (e.g. after refresh). */
  private refreshCourseFromStorage(): void {
    const stored = JSON.parse(localStorage.getItem('course') || 'null');
    if (stored) {
      this.courseDetails = stored;
      if (stored.id) this.courseId = stored.id;
    }
  }

  /** When URL has courseId in path (e.g. curriculum-list/:courseId), load that course so breadcrumb shows correct name. */
  private syncCourseFromUrl(): void {
    const url = this.router.url || '';
    const match = url.match(/\/(curriculum-list|test-list|question-bank)\/([^/?#]+)/);
    const routeCourseId = match ? match[2] : null;
    if (!routeCourseId || routeCourseId === this.courseDetails?.id) return;
    this.courseId = routeCourseId;
    this.appService.getCourseByCourseID(routeCourseId, true).subscribe((course: any) => {
      if (course) {
        this.courseDetails = course;
        localStorage.setItem('course', JSON.stringify(course));
        this.authService.updateData(course?.title);
        this.getCurriculumList(routeCourseId);
        this.setStudentBreadcrumb();
      }
    });
  }

  /** Breadcrumb and topbar for student: My Courses / Category (if any) / Course name [/ Curriculum name when on curriculum-details]. */
  private setStudentBreadcrumb(): void {
    if (this.redirectTo !== 'student') return;
    const title = this.courseDetails?.title;
    this.authService.updateData(title || '');
    const segments: { label: string; url?: string }[] = [
      { label: 'My Courses', url: '/app/student/courses' }
    ];
    if (this.courseDetails?.category?.name) {
      const cat = this.courseDetails.category;
      segments.push({
        label: cat.name,
        url: cat.id ? `/app/student/category-courses/${cat.id}/${encodeURIComponent(cat.name || '')}` : undefined
      });
    }
    segments.push({ label: title || 'Course' });
    // When on curriculum-details (video/lesson page), append current curriculum item name
    const url = this.router.url || '';
    if (url.includes('/curriculum-details/')) {
      let curriculumName = this.selectedCurriculumItem?.title;
      if (!curriculumName) {
        try {
          const stored = JSON.parse(localStorage.getItem('curriculum') || 'null');
          curriculumName = stored?.title || null;
        } catch (_) {}
      }
      if (curriculumName) {
        segments.push({ label: curriculumName });
      }
    }
    this.studentBreadcrumb.setBreadcrumb(segments);
  }

  /** Set selectedCurriculumItem from current URL so "THIS TOPIC" always matches the page. */
  syncSelectedCurriculumFromRoute(): void {
    const url = this.router.url || '';
    const match = url.match(/curriculum-details\/([^/?#]+)/);
    const id = match ? match[1] : null;
    // Only show "THIS TOPIC" when we're on a curriculum-details page; use that curriculum's id.
    if (id && this.curriculumList?.length) {
      const found = this.curriculumList.find((c: any) => c.id === id);
      this.selectedCurriculumItem = found || null;
      return;
    }
    // On curriculum-list or other routes, clear selection so we don't show another topic's counts.
    this.selectedCurriculumItem = null;
  }

  getCurriculumList(courseId) {
    this.subscription.add(this.appService.getCurriculumByCourseId(courseId).subscribe((res: any) => {
      if (res) {
        this.curriculumList = res.curriculumResponseList;
        this.totalTask = res.totalTask ?? 0;
        this.completedTask = res.completedTask ?? 0;
        this.showCurriculum = res.curriculumCount > 0 ? true : false;
        this.showPracticeTest = res.practiceTestCount > 0 ? true : false;
        this.showTest = res.testCount > 0 ? true : false;
        let curriculamRedirectInfo = [];
        for (let i = 0; i < this.curriculumList.length; i++) {
          this.backgroundSelect.push(this.curriculumList[i].isCompleted);
        }
        this.curriculumList.filter(x => !x.isCompleted).forEach(element => {
          curriculamRedirectInfo.push(element);
        });
        if (curriculamRedirectInfo && curriculamRedirectInfo.length > 0) {
          sessionStorage.setItem('nextCurriculam', JSON.stringify(curriculamRedirectInfo));
        }
        localStorage.setItem('curriculams', JSON.stringify(this.curriculumList));
        this.syncSelectedCurriculumFromRoute();
        if (this.showTest && courseId) {
          this.getquestionSetByCourseId(courseId);
        }
      }
    }));
  }

 

  goToCurriculumDetails(item,ix) {
    // debugger
    localStorage.setItem('curriculum', JSON.stringify(item));
    

    
    // setTimeout(() => {
    //   this.router.navigate([`/app/${this.redirectTo}/details/curriculum-details/${item.id}`])
    // }, 100);
    // this.setCourseProgressDetails(item);
  }
  ngDoCheck() {
    // if (this.curriculumList) {
    //   let inCompletedCurriculum = sessionStorage.getItem('nextCurriculam');
    //   if (inCompletedCurriculum) {
    //     let data = inCompletedCurriculum.split(',');
    //     let dd = this.curriculumList.filter(x => !data.includes(x.id));
    //     dd.forEach(element => {
    //       this.curriculumList.find(x => x.id == element.id)['completed'] = true;
    //     })
    //   }
    // }
  }
  itemOptions(item: any): void {
    this.selectedCurriculumItem = item;
    const obj = {
      curriculumQuestionCount: (item.curriculumQuestionCount ?? 0) > 0,
      curriculumStudyMaterialCount: (item.curriculumStudyMaterialCount ?? 0) > 0,
      curriculumTopicCount: (item.curriculumTopicCount ?? 0) > 0,
      curriculumVideoLectureCount: (item.curriculumVideoLectureCount ?? 0) > 0,
      curriculumQuestionTotal: item.curriculumQuestionCount ?? 0,
      curriculumStudyMaterialTotal: item.curriculumStudyMaterialCount ?? 0,
      curriculumVideoLectureTotal: item.curriculumVideoLectureCount ?? 0,
    };
    this.authService.curriculumData.next(obj);
    this.authService.selectedContent.next('');
  }
  getquestionSetByCourseId(courseId) {
    this.subscription.add(this.appService.getQuetionSetCourseId(courseId).subscribe((res: any) => {
      if (res) {
        this.questionsSetList = res;
      }
    }));
  }

  ngOnDestroy(){
    this.courseDetails = {};
    this.authService.selectedContent.next('');
    this.authService.courseStructure.next('');
    this.authService.updateData(this.courseDetails.title);
  }

  getColorChange() {

  }

  /** trackBy for curriculum / question-set lists to avoid re-rendering the whole sidebar on each change-detection pass. */
  trackById(_index: number, item: any): any {
    return item?.id ?? _index;
  }

  /** True when curriculum has questions – user must pass quiz to complete; no manual mark. */
  hasQuestions(item: any): boolean {
    return (item?.curriculumQuestionCount ?? 0) > 0;
  }

  /** True when current route is curriculum-list – used to hide the Course Structure sidebar. */
  get isCurriculumListRoute(): boolean {
    return (this.router.url || '').includes('/curriculum-list/');
  }

  /** True when this topic has at least one content type (concepts, study, videos, questions) – used to show/hide "This topic" block. */
  hasAnyTopicContent(item: any): boolean {
    if (!item) return false;
    return ((item.curriculumStudyMaterialCount ?? 0) > 0) ||
           ((item.curriculumVideoLectureCount ?? 0) > 0) ||
           ((item.curriculumQuestionCount ?? 0) > 0);
  }

  /** Mark a curriculum as complete from the left sidebar. Not allowed for curricula with questions; those complete on quiz pass. */
  markCurriculumComplete(item: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!item?.id || item.isCompleted || !this.courseId || this.hasQuestions(item)) return;
    this.subscription.add(
      this.appService.saveCurriculumWatchProgress({
        curriculumId: item.id,
        secondsWatched: 1,
        videoDurationSeconds: 1
      }).subscribe({
        next: () => {
          item.isCompleted = true;
          this.completedTask = Math.min(this.totalTask, this.completedTask + 1);
          if (this.selectedCurriculumItem?.id === item.id) {
            this.selectedCurriculumItem = { ...this.selectedCurriculumItem, isCompleted: true };
          }
          const curriculams = JSON.parse(localStorage.getItem('curriculams') || '[]');
          const idx = curriculams.findIndex((c: any) => c.id === item.id);
          if (idx !== -1) {
            curriculams[idx] = { ...curriculams[idx], isCompleted: true };
            localStorage.setItem('curriculams', JSON.stringify(curriculams));
          }
        },
        error: () => {}
      })
    );
  }
}
