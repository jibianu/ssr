export type BlockFormat = 'p' | 'h1' | 'h2' | 'h3';

export type EditorCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'link'
  | 'image'
  | 'undo'
  | 'redo'
  | 'formatBlock';

export interface EditorSnapshot {
  titleHtml: string;
  bodyHtml: string;
}

export interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  blockFormat: BlockFormat;
  canUndo: boolean;
  canRedo: boolean;
}

export const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  codeBlock: false,
  blockFormat: 'p',
  canUndo: false,
  canRedo: false
};

export const BLOCK_FORMAT_LABELS: Record<BlockFormat, string> = {
  p: 'Normal',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3'
};
