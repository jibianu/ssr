import { Component, Optional, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from '../../adminapp.service';
import { SidebarToggleService } from '../../../../core/services/sidebar-toggle.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface CategoryOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-send-notification',
  templateUrl: './send-notification.component.html',
  styleUrls: ['./send-notification.component.scss'],
  standalone: false
})
export class SendNotificationComponent implements OnInit {
  form: FormGroup;
  sending = false;
  message = '';
  error = '';
  categories: CategoryOption[] = [];

  get isModal(): boolean {
    return !!this.activeModal;
  }

  get isByCategory(): boolean {
    return this.form?.get('targetAudience')?.value === 'by_category';
  }

  constructor(
    private fb: FormBuilder,
    private appService: AdminAppService,
    private sidebarToggle: SidebarToggleService,
    @Optional() public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      message: ['', [Validators.required]],
      type: ['offer'],
      linkUrl: [''],
      targetAudience: ['all_students'],
      categoryId: ['']
    });
  }

  ngOnInit(): void {
    this.appService.getPublishedCategories().subscribe({
      next: (list) => {
        this.categories = (list || []).map((c: any) => ({ id: c.id || c.Id, name: c.name || c.Name || c.title || c.Title || '—' }));
      },
      error: () => (this.categories = [])
    });
  }

  openMenu(): void {
    this.sidebarToggle.requestOpen();
  }

  closeModal(): void {
    if (this.activeModal) {
      this.activeModal.dismiss();
    }
  }

  send(): void {
    if (this.isByCategory && !this.form.get('categoryId')?.value?.trim()) {
      this.form.get('categoryId')?.setErrors({ required: true });
      this.form.get('categoryId')?.markAsTouched();
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.message = '';
    this.error = '';
    this.sending = true;
    const value = this.form.getRawValue();
    const audience = value.targetAudience || 'all_students';
    let categoryId: string | undefined;
    if (audience === 'by_category' && value.categoryId && value.categoryId.trim()) {
      categoryId = value.categoryId.trim();
    }
    const body: any = {
      title: value.title.trim(),
      message: value.message.trim(),
      type: (value.type || 'offer').toLowerCase(),
      linkUrl: value.linkUrl && value.linkUrl.trim() ? value.linkUrl.trim() : undefined,
      targetAudience: audience,
      userIds: audience === 'selected' ? [] : undefined
    };
    if (categoryId) body.categoryId = categoryId;
    this.appService.sendPushNotification(body).subscribe({
      next: (res) => {
        this.sending = false;
        this.message = (res && res.message) ? res.message : 'Notifications sent.';
        if (res && res.count != null) this.message += ' (' + res.count + ' students)';
        this.form.reset({ title: '', message: '', type: 'offer', linkUrl: '', targetAudience: 'all_students', categoryId: '' });
        if (this.activeModal) {
          this.activeModal.close(true);
        }
      },
      error: (err) => {
        this.sending = false;
        this.error = (err && err.error && err.error.message) ? err.error.message : 'Failed to send notifications.';
      }
    });
  }
}
