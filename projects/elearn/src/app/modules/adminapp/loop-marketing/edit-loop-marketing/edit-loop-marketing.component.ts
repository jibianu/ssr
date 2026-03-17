import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminAppService } from '../../adminapp.service';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-edit-loop-marketing',
  templateUrl: './edit-loop-marketing.component.html',
  styleUrls: ['./edit-loop-marketing.component.scss'],
  standalone: false,
})
export class EditLoopMarketingComponent implements OnInit {
  private appService = inject(AdminAppService);
  private toasterService = inject(ToasterService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  loopMarketingForm!: FormGroup;
  isSaving = signal(false);
  isLoading = signal(true);
  isLoadingCategories = signal(false);
  loadError = signal<string | null>(null);
  categories = signal<{ id: string; name: string }[]>([]);
  selectedCategoryId = signal<string | null>(null);
  selectedCategoryName = signal('Default (All Categories)');
  currentContentId = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategories();
    this.loadContent();
  }

  loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.appService.getAdminBlogCategories().pipe(
      catchError(() => of([]))
    ).subscribe((list: any[]) => {
      this.categories.set((list || []).map((c: any) => ({ id: c.id ?? c.Id, name: c.name ?? c.Name ?? '' })));
      this.isLoadingCategories.set(false);
      this.cdr.markForCheck();
    });
  }

  onCategoryChange(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId || null);
    if (!categoryId) {
      this.selectedCategoryName.set('Default (All Categories)');
    } else {
      const cat = this.categories().find(c => String(c.id) === String(categoryId));
      this.selectedCategoryName.set(cat?.name ?? 'Unknown');
    }
    this.loadContent();
  }

  private initializeForm(): void {
    this.loopMarketingForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      brand: ['', [Validators.required]],
      graphicText: ['', [Validators.required]],
      express: ['', [Validators.required]],
      tailor: ['', [Validators.required]],
      amplify: ['', [Validators.required]],
      evolve: ['', [Validators.required]],
      downloadButtonText: ['', [Validators.required]],
      learnMoreText: ['', [Validators.required]],
      downloadUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      learnMoreUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
    });
  }

  loadContent(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    const categoryId = this.selectedCategoryId();
    this.appService.getLoopMarketingContent(categoryId || undefined).pipe(
      catchError((err) => {
        this.loadError.set('Could not load Loop Marketing content. Ensure the backend is running and the LoopMarketingContents table exists.');
        this.loopMarketingForm.reset();
        this.currentContentId.set(undefined);
        this.isLoading.set(false);
        this.cdr.markForCheck();
        return of(null);
      })
    ).subscribe((res: any) => {
      if (!res) {
        this.isLoading.set(false);
        this.cdr.markForCheck();
        return;
      }
      // Support both camelCase and PascalCase from API
      const id = res.id ?? res.Id ?? '';
      const emptyGuid = '00000000-0000-0000-0000-000000000000';
      if (id && id !== emptyGuid) {
        this.currentContentId.set(id);
        this.loopMarketingForm.patchValue({
          title: res.title ?? res.Title ?? '',
          description: res.description ?? res.Description ?? '',
          brand: res.brand ?? res.Brand ?? '',
          graphicText: res.graphicText ?? res.GraphicText ?? '',
          express: res.expressFeature ?? res.ExpressFeature ?? '',
          tailor: res.tailorFeature ?? res.TailorFeature ?? '',
          amplify: res.amplifyFeature ?? res.AmplifyFeature ?? '',
          evolve: res.evolveFeature ?? res.EvolveFeature ?? '',
          downloadButtonText: res.downloadButtonText ?? res.DownloadButtonText ?? '',
          learnMoreText: res.learnMoreText ?? res.LearnMoreText ?? '',
          downloadUrl: res.downloadUrl ?? res.DownloadUrl ?? '',
          learnMoreUrl: res.learnMoreUrl ?? res.LearnMoreUrl ?? ''
        });
      } else {
        this.currentContentId.set(undefined);
        this.loopMarketingForm.reset();
      }
      this.isLoading.set(false);
      this.cdr.markForCheck();
    });
  }

  onSubmit(): void {
    if (this.loopMarketingForm.invalid) {
      this.markFormGroupTouched(this.loopMarketingForm);
      this.toasterService.showError('Please fill in all required fields correctly.');
      return;
    }
    const v = this.loopMarketingForm.value;
    const body = {
      categoryId: this.selectedCategoryId() || null,
      title: v.title,
      description: v.description,
      brand: v.brand,
      graphicText: v.graphicText,
      expressFeature: v.express,
      tailorFeature: v.tailor,
      amplifyFeature: v.amplify,
      evolveFeature: v.evolve,
      downloadButtonText: v.downloadButtonText,
      learnMoreText: v.learnMoreText,
      downloadUrl: v.downloadUrl,
      learnMoreUrl: v.learnMoreUrl
    };
    const id = this.currentContentId();
    this.isSaving.set(true);
    if (id) {
      this.appService.updateLoopMarketingContent(id, body).pipe(
        catchError(() => {
          this.toasterService.showError('Failed to save. Please try again.');
          this.isSaving.set(false);
          this.cdr.markForCheck();
          return of(null);
        })
      ).subscribe((updated: any) => {
        if (updated && updated.id) this.currentContentId.set(updated.id);
        this.toasterService.showSuccess('Loop Marketing content saved successfully.');
        this.isSaving.set(false);
        this.loadContent();
        this.cdr.markForCheck();
      });
    } else {
      this.appService.createLoopMarketingContent(body).pipe(
        catchError(() => {
          this.toasterService.showError('Failed to save. Please try again.');
          this.isSaving.set(false);
          this.cdr.markForCheck();
          return of(null);
        })
      ).subscribe((created: any) => {
        if (created && created.id) this.currentContentId.set(created.id);
        this.toasterService.showSuccess('Loop Marketing content saved successfully.');
        this.isSaving.set(false);
        this.loadContent();
        this.cdr.markForCheck();
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) this.markFormGroupTouched(control);
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loopMarketingForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.loopMarketingForm.get(fieldName);
    if (field?.hasError('required')) return `${fieldName} is required`;
    if (field?.hasError('pattern')) return 'Please enter a valid URL (http:// or https://)';
    return '';
  }
}
