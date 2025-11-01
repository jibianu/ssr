
import { NgbModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToasterComponent } from './component/toaster/toaster.component';
import { FormsModule } from '@angular/forms';
// ✅ Note: Ng2SearchPipeModule removed - import directly in modules that need it (e.g., EventModule)
import { ConfirmationModalComponent } from './component/confirmation-modal/confirmation-modal.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { ReadMoreComponent } from './component/read-more/read-more.component';
import { IconDropdownComponent } from './component/icon-dropdown/icon-dropdown.component';
import { PageNotFoundComponent } from '../modules/publicapp/page-not-found/page-not-found.component';
import { SeoService } from './service/seo.service';
// ✅ PROGRESSIVE LOADING: Skeleton loader components
import { SkeletonCourseCardComponent } from './components/skeleton-loaders/skeleton-course-card/skeleton-course-card.component';
import { SkeletonCourseListComponent } from './components/skeleton-loaders/skeleton-course-list/skeleton-course-list.component';
import { SkeletonEventCardComponent } from './components/skeleton-loaders/skeleton-event-card/skeleton-event-card.component';
import { SkeletonRelatedCourseComponent } from './components/skeleton-loaders/skeleton-related-course/skeleton-related-course.component';

const errorPages = [PageNotFoundComponent];

@NgModule({
    declarations: [
        ToasterComponent, 
        ConfirmationModalComponent, 
        ReadMoreComponent, 
        IconDropdownComponent,
        // ✅ PROGRESSIVE LOADING: Skeleton loader components
        SkeletonCourseCardComponent,
        SkeletonCourseListComponent,
        SkeletonEventCardComponent,
        SkeletonRelatedCourseComponent,
        ...errorPages
    ],
    imports: [
        CommonModule,
        NgbToastModule,
        NgbModule,
        FormsModule,
        // ✅ Note: Ng2SearchPipeModule removed - not compatible with Angular 20 module system
        // Import directly in EventModule where filterBy pipe is used
        NgxPaginationModule,
        NgxSpinnerModule,
        NgMultiSelectDropDownModule,
        CarouselModule,
    ], 
    exports: [
        ToasterComponent,
        ReadMoreComponent,
        FormsModule,
        // ✅ Note: Ng2SearchPipeModule pipes are automatically available when module is imported
        // Pipes from imported modules are automatically available to components in this module
        NgxPaginationModule,
        NgxSpinnerModule,
        NgbModule,
        NgMultiSelectDropDownModule,
        CarouselModule,
        IconDropdownComponent,
        // ✅ PROGRESSIVE LOADING: Export skeleton loaders for use in other modules
        SkeletonCourseCardComponent,
        SkeletonCourseListComponent,
        SkeletonEventCardComponent,
        SkeletonRelatedCourseComponent,
        ...errorPages
    ],
    schemas: [
        CUSTOM_ELEMENTS_SCHEMA
    ],
    providers: [
        NgxSpinnerService,
        SeoService
    ]
})
export class SharedModule { }

