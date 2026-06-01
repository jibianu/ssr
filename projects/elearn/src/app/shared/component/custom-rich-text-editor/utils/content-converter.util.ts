import { isLessonContentJson, parseLessonContent, TextBlock } from '../../../models/lesson-content.model';
import { sanitizeEditorHtml } from './html-sanitizer.util';

/** Normalize stored description (HTML or legacy JSON blocks) to HTML for the custom editor. */
export function studyMaterialDescriptionToHtml(description: string | null | undefined): string {
  if (!description?.trim()) return '';
  if (isLessonContentJson(description)) {
    const content = parseLessonContent(description);
    const parts = content.blocks
      .filter((b): b is TextBlock => b.type === 'text')
      .map((b) => b.content?.trim())
      .filter(Boolean);
    return sanitizeEditorHtml(parts.join(''));
  }
  return sanitizeEditorHtml(description);
}

/** True when editor body has visible content. */
export function isEditorHtmlEmpty(html: string | null | undefined): boolean {
  if (!html?.trim()) return true;
  const stripped = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/&nbsp;/gi, '')
    .trim();
  return !stripped;
}
