import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { fixUtf8Mojibake } from '../utils/fix-mojibake';

/** Use with [innerHTML]: fixes mojibake then sanitizes to SafeHtml. */
@Pipe({
  name: 'fixMojibakeSafeHtml',
  standalone: false
})
export class FixMojibakeSafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: string | null | undefined): SafeHtml {
    const fixed = fixUtf8Mojibake(value);
    return fixed ? this.sanitizer.bypassSecurityTrustHtml(fixed) : this.sanitizer.bypassSecurityTrustHtml('');
  }
}
