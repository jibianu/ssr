
import { Component, OnInit, inject } from '@angular/core';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { environment } from 'src/environments/environment';

// ✅ HYDRATION: Interface definitions for type safety in @for loops
interface CourseCard {
  url: string;
  image: string;
  alt: string;
  title: string;
  badge?: string;
  features: string[];
  price: string;
}

interface EventCard {
  url: string;
  image: string;
  alt: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
}

interface CategoryLink {
  url: string;
  title: string;
  description: string;
  class: string;
}

interface QuickLink {
  url: string;
  title: string;
}

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
    // ✅ HYDRATION: Removed ngSkipHydration to enable proper SSR hydration
    // Only browser-specific parts should skip hydration, not the entire component
})
export class HomeComponent implements OnInit {
  private readonly metadataService = inject(MetadataService);
  private readonly canonicalService = inject(CanonicalService);
  private readonly structuredDataService = inject(StructuredDataService);

  // ✅ HYDRATION: Data arrays for @for loops - prevents SSR mismatches
  readonly topCourses: CourseCard[] = [
    {
      url: '/mastering-pipenet-self-learning-training-materials-for-piping-design-and-simulation',
      image: 'assets/home_courseimage/cd.jpeg',
      alt: 'PIPENET training materials',
      title: 'PIPENET training materials, Self Learning',
      badge: 'Best Seller',
      features: ['steady-state flow analysis', 'PIPENET self-learning for simulation', 'Transient dynamic flow analysis'],
      price: '₹3,999.00'
    },
    {
      url: '/api-570-closed-book-mock-exam-comprehensive-preparation',
      image: 'assets/home_courseimage/Api_570.jpeg',
      alt: 'API 570 Mock Exam',
      title: 'API 570 Closed-Book Mock Exam Q&A Practice',
      badge: 'Best Seller',
      features: ['API 570 Mock Exam Preparation', 'Real-time Q&A practice session', 'Structured Q&A for better learning'],
      price: '₹99.00.00'
    },
    {
      url: '/cswip-three-point-one-question-paper-part-two',
      image: 'assets/home_courseimage/Cswip_3.1_Exam.png',
      alt: 'CSWIP 3.1 Exam',
      title: 'CSWIP 3.1 Exam Preparation with Q&A Practice',
      badge: 'Best Seller',
      features: ['CSWIP 3.1 Q&A Practice', 'CSWIP 3.1 Mock Test', 'CSWIP 3.1 Practice Course'],
      price: '₹198.00'
    },
    {
      url: '/welding-and-ndt-service',
      image: 'assets/home_courseimage/Welding_NDT.png',
      alt: 'Welding & NDT Training',
      title: 'Welding & NDT Self-Paced Training for Professionals',
      badge: 'Best Seller',
      features: ['Learn from real exam questions', 'Crack your exam with confidence', 'Master inspection skills easily'],
      price: '₹79.00'
    },
    {
      url: '/coating-and-painting-techniques-cbt-part-one-training-for-excellence',
      image: 'assets/home_courseimage/coating-and-painting.jpeg',
      alt: 'Coating & Painting Course',
      title: 'Coating & Painting Exam Preparation Course',
      badge: 'Best Seller',
      features: ['Practice with real-time Q&A', 'Crack the exam with confidence', 'Master Coating Painting Techniques'],
      price: '₹198.00'
    },
    {
      url: '/bgas-painting-questions',
      image: 'assets/home_courseimage/bgas-painting.jpeg',
      alt: 'BGAS Painting Inspector',
      title: 'BGAS Painting Inspector Q&A Practice Course',
      badge: 'Best Seller',
      features: ['Practice with real exam questions', 'BGAS Painting Mock Exam Practice', 'Secure your certification fast'],
      price: '₹199.00'
    },
    {
      url: '/cswip-three-point-one-question-paper-part-two',
      image: 'assets/home_courseimage/CSWIP_3.1_QA.jpeg',
      alt: 'CSWIP 3.1 Q&A',
      title: 'CSWIP 3.1 Q&A Self-Practice Course',
      badge: 'Best Seller',
      features: ['Get hands-on practice with Q&A', 'CSWIP 3.1 Q&A Practice', 'Practice with real exam questions'],
      price: '₹198.00'
    },
    {
      url: '/bgas-question-and-answers',
      image: 'assets/home_courseimage/BAGS_Certification.jpeg',
      alt: 'BGAS Certification',
      title: 'BGAS Certification Q&A Practice Course',
      badge: 'Best Seller',
      features: ['Prepare for BGAS Certification', 'Learn through Q&A practice', 'Pass the exam easily'],
      price: '₹299.00'
    }
  ];

