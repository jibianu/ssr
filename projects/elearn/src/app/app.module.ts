import { SharedModule } from './shared/shared.module';
import { LayoutsModule } from './layouts/layouts.module';
import { AppRoutingModule } from './app-routing.module';
import { AuthModule } from './modules/auth/auth.module';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AppComponent } from './app.component';
import { AppEntryRedirectComponent } from './core/components/app-entry-redirect/app-entry-redirect.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreModule } from './core/core.module';
import { BrowserModule } from '@angular/platform-browser';
import { Amplify } from 'aws-amplify';
import { AffiliateService } from './modules/affiliate/affiliate.service';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_5ASzSNFx9',
      userPoolClientId: '628t9sabptobg2ugccvfjv5uc5',
      identityPoolId: undefined
    }
  }
} as any);


@NgModule({
  declarations: [
    AppComponent,
    AppEntryRedirectComponent
  ],
  imports: [
    BrowserModule,
    NgbModule,
    HttpClientModule,
    CommonModule,
    AuthModule,
    AppRoutingModule,
    LayoutsModule,
    BrowserAnimationsModule,
    CoreModule,
    SharedModule
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
  providers: [
    AffiliateService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
