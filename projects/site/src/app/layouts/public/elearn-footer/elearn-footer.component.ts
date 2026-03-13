import { Component } from '@angular/core';

/**
 * Footer for Elearn layout (elearn/course/:id).
 */
@Component({
  selector: 'app-elearn-footer',
  standalone: true,
  template: `
    <footer class="elearn-footer">
      <div class="elearn-footer__inner">
        <span class="elearn-footer__copy">&copy; {{ year }} Oilandgasclub. All rights reserved.</span>
      </div>
    </footer>
  `,
  styles: [`
    .elearn-footer {
      padding: 12px 20px;
      border-top: 1px solid #e5e7eb;
      background: #fff;
    }
    .elearn-footer__inner { max-width: 1280px; margin: 0 auto; }
    .elearn-footer__copy { font-size: 0.8125rem; color: #6b7280; }
  `]
})
export class ElearnFooterComponent {
  readonly year = new Date().getFullYear();
}
