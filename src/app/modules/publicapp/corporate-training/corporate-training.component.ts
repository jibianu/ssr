//  import { Component, OnInit } from '@angular/core';

//  @Component({
//    selector: 'app-corporate-training',
//   templateUrl: './corporate-training.component.html',
//   styleUrls: ['./corporate-training.component.scss']
// })
//  export class CorporateTrainingComponent implements OnInit {

//   constructor() { }

//    ngOnInit(): void {
//    }

//  }




// import { Component, OnInit } from '@angular/core';
// import { Meta, Title } from '@angular/platform-browser';

// @Component({
//   selector: 'app-corporate-training',
//   templateUrl: './corporate-training.component.html',
//   styleUrls: ['./corporate-training.component.scss']
// })
// export class CorporateTrainingComponent implements OnInit {
//   constructor(private metaService: Meta, private titleService: Title) {}

//   setCanonicalURL() {
//     const link: HTMLLinkElement = document.createElement('link');
//     link.setAttribute('rel', 'canonical');
//     link.setAttribute('href', 'https://www.oilandgasclub.com/corporate-training');
//     document.head.appendChild(link);
//   }

//   ngOnInit() {
//     this.titleService.setTitle('Corporate Training - Oil and Gas Club');
//     this.metaService.addTags([
//       { name: 'description', content: 'Corporate training programs tailored for professionals in the oil and gas industry.' },
//       { name: 'keywords', content: 'Corporate training, oil and gas, professional development' },
//     ]);
//     this.setCanonicalURL();
//   }
// }

import { DOCUMENT } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, Inject, OnInit, PLATFORM_ID, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-corporate-training',
    templateUrl: './corporate-training.component.html',
    styleUrls: ['./corporate-training.component.scss'],
    standalone: false
})
export class CorporateTrainingComponent implements OnInit {

  // Modal and form state
  showModal = false;
  isSubmitting = false;
  submitMessage = '';
  submitSuccess = false;
  showThankYouInModal = false;
  thankYouMessage = 'Thank you for your interest! Our team will contact you within 48 hours with a proposal.';

  // Form data model matching Google Apps Script parameters
  formData = {
    firstName: '',
    lastName: '',
    workEmail: '',
    whatsappNumber: '',
    company: ''
  };

  // Client-side idempotency guard (prevents rapid re-submits)
  private lastSubmitFingerprint = '';
  private lastSubmitAtMs = 0;

  // Google Apps Script Corporate Training Web App URL
  // Deployment ID: AKfycbwuHfSYlGmhVQMjBsfWOnNO9o0lOya608WJich55T-RsnZ_lGpM22uzSMDSnsTfrwL5ug
  readonly GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuHfSYlGmhVQMjBsfWOnNO9o0lOya608WJich55T-RsnZ_lGpM22uzSMDSnsTfrwL5ug/exec';

  readonly heroStats = [
    { label: 'Corporates', value: '30+' },
    { label: 'Courses', value: '40+' },
    { label: 'Countries', value: '7+' }
  ];

  readonly solutions = [
    {
      title: 'Process & Simulation Labs',
      description: 'HYSYS, HTRI, Aspen, OLGA, and flare system design with scenario-based assessments.'
    },
    {
      title: 'Mechanical & Piping Programs',
      description: 'PV Elite, Caesar II, API 650/653/579, rotating equipment reliability, RBI.'
    },
    {
      title: 'Inspection & Integrity',
      description: 'API 510/570, ASNT Level II/III, corrosion monitoring, fitness-for-service workshops.'
    },
    {
      title: 'Digital & Analytics',
      description: 'PI System, Power BI, Python for engineers, digital twin PoCs, cloud dashboards.'
    }
  ];

  readonly deliveryModes = [
    {
      mode: 'Cohort-based',
      detail: 'Live instructor sessions, collaborative labs, and capstones tailored for 15–30 learners.'
    },
    {
      mode: 'Hybrid On-demand',
      detail: 'Self-paced modules combined with weekly coaching clinics and project audits.'
    },
    {
      mode: 'On-site Intensives',
      detail: 'Bootcamps hosted at your facility with equipment walk-throughs and safety drills.'
    }
  ];

