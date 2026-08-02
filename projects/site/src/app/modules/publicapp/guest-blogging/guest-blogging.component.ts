// import { Component, OnInit } from '@angular/core';

// @Component({
//   selector: 'app-guest-blogging',
//   templateUrl: './guest-blogging.component.html',
//   styleUrls: ['./guest-blogging.component.scss']
// })
// export class GuestBloggingComponent implements OnInit {

//   constructor() { }

//   ngOnInit(): void {
//   }

// }



import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { timeout } from 'rxjs/operators';
import { TimeoutError } from 'rxjs';

 @Component({
    selector: 'app-guest-blogging',
    templateUrl: './guest-blogging.component.html',
    styleUrls: ['./guest-blogging.component.scss'],
    standalone: false
})
export class GuestBloggingComponent implements OnInit {

  // Modal and form state (match Partner-us popup UX)
  showModal = false;
  isSubmitting = false;
  submitMessage = '';
  submitSuccess = false;
  showThankYouInModal = false;
  thankYouMessage = 'Thanks for your pitch! Our editorial team will contact you within 2 business days.';

  // Client-side idempotency guard (prevents rapid re-submits of the same data)
  private lastSubmitFingerprint = '';
  private lastSubmitAtMs = 0;

  // Guest Blogging form model
  formData = {
    name: '',
    email: '',
    phoneNumber: '',
    linkedinUrl: '',
    aboutYou: '',
    affiliatedOrganization: ''
  };

  // Google Apps Script Guest Blogging Web App URL
  // Deployment ID: AKfycbyN0Zsh6D7cJcVHQC1OKiiuUEz1ky4H_d0zi2N4vz2dr8zbl2BMovpOl5NeD6aQcOAmog
  readonly GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyN0Zsh6D7cJcVHQC1OKiiuUEz1ky4H_d0zi2N4vz2dr8zbl2BMovpOl5NeD6aQcOAmog/exec';

  readonly heroChecklist = [
    'Showcase your expertise to 250K+ monthly readers',
    'Earn payouts for every published feature',
    'Collaborate with our editorial and design squad'
  ];

  readonly benefitCards = [
    {
      title: 'Global reach',
      description: 'We syndicate every article across newsletters, LinkedIn, and partner communities so your ideas travel farther.'
    },
    {
      title: 'Editorial polish',
      description: 'Our editors refine structure, visuals, and SEO so you can focus on insights, not formatting.'
    },
    {
      title: 'Author recognition',
      description: 'Every post credits you with bio, social links, and portfolio callouts to attract consulting or hiring opportunities.'
    },
    {
      title: 'Flexible formats',
      description: 'Submit walkthroughs, checklists, case studies, or videos—anything that helps peers level up faster.'
    }
  ];

  readonly processSteps = [
    {
      step: '01',
      title: 'Pitch your idea',
      detail: 'Send 2–3 bullet points outlining the problem, target audience, and key takeaways.'
    },
    {
      step: '02',
      title: 'Write with us',
      detail: 'Collaborate with our editors to structure the draft, add diagrams, and ensure clarity.'
    },
    {
      step: '03',
      title: 'Publish & get paid',
      detail: 'Once approved, your article goes live within 7 days and you receive payment plus promotion assets.'
    }
  ];

  readonly contributionIdeas = [
    'Field-tested guides on API, ASNT, CSWIP, HTRI, or digital oilfield workflows',
    'Stories about project pitfalls, safety learnings, or commissioning lessons',
    'Checklists, dashboards, calculation templates, or troubleshooting trees',
    'Career advice: interview prep, portfolio building, remote collaboration tips'
  ];

