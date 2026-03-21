import { SafeUrlPipe } from './pipes/safeUrl.pipe';
import { FilterByPipe } from './pipes/search-filter.pipe';
import { TruncatePipe } from './pipes/truncate.pipe';
import { FixMojibakePipe } from './pipes/fix-mojibake.pipe';
import { FixMojibakeSafeHtmlPipe } from './pipes/fix-mojibake-safe-html.pipe';
import { UpdatePermissionomponent } from './component/permission/update-permission/update-permission.component';
import { UpdateCourseListComponent } from './component/update-course-list/update-course-list.component';
import { ChatComponent } from './component/chat/chat.component';
import { UserProfileComponent } from './component/user-profile/user-profile.component';
// import { UserRoleDirective } from './directive/user-role.directive';
// import { UserDirective } from './directive/user.directive';
import { ReadMoreComponent } from './component/read-more/read-more.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgbModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe, NgOptimizedImage } from '@angular/common';
import { ToasterComponent } from './component/toaster/toaster.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// Replaced ng2-search-filter with custom FilterByPipe (Ivy-compatible)
// import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { ConfirmationModalComponent } from './component/confirmation-modal/confirmation-modal.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
// TEMPORARILY COMMENTED OUT - View Engine libraries incompatible with Angular Ivy
// TODO: Replace with Ivy-compatible alternatives
// import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
// import { CarouselModule } from 'ngx-owl-carousel-o';

// Wrapper modules (placeholders for now)
import { CarouselWrapperModule } from './wrappers/carousel-wrapper.module';
import { MultiselectWrapperModule } from './wrappers/multiselect-wrapper.module';
import { DropListComponent } from './component/dropdown/drop-list/drop-list.component';
import { StudentDetailsComponent } from '../app/modal/student-details/student-details.component';
import { CheckboxComponent } from './component/checkbox/checkbox.component';
import { StudentCourseListComponent } from './component/course-list/student-course-list/student-course-list.component';
import { SearchCoursesComponent } from './modals/search-courses/search-courses.component';
import { SearchBlogComponent } from './modals/search-blog/search-blog.component';
import { SearchEventComponent } from './modals/search-event/search-event.component';
import { TrainerListFilterComponent } from './modals/trainer-list-filter/trainer-list-filter.component';
import { SkipQuestionComponent } from './modals/skip-question/skip-question.component';
import { RetakeQuestionComponent } from './modals/retake-question/retake-question.component';
import { RouterModule } from '@angular/router';
import { UserInfoComponent } from './component/user-info/user-info.component';
import { UserManagemntMappingComponent } from './component/user-managemnt-mapping/user-managemnt-mapping.component';
import { RemoveFromManagementComponent } from './component/remove-from-management/remove-from-management.component';
import { InviteUserComponent } from './component/invite-user/invite-user.component';
import { ImageCropperModule } from 'ngx-image-cropper';
import { ChangeProgressComponent } from './modals/change-progress/change-progress.component';
import { PublishCourseModalComponent } from './modals/publish-course/publish-course-modal.component';
import { UnauthorizedComponent } from './component/unauthorized/unauthorized.component';
import { CommonPageTopbarComponent } from './component/common-page-topbar/common-page-topbar.component';
import { CommonSidebarComponent } from './component/common-sidebar/common-sidebar.component';
import { CommonPaginationComponent } from './component/common-pagination/common-pagination.component';

@NgModule({
    declarations: [ToasterComponent, ConfirmationModalComponent, ReadMoreComponent, UserProfileComponent, CommonPageTopbarComponent, CommonSidebarComponent, ChatComponent, DropListComponent, StudentDetailsComponent, CheckboxComponent, UpdatePermissionomponent, UpdateCourseListComponent, StudentCourseListComponent, SearchCoursesComponent, SearchBlogComponent, SearchEventComponent, TrainerListFilterComponent, SkipQuestionComponent, RetakeQuestionComponent,
        UnauthorizedComponent,
        SafeUrlPipe,
        FilterByPipe,
        TruncatePipe,
        FixMojibakePipe,
        FixMojibakeSafeHtmlPipe,
        UserInfoComponent,
        UserManagemntMappingComponent,
        RemoveFromManagementComponent,
        InviteUserComponent,
        ChangeProgressComponent,
        PublishCourseModalComponent],
    imports: [
        CommonModule,
        NgOptimizedImage,
        NgbToastModule,
        NgbModule,
        FormsModule,
        CommonPaginationComponent,
        // Ng2SearchPipeModule, // Replaced with FilterByPipe
        NgxPaginationModule,
        NgxSpinnerModule,
        DragDropModule,
        // NgMultiSelectDropDownModule, // TEMPORARILY DISABLED - View Engine incompatible
        MultiselectWrapperModule, // Placeholder wrapper
        // CarouselModule, // TEMPORARILY DISABLED - View Engine incompatible
        CarouselWrapperModule, // Placeholder wrapper
        ReactiveFormsModule,
        RouterModule,
        // UserDirective,
        // UserRoleDirective
        ImageCropperModule
    ], exports: [
        ToasterComponent,
        ReadMoreComponent,
        FormsModule,
        ReactiveFormsModule,
        // Ng2SearchPipeModule, // Replaced with FilterByPipe
        NgxPaginationModule,
        NgxSpinnerModule,
        DragDropModule,
        NgbModule,
        // NgMultiSelectDropDownModule, // TEMPORARILY DISABLED - View Engine incompatible
        MultiselectWrapperModule, // Placeholder wrapper
        // CarouselModule, // TEMPORARILY DISABLED - View Engine incompatible
        CarouselWrapperModule, // Placeholder wrapper
        UserProfileComponent,
        CommonPageTopbarComponent,
        CommonSidebarComponent,
        CommonPaginationComponent,
        ChatComponent,
        DropListComponent,
        StudentDetailsComponent,
        CheckboxComponent,
        UpdatePermissionomponent,
        UpdateCourseListComponent,
        StudentCourseListComponent,
        UserInfoComponent,
        UserManagemntMappingComponent,
        // UserDirective,
        // UserRoleDirective
        SafeUrlPipe,
        FilterByPipe,
        TruncatePipe,
        FixMojibakePipe,
        FixMojibakeSafeHtmlPipe,
        NgOptimizedImage,
        InviteUserComponent,
        UnauthorizedComponent
    ],
    schemas: [
        CUSTOM_ELEMENTS_SCHEMA
    ],
    providers: [
        NgxSpinnerService,
        DatePipe
    ]
})
export class SharedModule { }
