// import { Injectable } from '@angular/core';
// import { Meta, MetaDefinition, Title } from '@angular/platform-browser';

// export interface PageMetadata {
//     title: string;
//     imageRelativeUrl: string;
//     description: string;
//     author: string;
//     type: string;
//     site: string;
//     domain: string;
//     image: string;
//     time: string;
//     updatedTime: string;
//     category: string;
//     imageHeight: number;
//     imageWidth: number;
//     seoUrl: string;
// }

// const defaultMetadata: PageMetadata = {
//     title: 'Oilandgasclub',
//     imageRelativeUrl: 'assets/oilandgasclub.png',
//     description: 'Start learning today with Oilandgasclub.com. Unlimited Access',
//     author: 'Anush',
//     type: 'oilandgasCourse',
//     site: 'oilandgasclub',
//     domain: 'www.oilandgasclub.com',
//     image: 'https://via.placeholder.com/468x300?text=oilandgasclub.com',
//     time: '',
//     updatedTime: '',
//     category: '',
//     imageHeight: 500,
//     imageWidth: 600,
//     seoUrl: ''
// }

// @Injectable({
//     providedIn: 'root'
// })
// export class MetadataService {
//     CanonicalService() {
//       throw new Error('Method not implemented.');
//     }
//     constructor(private metaTagService: Meta,
//         private titleService: Title
//     ) {
//     }

//     public updateMetadata(metadata: Partial<PageMetadata>, index: boolean = true): void {
//         const pageMetadata: PageMetadata = { ...defaultMetadata, ...metadata };
//         const metatags: MetaDefinition[] = this.generateMetaDefinitions(pageMetadata);
//         this.metaTagService.addTags([
//             { name: 'robots', content: index ? 'index, follow' : 'noindex' },
//             { name: 'viewport', content: 'width=device-width, initial-scale=1' },
//             { 'http-equiv': 'Content-Type', content: 'text/html; charset=utf-8' },
//             { name: "twitter:card", content: "summary_large_image" },
//         ], false);
//         if (metatags && metatags.length > 0) {
//             metatags.forEach(element => {
//                 this.metaTagService.updateTag(element)
//             })
//         }
//         this.titleService.setTitle(pageMetadata.title);
//     }

//     private generateMetaDefinitions(metadata: PageMetadata): MetaDefinition[] {
//         return [
//             { name: 'title', content: metadata.title },
//             { name: 'description', content: metadata.description },
//             { name: 'author', content: metadata.author },
            
//             { property: 'og:site_name', content: 'Oilandgasclub' },
//             { property: 'og:type', content: metadata.type },
//             { property: 'og:title', content: metadata.title },
//             { property: 'og:description', content: metadata.description },
//             { property: 'og:image', content: metadata.image },
//             { property: 'og:author', content: metadata.author },
//             { property: 'og:image:width', content: metadata.imageWidth.toString() },
//             { property: 'og:image:height', content: metadata.imageHeight.toString() },
//             { property: 'og:url', content: metadata.seoUrl },

//             { property: 'article:published_time', content: metadata.time },
//             { property: 'article:modified_time', content: metadata.updatedTime },
//             { property: 'article:tag', content: metadata.category },
//             { property: 'article:publisher', content:"https://www.facebook.com/oilandgasclub/" },

//             { name: 'twitter:title', content: metadata.title },
//             { name: 'twitter:description', content: metadata.description },
//             { name: 'twitter:image', content: metadata.image },
//             { name: 'twitter:domain', content: `${metadata.domain}` },
//             { name: 'twitter:label1', content: 'Anush' },
//             { name: 'twitter:data1', content: `${metadata.author}` },
//             { name: 'twitter:label2', content: 'Filed under' },
//             { name: 'twitter:data2', content: `${metadata.category}` },
//             { name: 'twitter:site', content: `${'@' + metadata.site}` },
//             { name: 'twitter:creator', content: `${'@' + metadata.author}` },
//             { name: 'twitter:url', content: metadata.seoUrl }
//         ]
//     }
// }

import { Injectable } from '@angular/core';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';

