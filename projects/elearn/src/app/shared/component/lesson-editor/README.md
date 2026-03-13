# Custom LMS Lesson Editor

Block-based lesson editor without third-party editor libraries. Uses **contenteditable** for text and stores content as **structured JSON**.

## Features

- **Block types**: Text, Video, Quiz, Assignment
- **Modes**: Author (edit), Preview (read-only), Student (read-only with action placeholders)
- **Storage**: Lesson content is JSON stored in `StudyMaterial.Description` (backend `NVARCHAR(MAX)`)

## Component Structure

```
lesson-editor/
├── lesson-editor.module.ts      # Exports LessonEditorComponent
├── lesson-editor.component.*    # Main container (toolbar + blocks)
├── text-block/                  # contenteditable text
├── video-block/                 # YouTube/Vimeo embed
├── quiz-block/                  # Quiz / question set link
├── assignment-block/             # Assignment instructions + options
└── README.md
```

## Data Model

See `src/app/shared/models/lesson-content.model.ts`:

- **LessonContent**: `{ version: number, blocks: LessonBlock[] }`
- **LessonBlock**: TextBlock | VideoBlock | QuizBlock | AssignmentBlock
- **Helpers**: `parseLessonContent(description)`, `serializeLessonContent(content)`, `isLessonContentJson(value)`

## Usage

**Author mode (study material modal):**

```html
<app-lesson-editor
  [content]="item.controls.description.value"
  mode="author"
  (jsonChange)="item.controls.description.setValue($event)"
></app-lesson-editor>
```

**Student / Preview (view only):**

```html
<app-lesson-editor
  [content]="x.description"
  mode="student"
></app-lesson-editor>
```

## Backend

- **API**: No change. Study material still uses `CurriculumStudyMaterial` and `StudyMaterial`; `Description` holds either legacy HTML or JSON string.
- **DTO**: `Courses.Domain/DTO/LessonContent.cs` documents the JSON shape for validation/docs.
