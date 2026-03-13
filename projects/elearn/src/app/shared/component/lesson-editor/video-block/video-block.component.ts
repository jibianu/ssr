import { Component, Input, Output, EventEmitter } from '@angular/core';
import { VideoBlock } from '../../../models/lesson-content.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export type VideoBlockMode = 'author' | 'preview' | 'student';

@Component({
    selector: 'app-video-block',
    templateUrl: './video-block.component.html',
    styleUrls: ['./video-block.component.scss'],
    standalone: false
})
export class VideoBlockComponent {
  @Input() block: VideoBlock;
  @Input() mode: VideoBlockMode = 'author';
  @Output() blockChange = new EventEmitter<Partial<VideoBlock>>();

  constructor(private sanitizer: DomSanitizer) {}

  get embedUrl(): SafeResourceUrl | null {
    const url = this.block?.url;
    if (!url) return null;
    const embed = this.toEmbedUrl(url);
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  }

  private toEmbedUrl(url: string): string | null {
    const u = url.trim();
    // YouTube single video
    const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      const vid = ytMatch[1];
      return `https://www.youtube.com/embed/${vid}?rel=0&playlist=${vid}`;
    }
    // YouTube embed URL - add rel=0 and playlist for single videos
    const ytEmbed = u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (ytEmbed && !u.includes('videoseries')) {
      const vid = ytEmbed[1];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] || '' : '');
      params.set('rel', '0');
      params.set('playlist', vid);
      return `https://www.youtube.com/embed/${vid}?${params.toString()}`;
    }
    // YouTube playlist
    if (u.includes('videoseries') || u.includes('list=')) {
      const m = u.match(/(https?:\/\/[^"?]+\/embed\/[^"?]+)/);
      if (m) {
        const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] || '' : '');
        params.set('rel', '0');
        return `${m[1]}?${params.toString()}`;
      }
    }
    // Vimeo
    const vimeoMatch = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  }

  onUrlChange(value: string): void {
    this.blockChange.emit({ url: value });
  }

  onTitleChange(value: string): void {
    this.blockChange.emit({ title: value });
  }

  onCaptionChange(value: string): void {
    this.blockChange.emit({ caption: value });
  }

  get isEditable(): boolean {
    return this.mode === 'author';
  }
}
