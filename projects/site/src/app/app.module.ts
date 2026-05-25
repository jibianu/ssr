import { SharedModule } from './shared/shared.module';
import { LayoutsModule } from './layouts/layouts.module';
import { AppRoutingModule } from './app-routing.module';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreModule } from './core/core.module';
import { BrowserModule } from '@angular/platform-browser';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthModule } from './modules/auth/auth.module';
import { AdminappModule } from './modules/adminapp/adminapp.module';
import { RedirectToElearnComponent } from './core/redirect-to-elearn/redirect-to-elearn.component';
import { ElearnLayoutComponent } from './layouts/public/elearn-layout/elearn-layout.component';

@NgModule({
    declarations: [],
    schemas: [
        CUSTOM_ELEMENTS_SCHEMA
    ],
    bootstrap: [],
    
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        AppRoutingModule,
        SharedModule,
        LayoutsModule,
        NgbModule,
        NgxSpinnerModule,
        AuthModule,
        AdminappModule,
        CommonModule,
        ElearnLayoutComponent,
        RedirectToElearnComponent
    ], 
        
        
        providers: [] })
        
export class AppModule { }
