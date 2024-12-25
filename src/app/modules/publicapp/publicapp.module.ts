import { SharedModule } from 'src/app/shared/shared.module';
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
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';




@NgModule({
  declarations: [
    WorldsLargestRefineriesComponent,
    TermsAndConditionComponent,
    PrivacyPolicyComponent,
    RefundCancellationPolicyComponent
  ],
  imports: [
    CommonModule,
    PublicappRoutingModule,
    SharedModule
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
})
export class PublicappModule { }
