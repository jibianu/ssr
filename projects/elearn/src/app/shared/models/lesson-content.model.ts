/**
 * LMS Lesson content – block-based structure stored as JSON.
 * Used by custom lesson editor (no third-party editor).
 */

export type LessonBlockType = 'text' | 'video' | 'quiz' | 'assignment';

export interface LessonBlockBase {
  id: string;
  type: LessonBlockType;
  sortOrder: number;
}

export interface TextBlock extends LessonBlockBase {
  type: 'text';
  /** HTML from contenteditable; stored as-is. */
  content: string;
  /** Block-level image URL (from uploadImage API); stored in S3. */
  imageUrl?: string | null;
}

export interface VideoBlock extends LessonBlockBase {
  type: 'video';
  /** YouTube/Vimeo URL or embed URL */
  url: string;
  title?: string;
  caption?: string;
}

export interface QuizBlock extends LessonBlockBase {
  type: 'quiz';
  /** Question set or quiz ID from backend */
  quizId?: string;
  title?: string;
  instructions?: string;
}

export interface AssignmentBlock extends LessonBlockBase {
  type: 'assignment';
  title?: string;
  instructions: string;
  /** Optional file upload or external link requirement */
  allowFileUpload?: boolean;
  allowExternalLink?: boolean;
}

export type LessonBlock = TextBlock | VideoBlock | QuizBlock | AssignmentBlock;

export interface LessonContent {
  version: number;
  blocks: LessonBlock[];
}

export const LESSON_CONTENT_VERSION = 1;

export const EMPTY_LESSON_CONTENT: LessonContent = {
  version: LESSON_CONTENT_VERSION,
  blocks: []
};

/** Detect if a string is our lesson JSON (has version + blocks array). */
export function isLessonContentJson(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return (
      parsed !== null &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      Array.isArray((parsed as LessonContent).blocks)
    );
  } catch {
    return false;
  }
}

/** Parse description to LessonContent; fallback to single text block or empty. */
export function parseLessonContent(description: string | null | undefined): LessonContent {
  if (!description) return { ...EMPTY_LESSON_CONTENT };
  if (isLessonContentJson(description)) {
    try {
      const parsed = JSON.parse(description) as LessonContent;
      return {
        version: parsed.version ?? LESSON_CONTENT_VERSION,
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : []
      };
    } catch {
      return { ...EMPTY_LESSON_CONTENT };
    }
  }
  // Legacy: plain HTML/text as single text block
  return {
    version: LESSON_CONTENT_VERSION,
    blocks: [
      {
        id: generateBlockId(),
        type: 'text',
        sortOrder: 0,
        content: description,
        imageUrl: null
      }
    ]
  };
}

/** Serialize lesson content to JSON string for storage in description. */
export function serializeLessonContent(content: LessonContent): string {
  return JSON.stringify({
    version: content.version,
    blocks: content.blocks
  });
}

export function generateBlockId(): string {
  return 'b_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}