export interface PageMetadata {
    title: string;
    imageRelativeUrl?: string;
    description: string;
    author: string;
    type: string;
    site?: string;
    domain?: string;
    image: string;
    time?: string;              // For article:published_time
    updatedTime?: string;       // For article:modified_time
    category?: string;          // For article:tag
    imageHeight?: number;
    imageWidth?: number;
    seoUrl: string;
    robots?: string;
    canonicalUrl?: string;
}

const defaultMetadata: PageMetadata = {
    title: 'Oilandgasclub - Your Oil and Gas Learning Platform',
    imageRelativeUrl: 'assets/oilandgasclub.png',
    description: 'Start learning today with Oilandgasclub.com. Unlimited access to oil and gas courses and resources.',
    author: 'Anush',
    type: 'website',
    image: 'https://www.oilandgasclub.com/assets/images/og-image.jpg',
    imageWidth: 1200,
    imageHeight: 630,
    seoUrl: 'https://www.oilandgasclub.com',
    site: 'oilandgasclub',
    domain: 'www.oilandgasclub.com',
    robots: 'index, follow'
};

@Injectable({
    providedIn: 'root'
})
export class MetadataService {
    constructor(
        private meta: Meta,
        private title: Title
    ) {}

    /**
     * Update the page metadata and meta tags
     * @param metadata Partial metadata to override defaults
     * @param index Whether the page should be indexed by search engines
     */
    public updateMetadata(metadata: Partial<PageMetadata>, index: boolean = true): void {
        const mergedMetadata: PageMetadata = { ...defaultMetadata, ...metadata };
        mergedMetadata.robots = index ? 'index, follow' : 'noindex';

        this.updateTitle(mergedMetadata.title);
        this.updateMetaTags(mergedMetadata);
        
        if (mergedMetadata.canonicalUrl) {
            this.updateCanonicalUrl(mergedMetadata.canonicalUrl);
        }
    }

    private updateTitle(title: string): void {
        this.title.setTitle(title);
    }

    private updateMetaTags(metadata: PageMetadata): void {
        const tags: MetaDefinition[] = [
            // Standard meta tags
            { name: 'description', content: metadata.description },
            { name: 'author', content: metadata.author },
            { name: 'robots', content: metadata.robots },
            
            // Open Graph (Facebook) meta tags
            { property: 'og:title', content: metadata.title },
            { property: 'og:description', content: metadata.description },
            { property: 'og:type', content: metadata.type },
            { property: 'og:image', content: metadata.image },
            { property: 'og:url', content: metadata.seoUrl },
            { property: 'og:site_name', content: metadata.site || defaultMetadata.site },
            
            // Twitter Card meta tags
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: metadata.title },
            { name: 'twitter:description', content: metadata.description },
            { name: 'twitter:image', content: metadata.image },
            { name: 'twitter:site', content: `@${metadata.site || defaultMetadata.site}` },
            { name: 'twitter:creator', content: `@${metadata.author}` },
            { name: 'twitter:domain', content: metadata.domain || defaultMetadata.domain }
        ];

        // Optional meta tags
        if (metadata.imageWidth) {
            tags.push({ property: 'og:image:width', content: metadata.imageWidth.toString() });
        }
        
        if (metadata.imageHeight) {
            tags.push({ property: 'og:image:height', content: metadata.imageHeight.toString() });
        }
        
        if (metadata.time) {
            tags.push({ property: 'article:published_time', content: metadata.time });
        }
        
        if (metadata.updatedTime) {
            tags.push({ property: 'article:modified_time', content: metadata.updatedTime });
        }
        
        if (metadata.category) {
            tags.push({ property: 'article:tag', content: metadata.category });
        }

        // Update viewport and content type (these rarely change)
        this.meta.addTags([
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { 'http-equiv': 'Content-Type', content: 'text/html; charset=utf-8' }
        ]);

        // Update dynamic tags
        tags.forEach(tag => this.meta.updateTag(tag));
    }

    public updateCanonicalUrl(url: string): void {
        // Remove existing canonical link if it exists
        const existingCanonical = this.meta.getTag('rel="canonical"');
        if (existingCanonical) {
            this.meta.removeTagElement(existingCanonical);
        }

        // Add new canonical link
        this.meta.addTag({ rel: 'canonical', href: url });
    }
}