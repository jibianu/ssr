import { AfterViewInit, Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appAutoGrow]',
  standalone: true
})
export class AutoGrowDirective implements AfterViewInit, OnDestroy {
  @Input() appAutoGrow = true;

  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.elementRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }

  @HostListener('input')
  @HostListener('keyup')
  @HostListener('paste')
  onInput(): void {
    this.resize();
  }

  private resize(): void {
    if (!this.appAutoGrow) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      const el = this.elementRef.nativeElement;
      // Reset height to compute correct scrollHeight
      el.style.height = 'auto';
      const next = el.scrollHeight;
      el.style.height = `${next}px`;
      el.style.overflow = 'hidden';
    });
  }
}
