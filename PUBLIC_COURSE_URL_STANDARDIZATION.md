# Public course URL standardization

All public course URLs use **one format only**: **`/courses/:slug`**.

## Final result

- **Canonical:** `https://oilandgasclub.com/courses/api-570-closed-book-mock-exam-comprehensive-preparation`
- **Local dev (Site):** `http://localhost:4200/courses/process-design-interview-questions`

## What was done

### 1. Elearn app (SPA – e.g. /Elearn or port 4201)

- **Removed** the `/courses` route. Elearn no longer serves any public course page.
- **Redirect:** Old route `app/student/category-courses-description/:courseID` now redirects to the **Site** app: `{publicCourseSiteUrl}/courses/:courseID` (e.g. `https://www.oilandgasclub.com/courses/:slug` in prod, `http://localhost:4200/courses/:slug` in dev).
- Elearn only handles authenticated/app routes (e.g. `/Elearn/dashboard`, `/Elearn/app/student/...`).

### 2. Site app (SSR – port 4200 or /)

- **Added** routes: `courses/:url` and `courses/:url/:location` (load `PublicCourseDetailsComponent`).
- **Removed** root-level matchers for `:url` and `:url/:location`. No more `/:slug` for courses.
- **Canonical:** Set to `https://oilandgasclub.com/courses/:slug` (or `environment.seoUrl + '/courses/' + slug`) in the public course details component.
- All internal links (home, list, category, related courses) use `/courses/:slug`.

### 3. Backend

- Public course API should be **`GET /api/public/courses/{slug}`**. Slug must be unique in the Courses table.

### 4. NGINX (production)

Route as follows:

- `/api` → .NET Core (backend)
- `/Elearn` → Angular Elearn SPA (no public course routes)
- `/` → Angular Site SSR (handles `/courses/*` and all other public pages)

All `/courses/*` must be served by the **Site** app (SSR).