  readonly faqList = [
    {
      question: 'Who can contribute?',
      answer: 'Engineers, inspectors, designers, managers, data scientists, or students with practical experience in energy, petrochemical, pharma, or infrastructure projects.'
    },
    {
      question: 'Do you accept previously published work?',
      answer: 'We prefer original pieces but can consider refreshed versions if you have the rights and the content is significantly updated.'
    },
    {
      question: 'What is the compensation?',
      answer: 'Payments depend on depth, visuals, and originality. Typical range is $2–$20 USD per article, plus spotlight features.'
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
    this.setCanonicalURL('https://oilandgasclub.com/guest-blogging');
         this.titleService.setTitle('Guest Blog: Mastering Oil and Gas Certifications | Oilandgasclub');
     this.metaService.addTags([
      { name: 'description', content: 'Explore expert insights, tips, and strategies for mastering API, ASNT, CSWIP, and HTRI certifications in the oil and gas industry.' },
      { name: 'keywords', content: 'guest blogging, oil and gas industry, content marketing, industry insights, guest post submission, oil and gas professionals' },
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
   * Open the guest blogging pitch modal
   */
  openModal(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showModal = true;
    this.isSubmitting = false;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;
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
      this.isSubmitting = false;
      return;
    }
    this.lastSubmitFingerprint = fingerprint;
    this.lastSubmitAtMs = now;

    this.isSubmitting = true;

    // Build form parameters.
    // Note: Apps Script sheets often map keys by exact string. To avoid "data not coming"
    // due to mismatched key names, we send a few common aliases for each field.
    const name = (this.formData.name || '').trim();
    const email = (this.formData.email || '').trim();
    const phoneNumber = (this.formData.phoneNumber || '').trim();
    const linkedinUrl = (this.formData.linkedinUrl || '').trim();
    const aboutYou = (this.formData.aboutYou || '').trim();
    const affiliatedOrg = (this.formData.affiliatedOrganization || '').trim();

    // Match Apps Script doPost(e) exactly:
    // Name, Email, Phone Number, Linkedin Url, About you, Are you affiliated with any organization
    // (script also accepts some camelCase fallbacks; we include those too)
    const params = new HttpParams()
      .set('Name', name)
      .set('Email', email)
      .set('Phone Number', phoneNumber)
      .set('Linkedin Url', linkedinUrl)
      .set('About you', aboutYou)
      .set('Are you affiliated with any organization', affiliatedOrg)
      // fallbacks supported by your script
      .append('name', name)
      .append('email', email)
      .append('phoneNumber', phoneNumber)
      .append('linkedinUrl', linkedinUrl)
      .append('aboutYou', aboutYou)
      .append('affiliatedOrganization', affiliatedOrg);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });

    const requestBody = params.toString();
    console.log('📤 Submitting guest blogging pitch:', {
      url: this.GOOGLE_SCRIPT_URL,
      data: {
        name: this.formData.name,
        email: this.formData.email,
        phoneNumber: this.formData.phoneNumber,
        linkedinUrl: this.formData.linkedinUrl,
        aboutYou: this.formData.aboutYou,
        affiliatedOrganization: this.formData.affiliatedOrganization
      }
    });

    this.http
      .post(this.GOOGLE_SCRIPT_URL, requestBody, { headers, responseType: 'text' })
      .pipe(
        timeout(20000),
        finalize(() => {
        this.isSubmitting = false;
        console.log('✅ Form submission completed (success or error)');
        })
      )
      .subscribe({
        next: (textResponse) => {
          console.log('📥 Response received from Google Apps Script:', {
            responseLength: textResponse?.length || 0,
            responsePreview: textResponse?.substring(0, 200) || 'empty',
            fullResponse: textResponse
          });

          // If Apps Script redirects to a login / HTML page, treat as a failure and show a clear message.
          const responseText = (textResponse || '').toString();
          const lower = responseText.toLowerCase();
          const looksLikeHtml = lower.includes('<html') || lower.includes('<!doctype html') || lower.includes('<body');
          const looksLikeGoogleLogin = lower.includes('accounts.google.com') || lower.includes('service-login') || lower.includes('sign in');
          if (looksLikeHtml && looksLikeGoogleLogin) {
            console.error('❌ Apps Script endpoint returned a login/HTML page. Check deployment access (Anyone) and CORS.', {
              responsePreview: responseText.substring(0, 500)
            });
            this.submitSuccess = false;
            this.submitMessage =
              'Submission failed: the form endpoint is not publicly accessible. Please redeploy your Google Apps Script as “Anyone” can access, then try again.';
            return;
          }

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
              name: '',
              email: '',
              phoneNumber: '',
              linkedinUrl: '',
              aboutYou: '',
              affiliatedOrganization: ''
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
        error: (err: unknown) => {
          // Error handling: keep modal open and show clear message
          this.submitSuccess = false;

          // RxJS timeout
          if (err instanceof TimeoutError) {
            console.error('⏱️ Submission timed out:', err);
            this.submitMessage = 'Submission timed out. Please try again in a moment.';
            return;
          }

          const httpErr = err as HttpErrorResponse;
          console.error('❌ HTTP Error during form submission:', {
            status: httpErr?.status,
            statusText: httpErr?.statusText,
            message: httpErr?.message,
            error: httpErr?.error,
            url: httpErr?.url
          });

          // Check if error response contains duplicate information
          const errorText = httpErr?.error?.toString() || httpErr?.message || '';
          const lowerErrorText = errorText.toLowerCase();
          const isDuplicate =
            lowerErrorText.includes('duplicate') ||
            lowerErrorText.includes('already exists') ||
            lowerErrorText.includes('already submitted');

          if (isDuplicate) {
            // Duplicate detected - show friendly message in popup
            this.submitMessage =
              'This submission already exists. You have already submitted this form with the same email and phone number.';
            return;
          }

          // Provide more specific error messages for other errors
          if (httpErr?.status === 0) {
            // CORS or network error
          this.submitMessage =
              'Network error: Unable to connect to server. Please check your internet connection or try again later.';
          } else if (httpErr?.status >= 400 && httpErr?.status < 500) {
            this.submitMessage = `Request error (${httpErr.status}): ${httpErr.statusText || 'Please check your input and try again.'}`;
          } else if (httpErr?.status >= 500) {
            this.submitMessage = 'Server error: Please try again later.';
          } else {
            this.submitMessage = httpErr?.message || 'Network error while submitting. Please try again.';
          }
        }
      });
  }

  /**
   * Generate fingerprint for duplicate detection (email + whatsapp)
   */
  private getFingerprint(): string {
    const email = (this.formData.email || '').trim().toLowerCase();
    const phone = (this.formData.phoneNumber || '').trim();
    return `${email}|${phone}`;
  }
}
