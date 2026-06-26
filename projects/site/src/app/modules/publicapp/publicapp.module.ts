import { SharedModule } from 'src/app/shared/shared.module';
import { FixMojibakeSafeHtmlPipe } from 'src/app/shared/pipes/fix-mojibake-safe-html.pipe';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, DecimalPipe, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicappRoutingModule } from './publicapp-routing.module';
import { HomeComponent } from './home/home.component';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { RedirectToElearnComponent } from '../../core/redirect-to-elearn/redirect-to-elearn.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { PaymentSuccessComponent } from './payment-success/payment-success.component';

@NgModule({
  declarations: [
    HomeComponent,
    CheckoutComponent,
    PaymentSuccessComponent,
  ],
  imports: [
    CommonModule,
    DecimalPipe,
    RouterLink,
    NgOptimizedImage,
    PublicappRoutingModule,
    SharedModule,
    RedirectToElearnComponent,
    FixMojibakeSafeHtmlPipe,
  ],
  providers: [provideHttpClient(withFetch())],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PublicappModule { }
