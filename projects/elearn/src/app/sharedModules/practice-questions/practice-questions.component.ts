import { filter } from 'rxjs/operators';
import { CurriculamStatus, QuestionType, Role } from 'src/app/shared/models/role';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef, Component, NgZone, OnInit, OnDestroy, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SkipQuestionComponent } from 'src/app/shared/modals/skip-question/skip-question.component';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { Router } from '@angular/router';
import * as $ from 'jquery'
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { PlayerStateService } from 'src/app/core/services/player-state.service';
import { PracticeQuestionsDrawerService } from 'src/app/core/services/practice-questions-drawer.service';

@Component({
    selector: 'app-practice-questions',
    templateUrl: './practice-questions.component.html',
    styleUrls: ['./practice-questions.component.scss'],
    standalone: false
})
export class PracticeQuestionsComponent implements OnInit, OnDestroy {
  

  isActive: boolean = false;

  

  toggleClass() {
    this.isActive = !this.isActive;
  }


  difficultyId: string;
  /** null = not yet loaded, [] = loaded but empty, [...] = loaded with data */
  questions: any[] | null = null;
  allQuestions = []
  /** Set true when curriculum/exam questions API has completed (success or error). */
  questionsLoaded = false;
  /** Set when getQuestionsByCurriculumId or similar fails. */
  questionsError: string | null = null;
  selectedQuestion: any = {};
  HighlightRow: number = 0;
  yourAnswer = null;
  rightAnswer = null;
  selectedAnswer = null;
  isSubmit = false;
  subscription: Subscription = new Subscription();
  questionType: any;
  Id: any;
  interval: ReturnType<typeof setInterval>;
  timeLeft: number;
  /** Fine-grained: template binds to remaningTime(); no markForCheck needed. */
  remaningTime = signal<string>('');
  IsExamRole: any;
  selectedOption: any;
  questionCount: number;
  maxAttemptsAllowed: number
  durationInMinute: number;
  totalAttemptCount: number;
  forceClose: boolean = false;
  timeOut: any;
  examTest: boolean;
  bwidth: any;
  /** Title shown in the quiz top bar (left side) – from course or test name */
  pageTitle: string = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private authService: AuthenticationService,
    private appService: AdminAppService,
    private location: Location,
    private modalService: NgbModal,
    private router: Router,
    private ngZone: NgZone,
    private studentBreadcrumb: StudentBreadcrumbService,
    private cdr: ChangeDetectorRef,
    private playerState: PlayerStateService,
    public practiceQuestionsDrawer: PracticeQuestionsDrawerService
  ) {}

  // @HostListener('window:beforeunload',['$event']) unloadHandler(event: Event) {
  //   // if(this.examTest){
  //     sessionStorage.removeItem("testID")
  //   // }
  //   // console.log("Processing beforeunload...");
  //   // debugger
  //   // this.ConformAlert();
  // }
  // ConformAlert(){
  //   alert("hello")
  // }
  ngOnInit(): void {
    // Ensure topbar and bottom nav show on quiz page (they are hidden in video focus mode)
    this.playerState.exitFocusMode();

    var courseDetails = JSON.parse(localStorage.getItem('course') || 'null');
    if (courseDetails?.title) {
      this.pageTitle = courseDetails.title;
      this.authService.updateData(courseDetails.title);
    }
    this.setBreadcrumbAndTopbarTitle();
    this.activatedRoute
      .params
      .subscribe(params => {
        this.questions = null;
        this.questionsLoaded = false;
        this.questionsError = null;
        var isLocal = null;
        if (params.difficultyId) {
          this.difficultyId = params.difficultyId;
        }
        if (params.questionType != null && params.questionType !== '') {
          this.questionType = String(params.questionType);
        }
        if (this.questionType == QuestionType.ExamQA) {
          isLocal = this.getQuestionsInfoLocal();
        }
        if (params.Id != null && params.Id !== '') {
          this.Id = params.Id;
          if (this.questionType == QuestionType.ExamQA && !isLocal) {
            this.getQuestionSetDetails(this.Id);
          }
        }
        if (this.difficultyId === '0' && this.questionType === QuestionType.PracticeQA) {
          this.getAllQuestionsByCourseId(this.Id);
        } else if (this.difficultyId === '1') {
          this.questionsLoaded = true;
          this.questions = [];
          this.cdr.markForCheck();
        } else if (this.questionType == QuestionType.ExamQA) {
          if (!isLocal) {
            this.getQuestionsByQuestionSetId(this.Id);
          } else {
            this.questionsLoaded = true;
            this.cdr.markForCheck();
          }
        } else if (this.questionType == QuestionType.CurriculumQA && this.Id) {
          this.getQuestionsByCurriculumId(this.Id);
        } else {
          this.questionsLoaded = true;
          this.questions = [];
          this.questionsError = this.Id ? null : 'Invalid or missing curriculum.';
          this.cdr.markForCheck();
        }
      });
    this.activatedRoute.data.subscribe(data => {
      this.IsExamRole = data.IsExamRole;
    });

    $("p").each(function () {
      var $el = $(this);
      if ($.trim($el.html()) == "&nbsp;") {
        $el.remove();
      }
    });

  }

  getAllQuestionsByCourseId(id) {
    this.subscription.add(this.appService.getAllQuestionsByCourseId(id).subscribe((res: any) => {
      this.questionsLoaded = true;
      if (res) {
        this.questions = res;
        if (this.questions.length > 0) this.ClickedRow(0);
      } else {
        this.questions = [];
      }
    }));
  }
  // startTest(id) {
  //   let obj = {
  //     courseId: sessionStorage.getItem('courseProgressID'),
  //     questionSetId: this.Id,
  //     entityType: CurriculamStatus.QuestionSets,
  //     entityId: ''
  //   }
  //   this.subscription.add(this.appService.startTest(obj).subscribe((res: any) => {
  //     if (res) {
  //       console.log(res);
  //     }
  //   }));
  // }
  replacedVal: any;
  replacedVal1: any;
  replacedVal2: any;
  replacedVal3: any;
  nullPrev = 1;
  bgColorPrev = 'white';

  arr: any = [];
  /** Select question, update main content, then close the mobile right drawer (same as curriculum sidebar). */
  selectQuestionAndCloseDrawer(index: number): void {
    this.ClickedRow(index);
    this.cdr.detectChanges();
    // Close drawer after main content has updated so user sees the selected question (curriculum-style)
    setTimeout(() => {
      this.practiceQuestionsDrawer.close();
      this.cdr.detectChanges();
    }, 0);
  }

  ClickedRow(index: number) {
    if (!this.questions || index < 0 || index >= this.questions.length) {
      this.selectedQuestion = {};
      this.arr = [];
      this.cdr.markForCheck();
      return;
    }
    this.HighlightRow = index;
    const raw = this.questions[index];
    this.selectedQuestion = this.normalizeQuestion(raw);
    this.rightAnswer = null;
    this.yourAnswer = null;
    this.selectedAnswer = null;
    this.isSubmit = false;

    this.arr = [];
    const options = this.selectedQuestion.options || [];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const text = (opt?.description ?? opt?.Description ?? opt?.title ?? opt?.text ?? '');
      const stripped = typeof text === 'string' ? text.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, '') : '';
      this.arr.push(stripped);
    }
    this.cdr.markForCheck();
  }

  /** Normalize API question to { title, options, description } so template always has the right shape. */
  private normalizeQuestion(q: any): any {
    if (!q) return {};
    const options = q.options ?? q.Options ?? q.questionOptions ?? [];
    const title = q.title ?? q.Title ?? q.questionTitle ?? q.questionText ?? q.name ?? q.text ?? '';
    return {
      ...q,
      id: q.id ?? q.Id,
      title: typeof title === 'string' ? title : '',
      description: q.description ?? q.Description ?? q.solution ?? '',
      options: Array.isArray(options) ? options.map((o: any) => ({
        ...o,
        id: o.id ?? o.Id,
        description: o.description ?? o.Description ?? o.title ?? o.Title ?? o.optionText ?? '',
        isCorrect: o.isCorrect ?? o.isCorrectAnswer,
        extraInformation: o.extraInformation ?? o.ExtraInformation
      })) : []
    };
  }


  selectOption(j) {
    if (j == this.selectedAnswer) {
      this.selectedAnswer = null;
    } else {
      this.selectedAnswer = j;
    }
    if (this.selectedQuestion.options[j].isCorrect == true) {
      this.questions.find(x => x.id == this.selectedQuestion.id)["isCorrectAnswer"] = true;
    } else {
      this.questions.find(x => x.id == this.selectedQuestion.id)["isCorrectAnswer"] = false;
    }
    this.selectedOption = this.selectedQuestion.options[j];
  }

  submit() {
    // debugger
    this.isSubmit = true;
    let selectedQuestionID = this.selectedQuestion.id;
    this.saveTestsDetail(selectedQuestionID, this.selectedOption.id);
    // this.arr=[];
  }
  saveTestsDetail(questionID, optionID) {
    let testID = sessionStorage.getItem('testID');
    let obj = {
      testId: testID,
      questionId: questionID,
      optionId: optionID
    }
    this.subscription.add(this.appService.saveTestsDetail(obj).subscribe((res: any) => {
      if (res) {
        // debugger
        // console.log(res);

        if (this.examTest) {
          // debugger
          this.submitQuestion(this.HighlightRow)
        } else {
          this.selectedOption['isCorrect'] = res.isCorrect;
        }
      }
    }));
  }
  skip(index) {
    this.arr = [];
    this.next(index);
    this.nullPrev += 1;
    this.bgColorPrev = '#e1e1e1';

  }

  submitQuestion(index) {
    this.questions[index]['isSubmit'] = true;
    this.arr = [];
    this.next(index);
  }

  next(index) {
    // debugger
    if (index + 1 >= this.questions.length) {
      let skipedQuestionCount = this.questions.filter(x => !x.isSubmit);
      if (this.IsExamRole) {
        this.submitTests();
        this.router.navigate(['/app/student/details/exam-result', this.Id]);
      }
      else if (skipedQuestionCount.length > 0) {
        // alert("skipped value " + skipedQuestionCount.length);
        const modalRef = this.modalService.open(SkipQuestionComponent);
        modalRef.componentInstance.noOfSkipQuestion = skipedQuestionCount.length;
        modalRef.result.then((result) => {
          if (result === 'ok') {
            let index = this.questions.indexOf(this.questions.find(x => !x.isSubmit));
            this.ClickedRow(index);
          }
        })
      } else {
        let correctAnswerCount = this.questions.filter(x => x.isCorrectAnswer)?.length;
        let totalQuestionCount = this.questions.length;
        let percent = (correctAnswerCount * 100) / totalQuestionCount;
        if (percent >= 90) {
          let nextCurriculamInfo = sessionStorage.getItem('nextCurriculam');
          let nextCurriculamList = JSON.parse(nextCurriculamInfo);
          nextCurriculamList = nextCurriculamList ? nextCurriculamList.filter(x => x.id != this.Id) : nextCurriculamList;
          if (nextCurriculamList && nextCurriculamList.length > 0) {
            Swal.fire({
              icon: 'success',
              title: 'Completed',
              html: 'You have completed this chapter' +
                '<br/>' +
                '<br/>' +
                'Next Chapter' +
                '<br/>' +
                '<br/>' +
                '<h3>' + nextCurriculamList[0].title + '</h3>',
              showConfirmButton: true,
              confirmButtonText: 'PROCEED',
            }).then((result) => {
              // debugger
              if (result.isConfirmed) {
                this.submitTests();
                sessionStorage.setItem('nextCurriculam', JSON.stringify(nextCurriculamList));
                localStorage.setItem('curriculum', JSON.stringify(nextCurriculamList[0]));
                this.router.navigate(['/app/student/details/curriculum-details', nextCurriculamList[0].id]);
              }
            });
          } else {
            Swal.fire({
              icon: 'success',
              title: 'Completed',
              html: 'You have completed this chapter',
              showConfirmButton: true,
              confirmButtonText: 'PROCEED',
            }).then((result) => {
              // debugger
              if (result.isConfirmed) {
                this.submitTests();
                // this.router.navigate(['/app/student/details/curriculum-details', nextCurriculamList[0].id]);
                this.location.back();
              }
            });
          }

        } else {
          let totalAnswerToPass = Math.round((90 * totalQuestionCount) / 100);
          Swal.fire({
            icon: 'error',
            title: 'In-Completed',
            html: 'Your score <br/>' +
              '<b>' + correctAnswerCount + '/' + totalQuestionCount + '</b><br/>' +
              'Minimum score required <br/>' +
              '<b>' + totalAnswerToPass + '/' + totalQuestionCount + '</b>',
            showConfirmButton: true,
            confirmButtonText: 'PROCEED',
          }).then((result) => {
            if (result.isConfirmed) {
              let index = this.questions.indexOf(this.questions.find(x => !x.isCorrectAnswer));
              this.ClickedRow(index);
            }
          });
        }
      }
      return;
    }
    else {
      // let i = this.questions.indexOf(this.questions.find(x => !x.isSubmit));
      let i = index + 1;
      let data = this.questions[i].isSubmit && this.questions[i].isCorrectAnswer;
      if (data) {
        this.next(index + 1);
        return;
      }
      this.ClickedRow(i);
    }
    this.saveQuestionsInfoLocal();
  }

  previous(index) {

    if (index - 1 < 0) {
      return;
    }
    let i = index - 1;
    this.arr = [];
    this.ClickedRow(i);
  }

  goToCurriculumDetails() {

  }

  ngOnDestroy() {
    this.practiceQuestionsDrawer.close();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    clearTimeout(this.timeOut);
  }
  getQuestionsByQuestionSetId(id) {
    this.subscription.add(this.appService.getQuestionByquestionSetId(id).subscribe((res: any) => {
      this.questionsLoaded = true;
      if (res) {
        this.questions = res;
        if (this.questions && this.questions.length > 0) {
          this.ClickedRow(0);
          this.getRandomQuestions(id);
        }
      } else {
        this.questions = [];
      }
    }));
  }

  getRandomQuestions(id) {
    this.examTest = true;
    this.updatePageTitleFromTestInfo();
    this.subscription.add(this.appService.getTestsResult(id).subscribe(res1 => {
      let questionSetDetails = JSON.parse(localStorage.getItem('TestInfo'));
      let questionCount = questionSetDetails.questionSetTestInformation.questionCount;
      this.maxAttemptsAllowed = questionSetDetails.questionSetTestInformation.maxAttemptsAllowed;
      this.totalAttemptCount = res1.userTestResponse.length;
      if (this.totalAttemptCount >= this.maxAttemptsAllowed) {
        this.forceClose = true;
        alert("Your maximum attempt exceeded.");
        this.router.navigate(['/app/student/details/exam-result', id])
      }
      if (questionCount) {

        this.questions = this.questions.sort(() => Math.random() - 0.5).slice(0, questionCount)
        this.ClickedRow(0);
        this.saveQuestionsInfoLocal();
      }

    }))

  }
  saveQuestionsInfoLocal() {
    var data = {};
    data["q"] = this.questions;
    data["h"] = this.HighlightRow;
    data["a"] = this.totalAttemptCount
    data["tr"] = this.remaningTime();
    data["tl"] = this.timeLeft;
    var sq = JSON.stringify(data);
    localStorage.setItem("sq", sq);
  }
  getQuestionsInfoLocal() {
    if (localStorage.getItem("sq")) {
      var sq = localStorage.getItem("sq");
      var data = JSON.parse(sq);
      this.questionsLoaded = true;
      this.questions = data["q"];
      this.HighlightRow = data["h"];
      this.totalAttemptCount = data["a"]
      this.remaningTime.set(data["tr"] ?? '');
      this.timeLeft = data["tl"];
      this.timeLeft = Number(localStorage.getItem("rt"))
      this.examTest = true;
      this.updatePageTitleFromTestInfo();
      let questionSetDetails = JSON.parse(localStorage.getItem('TestInfo'));
      let questionCount = questionSetDetails.questionSetTestInformation.questionCount;
      this.maxAttemptsAllowed = questionSetDetails.questionSetTestInformation.maxAttemptsAllowed;
      clearTimeout(this.timeOut);
      this.setDuration();
      this.timeOut = setTimeout(this.timeComplete.bind(this), this.timeLeft * 1000);
      this.ClickedRow(this.HighlightRow)
      return true;
    }
    return false;
  }
  /** Normalize API response to question array (handles res, res.data, res.data.items, res.result). */
  private normalizeQuestionsResponse(res: any): any[] {
    if (res == null) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data != null && Array.isArray(res.data.items)) return res.data.items;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.result)) return res.result;
    return [];
  }

  getQuestionsByCurriculumId(id) {
    if (!id) {
      this.questionsLoaded = true;
      this.questions = [];
      this.questionsError = 'Invalid curriculum.';
      this.cdr.markForCheck();
      return;
    }
    this.questionsLoaded = false;
    this.questionsError = null;
    this.questions = null;
    this.cdr.markForCheck();
    this.subscription.add(this.appService.getQuestionsByCurriculumId(id).subscribe({
      next: (res: any) => {
        const list = this.normalizeQuestionsResponse(res);
        this.questions = list;
        this.questionsLoaded = true;
        this.questionsError = null;
        if (this.questions.length > 0) {
          this.ClickedRow(0);
          this.cdr.markForCheck();
          setTimeout(() => this.cdr.markForCheck(), 0);
        } else {
          this.selectedQuestion = {};
          this.arr = [];
          this.cdr.markForCheck();
        }
      },
      error: (err: any) => {
        this.questionsLoaded = true;
        this.questions = [];
        const status = err?.status;
        if (status === 404) {
          this.questionsError = 'Questions not found for this topic.';
        } else if (status === 401 || status === 403) {
          this.questionsError = 'Please sign in again to load questions.';
        } else if (status && status >= 500) {
          this.questionsError = 'Server error. Please try again later.';
        } else {
          this.questionsError = 'Unable to load questions. Please check your connection and try again.';
        }
        this.cdr.markForCheck();
        setTimeout(() => this.cdr.markForCheck(), 0);
      }
    }));
  }
  cancelTest() {
    this.location.back()
  }

  setDuration() {
    this.ngZone.runOutsideAngular(() => {
      this.interval = setInterval(() => {
        if (this.timeLeft > 0) {
          const next = this.secondsToHms(this.timeLeft--);
          this.ngZone.run(() => this.remaningTime.set(next));
          if (next) {
            this.bwidth = "600px";
          }
        }
      }, 1000);
    });
  }

  timeComplete() {
    this.submitTests();
    // history.pushState(null, null, location.href);
    this.forceClose = true;
    alert("Your time is exceeded");
    this.router.navigate(['/app/student/details/exam-result', this.Id]);
  }

  getQuestionSetDetails(id) {
    this.subscription.add(this.appService.getQuestionsetById(id).subscribe((res: any) => {
      if (res) {
        // this.questionSetDetails = res;
        this.timeLeft = res.questionSetTestInformation.durationInMinute * 60;
        this.remaningTime.set(this.secondsToHms(this.timeLeft));
        this.setDuration();
        this.timeOut = setTimeout(this.timeComplete.bind(this), this.timeLeft * 1000);
        
      }
    }));
    
  }
  secondsToHms(d) {
    localStorage.setItem("rt", d)
    d = Number(d);
    var hou = Math.floor(d / 3600);
    var min = Math.floor(d % 3600 / 60);
    var sec = Math.floor(d % 3600 % 60);
    let hour = (hou.toString().length > 1) ? hou : '0' + hou;
    let minute = (min.toString().length > 1) ? min : '0' + min;
    let second = (sec.toString().length > 1) ? sec : '0' + sec;
    return hour + ':' + minute + ':' + second;
  }
  private updatePageTitleFromTestInfo(): void {
    try {
      const testInfo = JSON.parse(localStorage.getItem('TestInfo') || 'null');
      if (testInfo?.questionSetTestInformation?.topics) {
        this.pageTitle = testInfo.questionSetTestInformation.topics;
      } else if (testInfo?.title) {
        this.pageTitle = testInfo.title;
      }
      this.authService.updateData(this.pageTitle || '');
      this.setBreadcrumbAndTopbarTitle();
    } catch (_) {}
  }

  /** Update layout topbar title and breadcrumb so they show on the question page */
  private setBreadcrumbAndTopbarTitle(): void {
    this.authService.updateData(this.pageTitle || 'Questions');
    this.studentBreadcrumb.setBreadcrumb([
      { label: 'My Courses', url: '/app/student/courses' },
      { label: this.pageTitle || 'Questions' }
    ]);
  }

  submitTests() {
    clearTimeout(this.timeOut);
    let testID = sessionStorage.getItem('testID');
    let obj = {
      testId: testID
    }
    this.subscription.add(this.appService.submitTests(obj).subscribe((res: any) => {
      if (res) {
        console.log(res);
      }
    }));
  }
}

