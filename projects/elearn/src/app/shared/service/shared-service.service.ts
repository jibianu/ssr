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
  /** Show Blog List toolbar (Filter button) in top-bar (set true by Blog List). */
  showBlogListToolbar = new BehaviorSubject<boolean>(false);
  /** Emit when Filter button in top-bar is clicked (Blog List opens search filter modal). */
  blogListFilterClick$ = new Subject<void>();
  /** Show Event List toolbar (Filter button) in top-bar (set true by Event List). */
  showEventListToolbar = new BehaviorSubject<boolean>(false);
  /** Emit when Filter button in top-bar is clicked (Event List opens search filter modal). */
  eventListFilterClick$ = new Subject<void>();
  /** Show Trainer Dashboard toolbar (Add Course button) in top-bar (set by Trainer Dashboard page). */
  showTrainerDashboardToolbar = new BehaviorSubject<boolean>(false);
  /** Emit when Add Course button in top-bar is clicked on Instructor Dashboard (opens create course modal). */
  trainerAddCourseClick$ = new Subject<void>();
  /** Show Trainer List toolbar (search + Filter) in top-bar (set true by Trainer List when !isManagementContext). */
  showTrainerListToolbar = new BehaviorSubject<boolean>(false);
  /** Search term for trainer list (sync between topbar input and trainer list). */
  trainerListSearchTerm$ = new BehaviorSubject<string>('');
  /** Emit when Search is triggered in top-bar (Trainer List runs search/fetch). */
  trainerListSearchTrigger$ = new Subject<void>();
  /** Emit when Filter button in top-bar is clicked (Trainer List opens filter modal). */
  trainerListFilterClick$ = new Subject<void>();
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
  /** When set (trainer course details), show Submit for Review in topbar. Value: { courseId, status }. Button shown when status is Draft (0) or Rejected (3). */
  curriculumCourseReviewContext = new BehaviorSubject<{ courseId: string; status: number } | null>(null);
  /** Emit when Submit for Review button in top-bar is clicked (Trainer Course Details calls API). */
  curriculumSubmitForReviewClick$ = new Subject<void>();
  /** Emit when Review button in top-bar is clicked – opens review sidebar (Trainer Course Details opens panel with Submit + history). */
  curriculumReviewPanelClick$ = new Subject<void>();
  /** Emit when Landing page button in top-bar is clicked – opens Edit landing page sidebar (Curriculum List). */
  curriculumLandingPanelClick$ = new Subject<void>();
  /** Blog review: when set (blog add-edit with blog loaded), show Review button in topbar; value = { blogId, status }. */
  blogReviewContext = new BehaviorSubject<{ blogId: string; status: number } | null>(null);
  /** Emit when Review button is clicked for blog – opens blog review sidebar. */
  blogReviewPanelClick$ = new Subject<void>();
  /** Emit when Submit for Review button in topbar is clicked (Blog add-edit calls submit API). */
  blogSubmitForReviewClick$ = new Subject<void>();
  /** Event review: when set (event edit with event loaded), show Review button in topbar; value = { eventId, status }. */
  eventReviewContext = new BehaviorSubject<{ eventId: string; status: number } | null>(null);
  /** Emit when Review button is clicked for event – opens event review sidebar. */
  eventReviewPanelClick$ = new Subject<void>();
  /** Active curriculum page tab: 'concepts' | 'questionset' | 'question' | 'prices' (sync between topbar and curriculum list). */
  curriculumActiveTab$ = new BehaviorSubject<string>('concepts');
  /** Show student course search in topbar (set true by Student layout). */
  showStudentCourseSearch = new BehaviorSubject<boolean>(false);
  /** Optional primary action in topbar (e.g. Event List sets { routerLink, label, icon } for "Add Event"). contentType used by trainer to show Add vs Request Permission. */
  topbarPrimaryAction = new BehaviorSubject<{ routerLink: string; label: string; icon?: string; contentType?: 'Course' | 'Blog' | 'Event' } | null>(null);
  /** When set, show Approve and Reject in topbar (blog edit page sets this when admin views a PendingReview blog). */
  topbarBlogReviewActions = new BehaviorSubject<{ blogId: string } | null>(null);
  /** Emit when Approve is clicked in topbar (blog edit page handles). */
  blogReviewApproveClick$ = new Subject<void>();
  /** Emit when Reject is clicked in topbar (blog edit page opens modal and handles). */
  blogReviewRejectClick$ = new Subject<void>();
  /** Blog edit (topbar) actions: publish/unpublish/delete (blog add-edit handles API). */
  blogTopbarPublishClick$ = new Subject<void>();
  blogTopbarUnpublishClick$ = new Subject<void>();
  blogTopbarDeleteClick$ = new Subject<void>();
  /** Disable blog topbar actions while API is in progress. */
  blogTopbarBusy$ = new BehaviorSubject<boolean>(false);
  /** Emit when Approve is clicked in topbar (course edit page – curriculum list handles). */
  courseReviewApproveClick$ = new Subject<void>();
  /** Emit when Reject is clicked in topbar (course edit page opens reject modal and handles). */
  courseReviewRejectClick$ = new Subject<void>();
  /** Emit when profile image changes so sidebar/topbar can update. */
  profileImageUrl$ = new Subject<string | null>();

  /** Show "Allow course" button in topbar (Admin Affiliates page). */
  showAffiliateAllowCoursesButton = new BehaviorSubject<boolean>(false);
  /** Emit when "Allow course" button is clicked in topbar (Admin Affiliates page handles). */
  affiliateAllowCoursesClick$ = new Subject<void>();

  emitProfileImageUrl(url: string | null): void {
    this.profileImageUrl$.next(url);
  }
}
