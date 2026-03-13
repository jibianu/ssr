import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
// import DOMPurify from 'dompurify';

@Pipe({
    name: 'safeUrl',
    standalone: false
})
export class SafeUrlPipe implements PipeTransform {
    constructor(protected sanitizer: DomSanitizer) { }
    public transform(value: any): any {
        if (!value || typeof value !== 'string') return this.sanitizer.bypassSecurityTrustResourceUrl('');
        let url = String(value).trim();
        if (url.includes('youtube.com/embed/') || url.includes('youtu.be/') || url.includes('youtube.com/watch')) {
            url = this.ensureYoutubeRelParam(url);
        }
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    private ensureYoutubeRelParam(url: string): string {
        const isPlaylistEmbed = url.includes('videoseries');
        let baseUrl = url.split('?')[0];
        let videoId: string | null = null;
        const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        const ytEmbed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
        if (ytWatch) {
            videoId = ytWatch[1];
            baseUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (ytEmbed && ytEmbed[1] !== 'videoseries') {
            videoId = ytEmbed[1];
        }
        const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] || '' : '');
        params.set('rel', '0');
        if (videoId && !isPlaylistEmbed) {
            params.delete('list');
            params.set('playlist', videoId);
        }
        return `${baseUrl}?${params.toString()}`;
    }
}