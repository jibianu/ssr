
import { NgbModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToasterComponent } from './component/toaster/toaster.component';
import { FormsModule } from '@angular/forms';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { ConfirmationModalComponent } from './component/confirmation-modal/confirmation-modal.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { ReadMoreComponent } from './component/read-more/read-more.component';
import { IconDropdownComponent } from './component/icon-dropdown/icon-dropdown.component';
import { PageNotFoundComponent } from '../modules/publicapp/page-not-found/page-not-found.component';

const errorPages = [PageNotFoundComponent];

@NgModule({
    declarations: [
        ToasterComponent, 
        ConfirmationModalComponent, 
        ReadMoreComponent, 
        IconDropdownComponent, 
        ...errorPages
    ],
    imports: [
        CommonModule,
        NgbToastModule,
        NgbModule,
        FormsModule,
     
        NgxPaginationModule,
        NgxSpinnerModule,
        NgMultiSelectDropDownModule,
        CarouselModule,
    ], 
    exports: [
        ToasterComponent,
        ReadMoreComponent,
        FormsModule,
      
        NgxPaginationModule,
        NgxSpinnerModule,
        NgbModule,
        NgMultiSelectDropDownModule,
        CarouselModule,
        IconDropdownComponent,
        ...errorPages
    ],
    schemas: [
        CUSTOM_ELEMENTS_SCHEMA
    ],
    providers: [
        NgxSpinnerService
    ]
})
export class SharedModule { }

