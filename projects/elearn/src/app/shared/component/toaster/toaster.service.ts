import { Injectable, TemplateRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToasterService {

  toasts: any[] = [];

  constructor(
  ) { }

  showSuccess(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    options.classname = 'bg-success text-light';
    options.delay = 2000;
    options.autohide = true;
    options.header = 'Success';
    this.toasts.push({ textOrTpl, ...options });
  }

  showError(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    options.classname = 'bg-danger text-light';
    options.delay = 5000;
    options.autohide = true;
    options.header = 'Error';
    this.toasts.push({ textOrTpl, ...options });
  }

  remove(toast) {
    console.log(toast);
    this.toasts = this.toasts.filter(t => t !== toast);
  }
}
