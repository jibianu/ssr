import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContactUsComponent } from '../contact-us/contact-us.component';
import { AboutUsComponent } from '../about-us/about-us.component';
import { PartnerUsComponent } from '../partner-us/partner-us.component';
import { CareerComponent } from '../career/career.component';
import { MembershipComponent } from '../membership/membership.component';
import { PoliciesComponent } from '../policies/policies.component';
import { InHouseSolutionsComponent } from '../in-house-solutions/in-house-solutions.component';
import { MissionAndVisionComponent } from '../mission-and-vision/mission-and-vision.component';
import { AffiliateProgramComponent } from '../affiliate-program/affiliate-program.component';
import { GuestBloggingComponent } from '../guest-blogging/guest-blogging.component';
import { BecomeOurTrainerComponent } from '../become-our-trainer/become-our-trainer.component';
import { CorporateTrainingComponent } from '../corporate-training/corporate-training.component';
import { CoursesOfferedComponent } from '../courses-offered/courses-offered.component';
import { WhyOilandgasclubComponent } from '../why-oilandgasclub/why-oilandgasclub.component';
import { BuildYourPortfolioComponent } from '../build-your-portfolio/build-your-portfolio.component';
import { TermsAndConditionComponent } from '../terms-and-condition/terms-and-condition.component';
import { PrivacyPolicyComponent } from '../privacy-policy/privacy-policy.component';
import { RefundCancellationPolicyComponent } from '../refund-cancellation-policy/refund-cancellation-policy.component';
import { RouteSeoData } from '../../../shared/interfaces/route-seo.interface';

const routes: Routes = [
  {
    path: 'contact-us',
    component: ContactUsComponent,
    data: {
      seo: {
        title: 'Contact Us - Oilandgasclub | Get in Touch',
        description: 'Get in touch with our oil and gas training experts. Contact us for course inquiries, corporate training, or general support.',
        keywords: 'contact oil and gas training, course inquiry, corporate training contact',
        type: 'website'
      }
    } as RouteSeoData
  },
  {
    path: 'about-us',
    component: AboutUsComponent,
    data: {
      seo: {
        title: 'About Us - Oilandgasclub | Leading Oil & Gas Education',
        description: 'Learn about Oilandgasclub, the leading platform for oil and gas education. Our mission, team, and commitment to industry excellence.',
        keywords: 'about oilandgasclub, oil and gas education company, industry training mission',
        type: 'website'
      }
    } as RouteSeoData
  },
  { path: 'partner-us', component: PartnerUsComponent },
  { path: 'career', component: CareerComponent },
  { path: 'in-house-solutions', component: InHouseSolutionsComponent },
  { path: 'membership', component: MembershipComponent },
  { path: 'policies', component: PoliciesComponent },
  { path: 'mission-and-vision', component: MissionAndVisionComponent },
  { path: 'affiliate-program', component: AffiliateProgramComponent },
  { path: 'guest-blogging', component: GuestBloggingComponent },
  { path: 'become-our-trainer', component: BecomeOurTrainerComponent },
  { path: 'corporate-training', component: CorporateTrainingComponent },
  { path: 'courses-offered', component: CoursesOfferedComponent },
  { path: 'why-oilandgasclub', component: WhyOilandgasclubComponent },
  { path: 'build-your-portfolio', component: BuildYourPortfolioComponent },
  {
    path: 'terms-and-conditions',
    component: TermsAndConditionComponent,
    data: { seo: { title: 'Terms and Conditions - Oilandgasclub', robots: 'noindex, follow' } } as RouteSeoData
  },
  {
    path: 'refund-cancellation-policy',
    component: RefundCancellationPolicyComponent,
    data: { seo: { title: 'Refund & Cancellation Policy - Oilandgasclub', robots: 'noindex, follow' } } as RouteSeoData
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
    data: { seo: { title: 'Privacy Policy - Oilandgasclub', robots: 'noindex, follow' } } as RouteSeoData
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicMarketingRoutingModule {}
