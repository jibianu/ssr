import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BuildYourPortfolioComponent } from './build-your-portfolio/build-your-portfolio.component';
import { WhyOilandgasclubComponent } from './why-oilandgasclub/why-oilandgasclub.component';
import { CoursesOfferedComponent } from './courses-offered/courses-offered.component';
import { CorporateTrainingComponent } from './corporate-training/corporate-training.component';
import { BecomeOurTrainerComponent } from './become-our-trainer/become-our-trainer.component';
import { GuestBloggingComponent } from './guest-blogging/guest-blogging.component';
import { HomeComponent } from './home/home.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { AboutUsComponent } from './about-us/about-us.component';
import { PartnerUsComponent } from './partner-us/partner-us.component';
import { CareerComponent } from './career/career.component';
import { MembershipComponent } from './membership/membership.component';
import { InHouseSolutionsComponent } from './in-house-solutions/in-house-solutions.component';
import { PoliciesComponent } from './policies/policies.component';
import { MissionAndVisionComponent } from './mission-and-vision/mission-and-vision.component';
import { AffiliateProgramComponent } from './affiliate-program/affiliate-program.component';
import { PublicCourseHomeComponent } from './public-course/public-course-home/public-course-home.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { WorldsLargestRefineriesComponent } from './worlds-largest-refineries/worlds-largest-refineries.component';
import { TermsAndConditionComponent } from './terms-and-condition/terms-and-condition.component';
import { RefundCancellationPolicyComponent } from './refund-cancellation-policy/refund-cancellation-policy.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';



const routes: Routes = [

  {path: "" , component:HomeComponent},
  {path: "course" , component:PublicCourseHomeComponent},
  {path: 'events', loadChildren: () => import('../adminapp/events/events-listing/events.module').then(m => m.EventsModule)},
  {path: 'events-details', loadChildren: () => import('../adminapp/events/event-details/event-details.module').then(m => m.EventDetailsModule)},
  {path: "contact-us",component:ContactUsComponent},
  {path: "about-us" ,component:AboutUsComponent},
  {path: "partner-us" ,component:PartnerUsComponent},
  {path: "career"  ,component:CareerComponent},
  {path: "in-house-solutions" ,component:InHouseSolutionsComponent},
  {path: "membership" ,component:MembershipComponent},
  {path: "policies" ,component:PoliciesComponent},
  {path: "mission-and-vision" ,component:MissionAndVisionComponent},
  {path: "affiliate-program" ,component:AffiliateProgramComponent},
  {path: "guest-blogging" ,component:GuestBloggingComponent},
  {path: "become-our-trainer" ,component:BecomeOurTrainerComponent},
  {path: "corporate-training" ,component:CorporateTrainingComponent},
  {path: "courses-offered" ,component:CoursesOfferedComponent},
  {path: "why-oilandgasclub" ,component:WhyOilandgasclubComponent},
  {path: "build-your-portfolio" ,component:BuildYourPortfolioComponent},
  {path: "worlds-largest-refineries" ,component: WorldsLargestRefineriesComponent},
  {path: "terms-and-conditions" ,component: TermsAndConditionComponent},
  {path: "refund-cancellation-policy" ,component:RefundCancellationPolicyComponent},
  {path: "privacy-policy" ,component:PrivacyPolicyComponent},
  {path: "page-not-found" ,component:PageNotFoundComponent},
  { path: '', loadChildren: () => import('./public-course/public-course.module').then(m => m.PublicCourseModule) },
];


  


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicappRoutingModule { }
