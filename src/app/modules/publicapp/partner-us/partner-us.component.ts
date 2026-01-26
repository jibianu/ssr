
import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { finalize } from 'rxjs/operators';
 @Component({
    selector: 'app-partner-us',
    templateUrl: './partner-us.component.html',
    styleUrls: ['./partner-us.component.scss'],
    standalone: false
})
export class PartnerUsComponent implements OnInit {

  showModal = false;
  isSubmitting = false;
  submitMessage = ''; // used inside modal for errors
  submitSuccess = false; // kept for existing template class binding

  // Modal thank-you state (shown inside the popup only)
  thankYouMessage =
    'Thanks for partnering with us! Our team will contact you within one business day.';
  showThankYouInModal = false;

  // Client-side idempotency guard (prevents rapid re-submits of the same data)
  private lastSubmitFingerprint = '';
  private lastSubmitAtMs = 0;

  formData = {
    name: '',
    businessEmail: '',
    whatsappNumber: '',
    website: '',
    companyType: '',
    yearsInBusiness: '',
    partnerType: '',
    targetSegment: ''
  };

  // Google Apps Script Partner-Us Web App URL
  // Deployment ID: AKfycbzKkQZP_a7RLuXT7ILuQVA7LXwbvxuhH2yKonyRHGdyb2j3KlsHeqowiONrb2MlwLOJjw
  readonly GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKkQZP_a7RLuXT7ILuQVA7LXwbvxuhH2yKonyRHGdyb2j3KlsHeqowiONrb2MlwLOJjw/exec';

  readonly spotlightPoints = [
    'Global audience: reach engineers, inspectors, and decision-makers across 30+ countries.',
    'Flexible partnership models: sponsors, distributors, referral partners, facilitators.',
    'Co-marketing campaigns with guaranteed impressions and qualified leads.'
  ];

  readonly opportunities = [
    {
      title: 'Sponsorship & exhibitions',
      description: 'Showcase your brand at conferences, live trainings, and digital events attended by industry leaders.'
    },
    {
      title: 'Affiliate & referral programs',
      description: 'Promote courses or consulting services, earn commissions, and expand your service catalog.'
    },
    {
      title: 'Content collaborations',
      description: 'Co-create webinars, whitepapers, and best-practice guides for the oil & gas community.'
    },
    {
      title: 'Speaker & facilitator roles',
      description: 'Share expertise onstage or in classrooms while strengthening personal and corporate credibility.'
    }
  ];

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private http: HttpClient,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/partner-us');
         this.titleService.setTitle('Partner with Us - Oilandgasclub | Empower Your Marketing Strategy');
     this.metaService.addTags([
      { name: 'description', content: 'Discover how partnering with Oilandgasclub can boost your reach and engagement. Become part of a global platform offering oil and gas training and certifications.' },
      { name: 'keywords', content: 'oil and gas partnerships, affiliate program, industry collaboration, business partnerships, oil and gas industry, expand reach, professional collaboration, digital learning partnerships, oil and gas club partnership' },
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

  onFormSubmit(form: NgForm): void {
    // Prevent multiple submissions
    if (this.isSubmitting) return;

    // Clear any previous messages
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;

    if (!form.valid) {
      this.submitMessage = 'Please fill all required fields.';
      return;
    }

    // Client-side dedupe: block rapid double-submit of the exact same payload
    const fingerprint = this.getFingerprint();
    const now = Date.now();
    if (fingerprint && fingerprint === this.lastSubmitFingerprint && now - this.lastSubmitAtMs < 8000) {
      this.submitMessage = 'You already submitted this form. Please wait a moment.';
      return;
    }
    this.lastSubmitFingerprint = fingerprint;
    this.lastSubmitAtMs = now;

    this.isSubmitting = true;

    const params = new HttpParams()
      .set('Name', (this.formData.name || '').trim())
      .set('Business Email', (this.formData.businessEmail || '').trim())
      .set('whatsapp number', (this.formData.whatsappNumber || '').trim())
      .set('Website', (this.formData.website || '').trim())
      .set('Company Type', (this.formData.companyType || '').trim())
      .set('Years in Business', (this.formData.yearsInBusiness || '').trim())
      .set('Partner Type', (this.formData.partnerType || '').trim())
      .set('Target Segment', (this.formData.targetSegment || '').trim());

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });

    this.http
      .post(this.GOOGLE_SCRIPT_URL, params.toString(), { headers, responseType: 'text' })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (textResponse) => {
          // Apps Script returns JSON as text; parse safely.
          let parsed: any = null;
          try {
            parsed = JSON.parse(textResponse || '{}');
          } catch {
            parsed = null;
          }

          if (parsed && parsed.success) {
            // Success UX (show thank-you in modal only, then auto-close)
            this.submitSuccess = true;
            this.showThankYouInModal = true;

            // Reset form and model
            form.resetForm();
            this.formData = {
              name: '',
              businessEmail: '',
              whatsappNumber: '',
              website: '',
              companyType: '',
              yearsInBusiness: '',
              partnerType: '',
              targetSegment: ''
            };
            // Auto-close the modal after a short delay
            setTimeout(() => {
              this.closeModal();
            }, 1800);
            return;
          }

          // API responded but not successful
          this.submitSuccess = false;
          // If backend says duplicate, keep modal open and show message
          this.submitMessage =
            (parsed && parsed.error) ||
            'Submission failed. Please try again.';
        },
        error: (err: HttpErrorResponse) => {
          // Error handling: keep modal open and show clear message
          this.submitSuccess = false;
          this.submitMessage =
            err?.message ||
            'Network error while submitting. Please try again.';
        }
      });
  }

  openModal(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.showModal = true;
    this.isSubmitting = false;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;
  }

  closeModal(): void {
    this.showModal = false;
    this.isSubmitting = false;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;
  }

  private getFingerprint(): string {
    // Use email + whatsapp as the dedupe key, aligned with backend duplicate checks
    const email = (this.formData.businessEmail || '').trim().toLowerCase();
    const phone = (this.formData.whatsappNumber || '').trim();
    return `${email}|${phone}`;
  }
}
