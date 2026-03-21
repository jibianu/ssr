import { Pipe, PipeTransform } from '@angular/core';
import { fixUtf8Mojibake } from '../utils/fix-mojibake';

/**
 * Fixes UTF-8 mojibake when text was misinterpreted as Windows-1252
 * (e.g. smart apostrophe shows as â€™). Use for display of user-generated content.
 */
@Pipe({
  name: 'fixMojibake',
  standalone: false
})
export class FixMojibakePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return fixUtf8Mojibake(value);
  }
}
