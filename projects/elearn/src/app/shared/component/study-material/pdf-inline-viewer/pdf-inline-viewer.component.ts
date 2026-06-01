import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  NgZone,
  ViewChildren,
  QueryList,
  ElementRef
} from '@angular/core';
import './pdf-promise.polyfill';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { StudyMaterialFileService } from '../../../services/study-material-file.service';
import { firstValueFrom, Subscription } from 'rxjs';

/**
 * Lazily load pdfjs so the heavy library is split into its own chunk and only
 * downloaded when a PDF is actually displayed (keeps the curriculum route fast).
 */
let pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null;
function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.mjs';
      return lib;
    });
  }
  return pdfjsLibPromise;
}

interface PdfPage {
  pageNumber: number;
  /** Rendered image data URL, null until the page scrolls into view. */
  src: string | null;
  /** CSS-pixel dimensions used for the placeholder so layout doesn't jump. */
  width: number;
  height: number;
}

@Component({
  selector: 'app-pdf-inline-viewer',
  templateUrl: './pdf-inline-viewer.component.html',
  styleUrls: ['./pdf-inline-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PdfInlineViewerComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() url = '';
  /** Preferred: load via API proxy (same origin, no S3 CORS). */
  @Input() fileId = '';

  loading = true;
  error = '';
  pages: PdfPage[] = [];
  loadProgress = '';

  @ViewChildren('pageEl') pageEls!: QueryList<ElementRef<HTMLElement>>;

  private pdfDoc: PDFDocumentProxy | null = null;
  private loadToken = 0;
  private renderWidth = 720;
  /** Default A4 portrait ratio used for placeholders until a page renders. */
  private readonly defaultRatio = 1.414;

  private observer: IntersectionObserver | null = null;
  private viewChildrenSub: Subscription | null = null;
  private readonly queued = new Set<number>();
  private readonly renderQueue: number[] = [];
  private processing = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private fileService: StudyMaterialFileService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url'] || changes['fileId']) {
      void this.loadPdf();
    }
  }

  ngAfterViewInit(): void {
    // Re-observe page elements whenever the list of pages changes.
    this.viewChildrenSub = this.pageEls.changes.subscribe(() => this.observePages());
    this.observePages();
  }

  ngOnDestroy(): void {
    this.loadToken++;
    this.teardownObserver();
    this.viewChildrenSub?.unsubscribe();
    void this.pdfDoc?.destroy();
    this.pdfDoc = null;
  }

  private async loadPdf(): Promise<void> {
    const token = ++this.loadToken;
    this.loading = true;
    this.error = '';
    this.pages = [];
    this.queued.clear();
    this.renderQueue.length = 0;
    this.teardownObserver();
    this.loadProgress = 'Preparing document…';
    this.renderWidth = this.computeRenderWidth();
    this.cdr.markForCheck();

    if (!this.fileId?.trim() && !this.url?.trim()) {
      this.loading = false;
      this.error = 'No document URL.';
      this.cdr.markForCheck();
      return;
    }

    try {
      await this.pdfDoc?.destroy();
      this.pdfDoc = null;

      const { getDocument } = await loadPdfjs();
      if (token !== this.loadToken) return;

      let pdf: PDFDocumentProxy;
      const id = (this.fileId || '').trim();
      const url = (this.url || '').trim();
      const emptyGuid = '00000000-0000-0000-0000-000000000000';
      try {
        const data = await firstValueFrom(this.fileService.getFileContent(id, url));
        if (token !== this.loadToken) return;
        pdf = await getDocument({ data }).promise;
      } catch (apiErr) {
        if (url && id && id !== emptyGuid) {
          const data = await firstValueFrom(this.fileService.getFileContent('', url));
          if (token !== this.loadToken) return;
          pdf = await getDocument({ data }).promise;
        } else {
          throw apiErr;
        }
      }
      if (token !== this.loadToken) {
        await pdf.destroy();
        return;
      }
      this.pdfDoc = pdf;

      // Build lightweight placeholders for every page (no rasterization yet).
      const total = pdf.numPages;
      const placeholderHeight = Math.round(this.renderWidth * this.defaultRatio);
      const pages: PdfPage[] = [];
      for (let n = 1; n <= total; n++) {
        pages.push({ pageNumber: n, src: null, width: this.renderWidth, height: placeholderHeight });
      }
      this.pages = pages;
      this.loading = false;
      this.loadProgress = '';
      this.cdr.markForCheck();

      // Observe the freshly-created placeholders so visible pages render.
      this.observePages();
    } catch (e) {
      if (token !== this.loadToken) return;
      console.error('PDF inline load failed', e);
      this.loading = false;
      this.error = 'Unable to display this PDF inline. Please contact your instructor.';
      this.loadProgress = '';
      this.cdr.markForCheck();
    }
  }

  /** (Re)attach an IntersectionObserver to each page placeholder. */
  private observePages(): void {
    if (typeof IntersectionObserver === 'undefined' || !this.pageEls) {
      // Fallback: no observer support – render everything once.
      this.pages.forEach((p) => this.enqueuePage(p.pageNumber));
      return;
    }
    this.teardownObserver();
    this.ngZone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const n = Number((entry.target as HTMLElement).dataset['page']);
            if (n) {
              this.enqueuePage(n);
              this.observer?.unobserve(entry.target);
            }
          }
        },
        // Pre-render pages slightly before they enter the viewport.
        { root: null, rootMargin: '800px 0px', threshold: 0.01 }
      );
      this.pageEls.forEach((ref) => this.observer?.observe(ref.nativeElement));
    });
  }

  private teardownObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private enqueuePage(pageNumber: number): void {
    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    if (!page || page.src || this.queued.has(pageNumber)) return;
    this.queued.add(pageNumber);
    this.renderQueue.push(pageNumber);
    void this.processQueue();
  }

  /** Render queued pages one at a time to keep the main thread responsive. */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    await this.ngZone.runOutsideAngular(async () => {
      while (this.renderQueue.length) {
        const pageNumber = this.renderQueue.shift()!;
        await this.renderPage(pageNumber);
      }
    });
    this.processing = false;
  }

  private async renderPage(pageNumber: number): Promise<void> {
    const token = this.loadToken;
    const pdf = this.pdfDoc;
    if (!pdf || token !== this.loadToken) return;
    const page = this.pages.find((p) => p.pageNumber === pageNumber);
    if (!page || page.src) return;

    try {
      const pdfPage = await pdf.getPage(pageNumber);
      if (token !== this.loadToken) return;
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const cssScale = this.renderWidth / baseViewport.width;
      const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
      const viewport = pdfPage.getViewport({ scale: cssScale * dpr });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        pdfPage.cleanup();
        return;
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
      if (token !== this.loadToken) return;
      const src = canvas.toDataURL('image/jpeg', 0.85);
      pdfPage.cleanup();

      this.ngZone.run(() => {
        page.src = src;
        page.width = Math.round(this.renderWidth);
        page.height = Math.round(this.renderWidth * (baseViewport.height / baseViewport.width));
        this.cdr.markForCheck();
      });
    } catch (e) {
      console.error('PDF page render failed', pageNumber, e);
    }
  }

  /** Render at the available container width so pages fill the area (no side gaps) and stay crisp. */
  private computeRenderWidth(): number {
    const measured = this.host?.nativeElement?.clientWidth || 0;
    const fallback = typeof window !== 'undefined' ? window.innerWidth : 720;
    const width = measured > 0 ? measured : fallback;
    return Math.max(320, Math.min(1400, Math.round(width)));
  }

  onContextMenu(event: Event): void {
    event.preventDefault();
  }
}
