import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// ✅ PERFORMANCE: Use BehaviorSubject to notify components of toast changes (required for OnPush)
@Injectable({
  providedIn: 'root'
})
export class ToasterService {
  private toastsSubject = new BehaviorSubject<any[]>([]);
  // ✅ PERFORMANCE: Observable for components using OnPush change detection
  toasts$ = this.toastsSubject.asObservable();

  // ✅ PERFORMANCE: Keep array for backward compatibility, but use Subject for reactivity
  get toasts(): any[] {
    return this.toastsSubject.value;
  }

  constructor() { }

  // ✅ PERFORMANCE: Create new array reference for change detection (required for OnPush)
  private updateToasts(newToasts: any[]): void {
    this.toastsSubject.next([...newToasts]);
  }

  showSuccess(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    options.classname = 'bg-success text-light';
    options.delay = 2000;
    options.autohide = true;
    options.header = 'Success';
    options.id = options.id || `toast-${Date.now()}-${Math.random()}`; // ✅ HYDRATION: Unique ID for SSR safety
    const updatedToasts = [...this.toasts, { textOrTpl, ...options }];
    this.updateToasts(updatedToasts);
  }

  showError(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    options.classname = 'bg-danger text-light';
    options.delay = 5000;
    options.autohide = true;
    options.header = 'Error';
    options.id = options.id || `toast-${Date.now()}-${Math.random()}`; // ✅ HYDRATION: Unique ID for SSR safety
    const updatedToasts = [...this.toasts, { textOrTpl, ...options }];
    this.updateToasts(updatedToasts);
  }

  remove(toast: any): void {
    // ✅ PERFORMANCE: Create new array reference for change detection
    const updatedToasts = this.toasts.filter(t => t !== toast);
    this.updateToasts(updatedToasts);
  }
}
