// import { Injectable, Inject } from '@angular/core';
// import { DOCUMENT } from '@angular/common';

// @Injectable({
//   providedIn: 'root'
// })

// export class CanonicalService {

//   constructor(@Inject(DOCUMENT) private dom) { }

//   setCanonicalURL(url?: string) {
//     const canURL = url == undefined ? this.dom.URL : url;
//     const link: HTMLLinkElement = this.dom.createElement('link');
//     link.setAttribute('rel', 'canonical');
//     this.dom.head.appendChild(link);
//     link.setAttribute('href', canURL);
//   }

//   getURL(){
//     const canURL =  this.dom.URL;
//     return canURL;
//   }

// }


import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CanonicalService {
  constructor(@Inject(DOCUMENT) private readonly document: Document) { }

  /**
   * Sets the canonical URL for the page
   * @param url The URL to set as canonical (defaults to current document URL if not provided)
   */
  setCanonicalURL(url?: string): void {
    try {
      const canonicalUrl = url ?? this.document.URL;
      
      // Remove existing canonical link if it exists
      this.removeExistingCanonicalLink();
      
      // Create new canonical link
      const link: HTMLLinkElement = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl);
      
      this.document.head.appendChild(link);
    } catch (error) {
      console.error('Error setting canonical URL:', error);
    }
  }

  /**
   * Gets the current document URL
   * @returns The current document URL
   */
  getURL(): string {
    return this.document.URL;
  }

  /**
   * Removes any existing canonical link from the document head
   */
  private removeExistingCanonicalLink(): void {
    const existingLinks = this.document.head.querySelectorAll('link[rel="canonical"]');
    existingLinks.forEach(link => link.remove());
  }
}

