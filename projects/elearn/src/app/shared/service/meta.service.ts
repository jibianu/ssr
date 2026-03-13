import { Injectable } from '@angular/core';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';

export interface PageMetadata {
    title: string;
    imageRelativeUrl: string;
    description: string;
    author: string;
    type: string;
    site: string;
    domain: string;
    image: string;
    time: string;
    updatedTime: string;
    category: string;
    imageHeight: number;
    imageWidth: number;
    seoUrl: string;
}

const defaultMetadata: PageMetadata = {
    title: 'App Title',
    imageRelativeUrl: 'og-default.png',
    description: 'App description',
    author: 'Anush',
    type: 'article',
    site: 'ogsite',
    domain: 'blog.ogsite.com',
    image: 'https://via.placeholder.com/468x300?text=ono.blog.com',
    time: '',
    updatedTime: '',
    category: '',
    imageHeight: 500,
    imageWidth: 600,
    seoUrl: ''
}

@Injectable()
export class MetadataService {
    constructor(private metaTagService: Meta,
        private titleService: Title
    ) {
    }

    public updateMetadata(metadata: Partial<PageMetadata>, index: boolean = true): void {
        const pageMetadata: PageMetadata = { ...defaultMetadata, ...metadata };
        const metatags: MetaDefinition[] = this.generateMetaDefinitions(pageMetadata);
        this.metaTagService.addTags([
            ...metatags,
            { name: 'robots', content: index ? 'index, follow' : 'noindex' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { 'http-equiv': 'Content-Type', content: 'text/html; charset=utf-8' },
            { name: "twitter:card", content: "summary_large_image" },

        ], false);

        this.titleService.setTitle(pageMetadata.title);
    }

    private generateMetaDefinitions(metadata: PageMetadata): MetaDefinition[] {
        return [
            { name: 'title', content: metadata.title },
            { name: 'description', content: metadata.description },
            { name: 'author', content: metadata.author },
            
            { property: 'og:site_name', content: 'Onospot Blog' },
            { property: 'og:type', content: metadata.type },
            { property: 'og:title', content: metadata.title },
            { property: 'og:description', content: metadata.description },
            { property: 'og:image', content: metadata.image },
            { property: 'og:author', content: metadata.author },
            { property: 'og:image:width', content: metadata.imageWidth.toString() },
            { property: 'og:image:height', content: metadata.imageHeight.toString() },
            { property: 'og:url', content: metadata.seoUrl },

            { property: 'article:published_time', content: metadata.time },
            { property: 'article:modified_time', content: metadata.updatedTime },
            { property: 'article:tag', content: metadata.category },
            { property: 'article:publisher', content: '' },

            { name: 'twitter:title', content: metadata.title },
            { name: 'twitter:description', content: metadata.description },
            { name: 'twitter:image', content: metadata.image },
            { name: 'twitter:domain', content: `${metadata.domain}` },
            { name: 'twitter:label1', content: 'Written by' },
            { name: 'twitter:data1', content: `${metadata.author}` },
            { name: 'twitter:label2', content: 'Filed under' },
            { name: 'twitter:data2', content: `${metadata.category}` },
            { name: 'twitter:site', content: `${'@' + metadata.site}` },
            { name: 'twitter:creator', content: `${'@' + metadata.author}` },
            { name: 'twitter:url', content: metadata.seoUrl }
        ]
    }
}