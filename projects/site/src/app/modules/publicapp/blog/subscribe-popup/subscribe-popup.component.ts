import { Component, OnInit, inject, signal, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PublicAppService } from '../../publicapp.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

/**
 * Subscribe popup – same design as old blog: Join 7,500+ Professionals, email form, privacy, "Not using Oil & Gas Club yet? Learn more".
 */
@Component({
  selector: 'app-subscribe-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './subscribe-popup.component.html',
  styleUrls: ['./subscribe-popup.component.scss']
})
export class SubscribePopupComponent implements OnInit {
  private publicAppService = inject(PublicAppService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  subscribeForm!: FormGroup;
  isSubscribing = signal<boolean>(false);
  showMessage = signal<boolean>(false);
  messageText = signal<string>('');
  isSuccess = signal<boolean>(false);

  ngOnInit(): void {
    this.subscribeForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  closePopup(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('closeSubscribePopup'));
    }
  }

  onSubmit(): void {
    if (this.subscribeForm.invalid) {
      this.subscribeForm.markAllAsTouched();
      return;
    }
    const email = this.subscribeForm.get('email')?.value;
    if (!email || this.isSubscribing()) return;

    this.isSubscribing.set(true);
    this.showMessage.set(false);
    this.cdr.markForCheck();

    const slug = (typeof window !== 'undefined'
      ? window.location.pathname.split('/').filter(Boolean).pop()
      : undefined) || undefined;
    this.publicAppService.subscribeNewsletter(email, { source: 'subscribe-popup', blogSlug: slug }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.isSubscribing.set(false);
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        if (response?.success) {
          this.showMessage.set(true);
          this.messageText.set(response?.message || 'Thank you for subscribing!');
          this.isSuccess.set(true);
          this.markUserAsSubscribed(email);
          if (typeof localStorage !== 'undefined') localStorage.setItem('user_subscribed', 'true');
          this.subscribeForm.reset();
          setTimeout(() => this.closePopup(), 2000);
        } else {
          this.isSuccess.set(false);
          this.showMessage.set(true);
          this.messageText.set((response as any)?.error || 'Something went wrong. Please try again.');
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSuccess.set(false);
        this.showMessage.set(true);
        this.messageText.set(err?.error?.error || err?.message || 'Something went wrong. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  private markUserAsSubscribed(email: string): void {
    if (typeof localStorage === 'undefined' || !email) return;
    try {
      const raw = localStorage.getItem('newsletter_subscribed_emails');
      let emails: string[] = raw ? (JSON.parse(raw) || []) : [];
      if (!Array.isArray(emails)) emails = [];
      const lower = email.toLowerCase();
      if (!emails.includes(lower)) {
        emails.push(lower);
        localStorage.setItem('newsletter_subscribed_emails', JSON.stringify(emails));
      }
    } catch (_) {}
  }

  isFieldInvalid(fieldName: string): boolean {
    const c = this.subscribeForm.get(fieldName);
    return !!(c && c.invalid && c.touched);
  }

  getFieldError(fieldName: string): string {
    const c = this.subscribeForm.get(fieldName);
    if (c?.hasError('required')) return 'Email is required';
    if (c?.hasError('email')) return 'Please enter a valid email address';
    return '';
  }
}
