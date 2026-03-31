import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-worlds-largest-refineries',
  templateUrl: './worlds-largest-refineries.component.html',
  styleUrls: ['./worlds-largest-refineries.component.scss'],
  standalone: false
})
export class WorldsLargestRefineriesComponent implements OnInit {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('World\'s Largest Refineries | Oilandgasclub');
    this.metaService.addTags([
      {
        name: 'description',
        content:
          'Explore the world\'s largest refineries and their role in global oil and gas supply. Educational overview from Oilandgasclub.'
      },
      { name: 'robots', content: 'index, follow' }
    ]);
    this.setCanonicalURL('https://www.oilandgasclub.com/worlds-largest-refineries');
  }

  private setCanonicalURL(url: string): void {
    const existing = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (existing) {
      existing.setAttribute('href', url);
    } else {
      const link = this.renderer.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.renderer.appendChild(this.document.head, link);
    }
  }
}
