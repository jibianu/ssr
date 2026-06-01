import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CustomRichTextEditorComponent } from './custom-rich-text-editor.component';
import { sanitizeEditorHtml } from './utils/html-sanitizer.util';

/**
 * Example usage of the custom rich text editor with Reactive Forms.
 * Import this component in a route or parent template for local testing.
 */
@Component({
  selector: 'app-custom-rich-text-editor-example',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomRichTextEditorComponent],
  template: `
    <div class="rte-example">
      <h2>Custom Rich Text Editor — Example</h2>

      <form [formGroup]="form" (ngSubmit)="onSave()">
        <app-custom-rich-text-editor
          [title]="form.get('title')?.value"
          (titleChange)="form.patchValue({ title: $event })"
          formControlName="body"
          titlePlaceholder="Title"
          bodyPlaceholder="Write hear"
        ></app-custom-rich-text-editor>

        <div class="rte-example__actions">
          <button type="submit" class="btn btn-primary">Save HTML</button>
          <button type="button" class="btn btn-outline-secondary" (click)="loadSample()">Load sample</button>
        </div>
      </form>

      <section class="rte-example__output" *ngIf="savedHtml">
        <h3>Saved output (sanitized)</h3>
        <pre>{{ savedHtml }}</pre>
        <div class="rte-example__preview post-body" [innerHTML]="savedHtml"></div>
      </section>
    </div>
  `,
  styles: [
    `
      .rte-example {
        max-width: 760px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .rte-example__actions {
        display: flex;
        gap: 8px;
        margin-top: 1rem;
      }
      .rte-example__output {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #e8e8e8;
      }
      .rte-example__output pre {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 8px;
        font-size: 12px;
        overflow: auto;
        max-height: 200px;
      }
    `
  ]
})
export class CustomRichTextEditorExampleComponent {
  form = new FormGroup({
    title: new FormControl(''),
    body: new FormControl('')
  });

  savedHtml = '';

  onSave(): void {
    const body = this.form.get('body')?.value ?? '';
    this.savedHtml = sanitizeEditorHtml(body);
  }

  loadSample(): void {
    this.form.patchValue({
      title: 'Sample study material',
      body: '<p>Start writing your <strong>study material</strong> here.</p><ul><li>Point one</li><li>Point two</li></ul>'
    });
  }
}
