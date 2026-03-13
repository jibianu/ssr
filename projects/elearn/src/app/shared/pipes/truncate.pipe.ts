import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure pipe: truncates text to a max length with optional suffix.
 * Use in tables/lists to avoid long text layout issues and reduce re-evaluation (pure).
 */
@Pipe({
  name: 'truncate',
  standalone: false,
  pure: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, maxLength: number, suffix: string = '…'): string {
    if (value == null || value === '') {
      return '';
    }
    const s = String(value);
    if (maxLength <= 0 || s.length <= maxLength) {
      return s;
    }
    return s.slice(0, maxLength).trim() + suffix;
  }
}