  readonly topEvents: EventCard[] = [
    {
      url: '',
      image: 'assets/home_courseimage/Pipenet_Event.jpeg',
      alt: 'PIPENET Transient Module Event',
      title: 'PIPENET Transient Module for Fire Protection Systems',
      subtitle: 'A Event by Anush',
      description: 'Online Workshop<br>Oilandgasclub Team, India<br>Streaming Virtually Through Microsoft Teams',
      price: '₹797.00'
    },
    {
      url: '',
      image: 'assets/home_courseimage/Static_equipment.png',
      alt: 'Static Equipment Design',
      title: 'Static Equipment Design: Mastering Pressure Vessels, Heat Exchangers, and Tall Towers',
      subtitle: 'A Event by Anush',
      description: 'Online Workshop<br>Oilandgasclub Team, India<br>Streaming Virtually Through Microsoft Teams',
      price: '₹899.00'
    },
    {
      url: '',
      image: 'assets/home_courseimage/Pv.png',
      alt: 'Pressure Vessel Design',
      title: 'Masterclass on Pressure Vessel Design – ASME Codes & PVElite Training',
      subtitle: 'A Event by Anush',
      description: 'Online Workshop<br>Oilandgasclub Team, India<br>Streaming Virtually Through Microsoft Teams',
      price: '₹799.00'
    },
    {
      url: '',
      image: 'assets/home_courseimage/Heat_Exchanger.png',
      alt: 'Mastering Heat Exchangers',
      title: 'Mastering Heat Exchangers with HTRI Software',
      subtitle: 'A Event by Anush',
      description: 'Online Workshop<br>Oilandgasclub Team, India<br>Streaming Virtually Through Microsoft Teams',
      price: '₹899.00'
    }
  ];

  readonly categoryLinks: CategoryLink[] = [
    { url: '/category/Process', title: 'Specialized Process Design Courses', description: 'Over 11 + course', class: 'cour-item1' },
    { url: '/category/Piping', title: 'Software-Based Piping Design Courses', description: 'Over 15+ course', class: 'cour-item2' },
    { url: '/category/NDT', title: 'NDT Method-Specific Courses', description: 'Over 20+ course', class: 'cour-item3' },
    { url: '/category/Instrumentation', title: 'Industry-Specific Instrumentation Courses', description: 'Over 20+ course', class: 'cour-item4' },
    { url: '/category/API%20Self%20Learning%20Courses', title: 'API Self Learning Courses', description: 'Over 20+ course', class: 'cour-item5' }
  ];

  readonly quickLinks: QuickLink[] = [
    { url: '/Intools-Training/', title: 'Smart Plant Instrumentation Design' },
    { url: '/Aspen-HYSYS-Training', title: 'Process Simulation' },
    { url: '/PDMS-Training/', title: 'Plant Design Management System' },
    { url: '/SP3D-Training/', title: 'Smart Plant 3D' },
    { url: '/E3d-Training', title: 'E3D' },
    { url: '/HTRI-Software/', title: 'Heat Exchanger Design' },
    { url: '/pipenet-training/', title: 'Fluid Flow Analysis' },
    { url: '/Primavera-Training/', title: 'Primavera P6' },
    { url: '/Tekla-Software-Training/', title: 'Structures Modelling' },
    { url: '/Piping-Stress-Analysis-Course/', title: 'Stress Analysis' }
  ];

  ngOnInit(): void {
    const canonicalUrl = environment.seoUrl;
    const fullUrl = 'https://www.oilandgasclub.com';

    // ✅ SEO: Use MetadataService for proper meta tag management (SSR-compatible)
    this.metadataService.updateMetadata({
      title: 'Oilandgasclub - Self-Learning Courses for Oil and Gas Industry Professionals',
      description: 'Oilandgasclub.com – Empowering careers in the oil and gas industry with self-paced online courses. Advance your skills with expert-designed training programs, certification prep, and career-focused resources. Start learning today!',
      author: 'Oilandgasclub',
      type: 'website',
      image: 'https://www.oilandgasclub.com/assets/images/og-image.jpg',
      imageWidth: 1200,
      imageHeight: 630,
      seoUrl: fullUrl,
      canonicalUrl: canonicalUrl
    });

    this.canonicalService.setCanonicalURL(canonicalUrl);

    // ✅ SEO: Add Organization structured data (should be on homepage)
    this.structuredDataService.setOrganization({
      name: 'Oilandgasclub',
      url: 'https://www.oilandgasclub.com',
      logo: 'https://www.oilandgasclub.com/assets/images/og-image.jpg',
      description: 'Leading online learning platform offering certifications and training programs for the oil and gas industry',
      sameAs: [
        'https://www.facebook.com/oilandgasclub',
        'https://www.twitter.com/oilandgasclub',
        'https://www.linkedin.com/company/oilandgasclub'
      ]
    });

    // ✅ SEO: Add WebSite schema with search action
    this.structuredDataService.setWebSite(
      'Oilandgasclub',
      'https://www.oilandgasclub.com',
      'https://www.oilandgasclub.com/search?q={search_term_string}'
    );
  }
}
