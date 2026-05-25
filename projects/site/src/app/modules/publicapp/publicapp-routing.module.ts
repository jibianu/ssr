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
import { PublicCategoryComponent } from './public-course/public-category/public-category.component';
import { PublicCourseListComponent } from './public-course/public-course-list/public-course-list.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { TermsAndConditionComponent } from './terms-and-condition/terms-and-condition.component';
import { RefundCancellationPolicyComponent } from './refund-cancellation-policy/refund-cancellation-policy.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { RouteSeoData } from '../../shared/interfaces/route-seo.interface';
import { CheckoutGuard } from '../../core/guards/checkout.guard';
import { RedirectCoursesToSlugComponent } from './public-course/redirect-courses-to-slug/redirect-courses-to-slug.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { PaymentSuccessComponent } from './payment-success/payment-success.component';
import { RedirectToElearnComponent } from '../../core/redirect-to-elearn/redirect-to-elearn.component';

const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent,
    data: {
      seo: {
        title: 'Oilandgasclub - Oil and Gas Learning Platform | Online Courses & Training',
        description: 'Learn oil and gas industry skills with our comprehensive online courses. Expert-led training, industry certifications, and career advancement opportunities.',
        keywords: 'oil and gas courses, petroleum engineering, energy training, online learning, industry certification',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'courses', 
    component: PublicCourseHomeComponent,
    data: {
      seo: {
        title: 'Oil and Gas Courses | Professional Training Programs',
        description: 'Browse our comprehensive collection of oil and gas courses. From beginner to advanced levels, enhance your skills with industry-expert training.',
        keywords: 'oil and gas courses, petroleum training, energy education, professional development',
        type: 'website'
      }
    } as RouteSeoData
  },
  // ✅ Redirect old /courses/:url to canonical /:courseSlug (same slug, no /courses/ prefix)
  { path: 'courses/:url', component: RedirectCoursesToSlugComponent },
  { path: 'courses/:url/:location', component: RedirectCoursesToSlugComponent },
  {
    path: 'list',
    component: PublicCourseListComponent,
    data: {
      seo: {
        title: 'All Courses - Oilandgasclub',
        description: 'Browse the complete list of Oilandgasclub courses and training programs.',
        type: 'website'
      }
    } as RouteSeoData
  },
  { path: 'events', loadChildren: () => import('../publicapp/public-event/public-event.module').then(m => m.PublicEventModule) },
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
  { 
    path: 'partner-us', 
    component: PartnerUsComponent,
    data: {
      seo: {
        title: 'Partner With Us - Oilandgasclub | Business Partnerships',
        description: 'Partner with Oilandgasclub to expand your reach in the oil and gas industry. Explore collaboration opportunities and mutual growth.',
        keywords: 'oil and gas partnerships, business collaboration, industry partnerships',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'career', 
    component: CareerComponent,
    data: {
      seo: {
        title: 'Careers - Oilandgasclub | Join Our Team',
        description: 'Explore career opportunities at Oilandgasclub. Join our team of oil and gas education professionals and make a difference.',
        keywords: 'oil and gas careers, education jobs, training industry careers',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'in-house-solutions', 
    component: InHouseSolutionsComponent,
    data: {
      seo: {
        title: 'In-House Training Solutions | Corporate Oil & Gas Education',
        description: 'Custom in-house training solutions for oil and gas companies. Tailored programs for your workforce development needs.',
        keywords: 'corporate training, in-house solutions, oil and gas workforce development',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'membership', 
    component: MembershipComponent,
    data: {
      seo: {
        title: 'Membership - Oilandgasclub | Premium Learning Access',
        description: 'Join our premium membership for unlimited access to oil and gas courses, exclusive content, and industry networking opportunities.',
        keywords: 'oil and gas membership, premium learning, exclusive courses, industry networking',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'policies', 
    component: PoliciesComponent,
    data: {
      seo: {
        title: 'Policies - Oilandgasclub | Terms and Guidelines',
        description: 'Review our policies, terms of service, and guidelines for using Oilandgasclub platform and services.',
        keywords: 'oilandgasclub policies, terms of service, platform guidelines',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'mission-and-vision', 
    component: MissionAndVisionComponent,
    data: {
      seo: {
        title: 'Mission & Vision - Oilandgasclub | Our Commitment',
        description: 'Learn about our mission and vision to transform oil and gas education through innovative learning solutions and industry expertise.',
        keywords: 'oil and gas education mission, industry vision, learning innovation',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'affiliate-program', 
    component: AffiliateProgramComponent,
    data: {
      seo: {
        title: 'Affiliate Program - Oilandgasclub | Earn with Us',
        description: 'Join our affiliate program and earn commissions by promoting oil and gas courses. Partner with us for mutual success.',
        keywords: 'oil and gas affiliate program, course promotion, earning opportunities',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'guest-blogging', 
    component: GuestBloggingComponent,
    data: {
      seo: {
        title: 'Guest Blogging - Oilandgasclub | Share Your Expertise',
        description: 'Share your oil and gas industry expertise through our guest blogging program. Contribute to our knowledge base.',
        keywords: 'oil and gas guest blogging, industry expertise, knowledge sharing',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'become-our-trainer', 
    component: BecomeOurTrainerComponent,
    data: {
      seo: {
        title: 'Become a Trainer - Oilandgasclub | Teach with Us',
        description: 'Join our team of expert trainers and share your oil and gas knowledge. Apply to become a certified instructor.',
        keywords: 'oil and gas trainer, instructor opportunities, teaching positions',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'corporate-training', 
    component: CorporateTrainingComponent,
    data: {
      seo: {
        title: 'Corporate Training - Oilandgasclub | Enterprise Solutions',
        description: 'Comprehensive corporate training solutions for oil and gas companies. Customized programs for workforce development.',
        keywords: 'corporate oil and gas training, enterprise solutions, workforce development',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'courses-offered', 
    component: CoursesOfferedComponent,
    data: {
      seo: {
        title: 'Courses Offered - Oilandgasclub | Complete Course Catalog',
        description: 'Explore our complete catalog of oil and gas courses. From technical skills to management training, find the right program for you.',
        keywords: 'oil and gas course catalog, technical training, management courses',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'why-oilandgasclub', 
    component: WhyOilandgasclubComponent,
    data: {
      seo: {
        title: 'Why Choose Oilandgasclub | Industry-Leading Education',
        description: 'Discover why Oilandgasclub is the preferred choice for oil and gas education. Industry expertise, practical training, and career advancement.',
        keywords: 'why oilandgasclub, oil and gas education benefits, industry expertise',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'build-your-portfolio', 
    component: BuildYourPortfolioComponent,
    data: {
      seo: {
        title: 'Build Your Portfolio - Oilandgasclub | Career Development',
        description: 'Build a strong professional portfolio in the oil and gas industry. Learn skills that matter for career advancement.',
        keywords: 'oil and gas portfolio, career development, professional skills',
        type: 'website'
      }
    } as RouteSeoData
  },
  { 
    path: 'terms-and-conditions', 
    component: TermsAndConditionComponent,
    data: {
      seo: {
        title: 'Terms and Conditions - Oilandgasclub | Legal Information',
        description: 'Read our terms and conditions for using Oilandgasclub services. Legal information and user agreements.',
        keywords: 'terms and conditions, legal information, user agreement',
        type: 'website',
        robots: 'noindex, follow'
      }
    } as RouteSeoData
  },
  { 
    path: 'refund-cancellation-policy', 
    component: RefundCancellationPolicyComponent,
    data: {
      seo: {
        title: 'Refund & Cancellation Policy - Oilandgasclub',
        description: 'Learn about our refund and cancellation policy for courses and services. Clear guidelines for your peace of mind.',
        keywords: 'refund policy, cancellation policy, course refunds',
        type: 'website',
        robots: 'noindex, follow'
      }
    } as RouteSeoData
  },
  { 
    path: 'privacy-policy', 
    component: PrivacyPolicyComponent,
    data: {
      seo: {
        title: 'Privacy Policy - Oilandgasclub | Data Protection',
        description: 'Our privacy policy explains how we collect, use, and protect your personal information on Oilandgasclub platform.',
        keywords: 'privacy policy, data protection, personal information',
        type: 'website',
        robots: 'noindex, follow'
      }
    } as RouteSeoData
  },
  { 
    path: 'page-not-found', 
    component: PageNotFoundComponent,
    data: {
      seo: {
        title: 'Page Not Found - Oilandgasclub',
        description: 'The page you are looking for could not be found. Return to our homepage or browse our courses.',
        type: 'website',
        robots: 'noindex, follow'
      }
    } as RouteSeoData
  },
  // ✅ Blog list only; detail is via universal :slug (domain/{slug})
  {
    path: 'blog',
    loadChildren: () => import('./blog/blog.module').then(m => m.BlogModule)
  },
  // ✅ Category route - direct component (not lazy-loaded, simpler)
  {
    path: 'category/:name',
    component: PublicCategoryComponent
  },
  // ✅ Legacy route support: redirect /course/:slug -> /:slug
  {
    path: 'course/:courseSlug',
    component: RedirectCoursesToSlugComponent
  },
  // ✅ Checkout by courseId (unified). Auth: redirect to /login?returnUrl=/checkout/:courseId if not logged in.
  {
    path: 'checkout/:courseId',
    canActivate: [CheckoutGuard],
    component: CheckoutComponent
  },
  // ✅ Payment success: gateway redirects here; verify then redirect to /app/my-courses
  {
    path: 'payment/success',
    component: PaymentSuccessComponent
  },
  // OAuth / auth callbacks must not hit slug-resolver (see also isElearnSpaRootPath on unified SSR)
  {
    path: 'sso-callback',
    component: RedirectToElearnComponent
  },
  // ✅ Universal slug: domain/{slug} → course | blog | event (resolved by GET /api/slug-resolver/{slug})
  {
    path: ':slug',
    loadChildren: () => import('./slug-resolver/slug-resolver.module').then(m => m.SlugResolverModule),
    data: { skipRouteLocalization: true }
  },
  // ✅ Wildcard - MUST be last
  { 
    path: '**', 
    redirectTo: 'page-not-found' 
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)], // ✅ This was missing
  exports: [RouterModule] // ✅ Needed so other modules can use the routing
})
export class PublicappRoutingModule {}
