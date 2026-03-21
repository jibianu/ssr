import { SharedModule } from 'src/app/shared/shared.module';
import { FixMojibakeSafeHtmlPipe } from 'src/app/shared/pipes/fix-mojibake-safe-html.pipe';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicappRoutingModule } from './publicapp-routing.module';
import { HomeComponent } from './home/home.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { AboutUsComponent } from './about-us/about-us.component';
import { PartnerUsComponent } from './partner-us/partner-us.component';
import { CareerComponent } from './career/career.component';
import { MembershipComponent } from './membership/membership.component';
import { PoliciesComponent } from './policies/policies.component';
import { InHouseSolutionsComponent } from './in-house-solutions/in-house-solutions.component';
import { MissionAndVisionComponent } from './mission-and-vision/mission-and-vision.component';
import { AffiliateProgramComponent } from './affiliate-program/affiliate-program.component';
import { GuestBloggingComponent } from './guest-blogging/guest-blogging.component';
import { BecomeOurTrainerComponent } from './become-our-trainer/become-our-trainer.component';
import { CorporateTrainingComponent } from './corporate-training/corporate-training.component';
import { CoursesOfferedComponent } from './courses-offered/courses-offered.component';
import { WhyOilandgasclubComponent } from './why-oilandgasclub/why-oilandgasclub.component';
import { BuildYourPortfolioComponent } from './build-your-portfolio/build-your-portfolio.component';
import { WorldsLargestRefineriesComponent } from './worlds-largest-refineries/worlds-largest-refineries.component';
import { TermsAndConditionComponent } from './terms-and-condition/terms-and-condition.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { RefundCancellationPolicyComponent } from './refund-cancellation-policy/refund-cancellation-policy.component';
// ✅ MODULE: PageNotFoundComponent is imported via SharedModule (no need to import here)
import { provideHttpClient, withFetch } from '@angular/common/http';
import { PublicCourseModule } from './public-course/public-course.module';
import { RedirectCoursesToSlugComponent } from './public-course/redirect-courses-to-slug/redirect-courses-to-slug.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { PaymentSuccessComponent } from './payment-success/payment-success.component';




@NgModule({
  declarations: [
    // ✅ MODULE: Add all components to declarations array (required for non-standalone components)
    HomeComponent,
    ContactUsComponent,
    AboutUsComponent,
    PartnerUsComponent,
    CareerComponent,
    MembershipComponent,
    PoliciesComponent,
    InHouseSolutionsComponent,
    MissionAndVisionComponent,
    AffiliateProgramComponent,
    GuestBloggingComponent,
    BecomeOurTrainerComponent,
    CorporateTrainingComponent,
    CoursesOfferedComponent,
    WhyOilandgasclubComponent,
    BuildYourPortfolioComponent,
    WorldsLargestRefineriesComponent,
    TermsAndConditionComponent,
    PrivacyPolicyComponent,
    RefundCancellationPolicyComponent,
    CheckoutComponent,
    PaymentSuccessComponent
    // ✅ MODULE: PageNotFoundComponent is declared in SharedModule (imported), so don't redeclare here
  ],
  imports: [
    CommonModule,
    PublicappRoutingModule,
    SharedModule,
    PublicCourseModule,
    RedirectCoursesToSlugComponent,
    FixMojibakeSafeHtmlPipe
  ],
  providers: [ provideHttpClient(withFetch())],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
})
export class PublicappModule { }
