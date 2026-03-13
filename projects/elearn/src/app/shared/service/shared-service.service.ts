import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  constructor() { }

  category = new Subject<string>();
  categoryName = new Subject<string>();
  certificateName = new Subject<string>();
  /** Show USER MAPPING button in top-bar (set true by list pages with permission). */
  showUserMappingButton = new BehaviorSubject<boolean>(false);
  /** Emit when USER MAPPING button in top-bar is clicked (list page handles opening modal). */
  userMappingClick$ = new Subject<void>();
  /** Show ADD CATEGORY button in top-bar (set true by Category List page). */
  showAddCategoryButton = new BehaviorSubject<boolean>(false);
  /** Emit when ADD CATEGORY button in top-bar is clicked (Category List handles navigation). */
  addCategoryClick$ = new Subject<void>();
  /** Show Course List toolbar (search + Filter + Add Course) in top-bar (set true by Course List when !isManagementContext). */
  showCourseListToolbar = new BehaviorSubject<boolean>(false);
  /** Search term for course list (sync between topbar input and course list). */
  courseListSearchTerm$ = new BehaviorSubject<string>('');
  /** Emit when Search is triggered in top-bar (Course List runs search/fetch). */
  courseListSearchTrigger$ = new Subject<void>();
  /** Emit when Filter button in top-bar is clicked (Course List opens search filter modal). */
  courseListFilterClick$ = new Subject<void>();
  /** Emit when Add Course button in top-bar is clicked (Course List opens add course modal). */
  courseListAddCourseClick$ = new Subject<void>();
  /** Show Trainer Dashboard toolbar (Add Course button) in top-bar (set by Trainer Dashboard page). */
  showTrainerDashboardToolbar = new BehaviorSubject<boolean>(false);
  /** Emit when Add Course button in top-bar is clicked on Instructor Dashboard (opens create course modal). */
  trainerAddCourseClick$ = new Subject<void>();
  /** Show Curriculum toolbar (search + Check Course UI + Add Curriculum) in top-bar (set by Curriculum List page). */
  showCurriculumToolbar = new BehaviorSubject<boolean>(false);
  /** Show curriculum edit actions (Edit course, Edit price, Add Curriculum) in top-bar; set false by Trainer Course Details when user has view-only. */
  showCurriculumEditActions = new BehaviorSubject<boolean>(true);
  /** Search term for curriculum list (sync between topbar input and curriculum list). */
  curriculumSearchTerm$ = new BehaviorSubject<string>('');
  /** Emit when Check Course UI button in top-bar is clicked (Curriculum List opens check course modal). */
  curriculumCheckCourseClick$ = new Subject<void>();
  /** Emit when Add Curriculum button in top-bar is clicked (Curriculum List opens add curriculum modal). */
  curriculumAddCurriculumClick$ = new Subject<void>();
  /** Emit when Edit course button in top-bar is clicked (Curriculum List opens course edit modal). */
  curriculumEditCourseClick$ = new Subject<void>();
  /** Emit when Edit price button in top-bar is clicked (Curriculum List opens price edit modal). */
  curriculumEditPriceClick$ = new Subject<void>();
  /** Active curriculum page tab: 'concepts' | 'questionset' | 'question' | 'prices' (sync between topbar and curriculum list). */
  curriculumActiveTab$ = new BehaviorSubject<string>('concepts');
  /** Show student course search in topbar (set true by Student layout). */
  showStudentCourseSearch = new BehaviorSubject<boolean>(false);
  /** Optional primary action in topbar (e.g. Event List sets { routerLink, label, icon } for "Add Event"). Set null when leaving the page. */
  topbarPrimaryAction = new BehaviorSubject<{ routerLink: string; label: string; icon?: string } | null>(null);
  /** Emit when profile image changes so sidebar/topbar can update. */
  profileImageUrl$ = new Subject<string | null>();

  emitProfileImageUrl(url: string | null): void {
    this.profileImageUrl$.next(url);
  }
}