  readonly trainingSteps = [
    {
      step: '01',
      title: 'Discovery workshop',
      detail: 'We map skills, competency gaps, and KPI targets with your learning and ops leaders.'
    },
    {
      step: '02',
      title: 'Program blueprint',
      detail: 'Co-create curriculum, labs, and certification pathways aligned to your tool stack.'
    },
    {
      step: '03',
      title: 'Launch & optimize',
      detail: 'Deliver, measure outcomes, and iterate using dashboards + quarterly design reviews.'
    }
  ];

  readonly testimonials = [
    {
      quote: '“Oilandgasclub helped us reskill 120 process engineers across 4 sites in just 10 weeks.”',
      author: 'Learning Director – Global Operator'
    },
    {
      quote: '“Their hybrid format meant zero downtime for our rotating equipment team.”',
      author: 'Maintenance Leader – LNG Major'
    }
  ];

  readonly logos = [
    { icon: 'orbit', label: 'Energy Alliance' },
    { icon: 'shield', label: 'Integrity Group' },
    { icon: 'pulse', label: 'Reliability Partners' },
    { icon: 'circuit', label: 'Digital Twin Lab' }
  ];

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private http: HttpClient,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/corporate-training');
         this.titleService.setTitle('Corporate Training - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Corporate training programs tailored for professionals in the oil and gas industry.' },
      { name: 'keywords', content: 'Corporate training, oil and gas, professional development' },
    ]);
  }

  setCanonicalURL(url: string): void {
    // Remove any existing canonical link
    const existingLink: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.setAttribute('href', url);
    } else {
      // Create a new canonical link
      const link: HTMLLinkElement = this.renderer.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.renderer.appendChild(this.document.head, link);
    }
  }

  /**
   * Open the corporate training enquiry modal
   */
  openModal(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!isPlatformBrowser(this.platformId)) return;

    this.showModal = true;
    this.isSubmitting = false;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;

    // Prevent body scroll when modal is open
    this.document.body.style.overflow = 'hidden';
  }

  /**
   * Close the modal and reset form state
   */
  closeModal(): void {
    this.showModal = false;
    this.isSubmitting = false;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;

    // Restore body scroll
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = '';
    }
  }

  /**
   * Handle form submission to Google Apps Script
   */
  onFormSubmit(form: NgForm): void {
    // Prevent multiple submissions
    if (this.isSubmitting) return;

    // Clear any previous messages
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;

    if (!form.valid) {
      this.submitMessage = 'Please fill all required fields.';
      // Mark all fields as touched to show validation errors
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return;
    }

    // Client-side dedupe: block rapid double-submit of the exact same payload
    const fingerprint = this.getFingerprint();
    const now = Date.now();
    if (fingerprint && fingerprint === this.lastSubmitFingerprint && now - this.lastSubmitAtMs < 8000) {
      this.submitMessage = 'You already submitted this form. Please wait a moment before submitting again.';
      this.isSubmitting = false; // Ensure button is not disabled
      return;
    }
    this.lastSubmitFingerprint = fingerprint;
    this.lastSubmitAtMs = now;

    this.isSubmitting = true;

    // Build form parameters matching Google Apps Script expected format
    const params = new HttpParams()
      .set('First Name', (this.formData.firstName || '').trim())
      .set('Last Name', (this.formData.lastName || '').trim())
      .set('Work Email', (this.formData.workEmail || '').trim())
      .set('whatsapp number', (this.formData.whatsappNumber || '').trim())
      .set('Company', (this.formData.company || '').trim());

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });

    const requestBody = params.toString();
    console.log('📤 Submitting corporate training form:', {
      url: this.GOOGLE_SCRIPT_URL,
      data: {
        firstName: this.formData.firstName,
        lastName: this.formData.lastName,
        workEmail: this.formData.workEmail,
        whatsappNumber: this.formData.whatsappNumber,
        company: this.formData.company
      }
    });

    this.http
      .post(this.GOOGLE_SCRIPT_URL, requestBody, { headers, responseType: 'text' })
      .pipe(finalize(() => {
        this.isSubmitting = false;
        console.log('✅ Form submission completed (success or error)');
      }))
      .subscribe({
        next: (textResponse) => {
          console.log('📥 Response received from Google Apps Script:', {
            responseLength: textResponse?.length || 0,
            responsePreview: textResponse?.substring(0, 200) || 'empty',
            fullResponse: textResponse
          });

          // Apps Script returns JSON as text; parse safely
          let parsed: any = null;
          try {
            parsed = JSON.parse(textResponse || '{}');
            console.log('✅ Parsed JSON response:', parsed);
          } catch (parseError) {
            console.warn('⚠️ Response is not valid JSON, treating as success if non-empty:', {
              parseError,
              response: textResponse
            });
            // If response is not JSON but contains text, treat as success (Google Apps Script sometimes returns HTML)
            if (textResponse && textResponse.trim().length > 0) {
              // Check if response contains success indicators
              const lowerResponse = textResponse.toLowerCase();
              if (lowerResponse.includes('success') || lowerResponse.includes('thank') || lowerResponse.includes('submitted')) {
                parsed = { success: true };
              } else if (lowerResponse.includes('error') || lowerResponse.includes('fail')) {
                parsed = { success: false, error: textResponse };
              } else {
                // Default to success if we got a response
                parsed = { success: true };
              }
            } else {
              parsed = null;
            }
          }

          if (parsed && parsed.success) {
            console.log('✅ Form submission successful!');
            // Success UX (show thank-you in modal, then auto-close)
            this.submitSuccess = true;
            this.showThankYouInModal = true;

            // Reset form and model
            form.resetForm();
            this.formData = {
              firstName: '',
              lastName: '',
              workEmail: '',
              whatsappNumber: '',
              company: ''
            };

            // Auto-close the modal after a short delay
            setTimeout(() => {
              this.closeModal();
            }, 1800);
            return;
          }

          // API responded but not successful
          console.error('❌ Form submission failed:', parsed);
          this.submitSuccess = false;
          
          // Check for duplicate submission (server-side detection)
          const errorMessage = parsed?.error || parsed?.message || '';
          const lowerErrorMessage = errorMessage.toLowerCase();
          const isDuplicate = lowerErrorMessage.includes('duplicate') || 
                             lowerErrorMessage.includes('already exists') ||
                             lowerErrorMessage.includes('already submitted') ||
                             lowerErrorMessage.includes('already registered');
          
          if (isDuplicate) {
            // Duplicate detected - show friendly message in popup
            this.submitMessage = 'This submission already exists. You have already submitted this form with the same email and phone number.';
          } else {
            // Other error - show server message or generic error
            this.submitMessage = errorMessage || 'Submission failed. Please try again.';
          }
          
          // Keep modal open so user can see the error message
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ HTTP Error during form submission:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error,
            url: err.url
          });

          // Error handling: keep modal open and show clear message
          this.submitSuccess = false;
          
          // Check if error response contains duplicate information
          const errorText = err?.error?.toString() || err?.message || '';
          const lowerErrorText = errorText.toLowerCase();
          const isDuplicate = lowerErrorText.includes('duplicate') || 
                             lowerErrorText.includes('already exists') ||
                             lowerErrorText.includes('already submitted');
          
          if (isDuplicate) {
            // Duplicate detected - show friendly message in popup
            this.submitMessage = 'This submission already exists. You have already submitted this form with the same email and phone number.';
          } else {
            // Provide more specific error messages for other errors
            if (err.status === 0) {
              // CORS or network error
              this.submitMessage = 'Network error: Unable to connect to server. Please check your internet connection or try again later.';
            } else if (err.status >= 400 && err.status < 500) {
              this.submitMessage = `Request error (${err.status}): ${err.statusText || 'Please check your input and try again.'}`;
            } else if (err.status >= 500) {
              this.submitMessage = 'Server error: Please try again later.';
            } else {
              this.submitMessage = err?.message || 'Network error while submitting. Please try again.';
            }
          }
          
          // Keep modal open so user can see the error message
        }
      });
  }

  /**
   * Generate fingerprint for duplicate detection (email + whatsapp)
   */
  private getFingerprint(): string {
    const email = (this.formData.workEmail || '').trim().toLowerCase();
    const phone = (this.formData.whatsappNumber || '').trim();
    return `${email}|${phone}`;
  }
}



