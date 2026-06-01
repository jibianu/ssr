import { Component, HostListener, Input, OnChanges, OnDestroy, SimpleChanges, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminAppService } from '../../../modules/adminapp/adminapp.service';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  /**
   * Lesson video player inside the lesson-player shell.
   * Previously named VideoPlayerComponent.
   */
  selector: 'app-lesson-video',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss'],
  standalone: false,
})
export class LessonVideoComponent implements OnChanges, OnDestroy {
  @Input() curriculumId: string | null = null;
  @Input() lessonTitle: string | null = null;

  title = '';
  durationMinutes: number | null = null;
  videoSrc: string | null = null;
  videoProvider: 'local' | 'youtube' | null = null;
  loading = true;
  error = false;

  /** All video lectures in the current curriculum, flattened in order. */
  playlist: any[] = [];
  /** Index of the video currently playing within {@link playlist}. */
  currentVideoIndex = 0;
  /** Curriculum (lesson) title, used as a fallback for video title. */
  private curriculumTitle = '';

  /** Show "Swipe for prev/next" hint on mobile; dismissed on tap or after first swipe. */
  showSwipeHint = false;

  private subscription = new Subscription();
  private swipeStartX: number | null = null;
  private readonly swipeMinPx = 60;
  /** Throttle: save watch progress at most every 15 seconds. */
  private lastSavedSeconds = -1;
  private readonly progressSaveIntervalSeconds = 15;
  /** Prevent repeated autoplay attempts on multiple canplay events. */
  private didAutoplay = false;
  /** Prevent reloading the same lesson video multiple times. */
  private lastLoadedCurriculumId: string | null = null;

  constructor(
    private appService: AdminAppService,
    private playerState: PlayerStateService,
    private router: Router,
    private analyticsService: AnalyticsService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['curriculumId'] && this.curriculumId) {
      if (this.lastLoadedCurriculumId === this.curriculumId) return;
      this.lastLoadedCurriculumId = this.curriculumId;
      this.loadVideo();
    } else if (!this.curriculumId) {
      this.reset();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.showSwipeHintIfMobile(), 800);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onVideoMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      this.durationMinutes = Math.round(video.duration / 60);
    }
  }

  onVideoCanPlay(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (this.didAutoplay) return;
    if (video && typeof video.play === 'function') {
      this.didAutoplay = true;
      video.play().catch(() => {});
    }
    this.showSwipeHintIfMobile();
  }

  /** Throttled: save watch progress every ~15s and on ended. */
  onVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (!video || !this.curriculumId || !Number.isFinite(video.currentTime)) return;
    const seconds = Math.floor(video.currentTime);
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? Math.floor(video.duration) : undefined;
    if (seconds - this.lastSavedSeconds >= this.progressSaveIntervalSeconds || this.lastSavedSeconds < 0) {
      this.lastSavedSeconds = seconds;
      this.saveWatchProgress(seconds, duration);
    }
  }

  onVideoEnded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (!video || !this.curriculumId) return;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? Math.floor(video.duration) : undefined;
    this.lastSavedSeconds = duration ?? 0;
    this.saveWatchProgress(this.lastSavedSeconds, duration);
    // Auto-advance to the next video within the same curriculum.
    if (this.currentVideoIndex < this.playlist.length - 1) {
      this.goNext();
    }
  }

  private saveWatchProgress(secondsWatched: number, videoDurationSeconds?: number): void {
    if (!this.curriculumId) return;
    const payload = {
      curriculumId: this.curriculumId,
      secondsWatched,
      videoDurationSeconds: videoDurationSeconds ?? undefined
    };
    this.subscription.add(
      this.appService.saveCurriculumWatchProgress(payload).subscribe({
        error: () => { /* ignore; progress will retry on next timeupdate or ended */ }
      })
    );
    const progressPercent = videoDurationSeconds && videoDurationSeconds > 0
      ? Math.min(100, Math.round((secondsWatched / videoDurationSeconds) * 100))
      : 0;
    this.analyticsService.recordEvent('VideoProgress', 'Curriculum', this.curriculumId,
      JSON.stringify({ secondsWatched, videoDurationSeconds, progressPercent }));
    if (progressPercent >= 90) {
      this.analyticsService.recordEvent('LessonCompleted', 'Curriculum', this.curriculumId,
        JSON.stringify({ curriculumId: this.curriculumId, progressPercent }));
    }
  }

  /** Called when the video element fails to load (e.g. 404, network error). */
  onVideoError(): void {
    this.error = true;
    this.autoExitToCurriculum();
  }

  private loadVideo(): void {
    this.loading = true;
    this.error = false;
    this.title = '';
    this.durationMinutes = null;
    this.videoSrc = null;
    this.videoProvider = null;
    this.lastSavedSeconds = -1;
    this.didAutoplay = false;
    this.playlist = [];
    this.currentVideoIndex = 0;
    this.curriculumTitle = '';
    const id = this.curriculumId;
    this.subscription.add(
      this.appService.getCurriculumVideoByCurriculumId(id).subscribe({
        next: (res: any) => {
          this.loading = false;
          // Flatten every video lecture across all groups into one ordered playlist.
          const groups = Array.isArray(res) ? res : [];
          this.curriculumTitle = groups[0]?.title || '';
          const playlist: any[] = [];
          for (const group of groups) {
            for (const lecture of (group?.videoLectures || [])) {
              playlist.push(lecture);
            }
          }
          this.playlist = playlist;
          if (playlist.length > 0) {
            this.currentVideoIndex = 0;
            this.loadCurrentVideo();
            return;
          }
          this.error = true;
          this.autoExitToCurriculum();
        },
        error: () => {
          this.loading = false;
          this.error = true;
          this.autoExitToCurriculum();
        },
      })
    );
  }

  /** Loads the video at {@link currentVideoIndex} from the playlist into the player. */
  private loadCurrentVideo(): void {
    const v = this.playlist[this.currentVideoIndex];
    if (!v) {
      this.error = true;
      this.autoExitToCurriculum();
      return;
    }
    this.error = false;
    this.didAutoplay = false;
    this.lastSavedSeconds = -1;
    this.durationMinutes = null;
    this.title = v.title || this.curriculumTitle || 'Video';
    const link = v.videoLink || null;
    this.videoProvider = (link || '').includes('youtube') ? 'youtube' : 'local';
    this.videoSrc = this.videoProvider === 'local'
      ? this.getVideoSrc(link)
      : this.addYoutubeAutoplay(link);
  }

  getVideoSrc(url: string): string {
    if (!url || typeof url !== 'string') return '';
    if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
      return this.appService.apiUrl + 'api/CurriculumVideoLecture/StreamVideo?url=' + encodeURIComponent(url);
    }
    return url;
  }

  private addYoutubeAutoplay(url: string): string {
    if (!url || typeof url !== 'string') return url;
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 'autoplay=1';
  }

  private reset(): void {
    this.loading = false;
    this.error = false;
    this.title = '';
    this.durationMinutes = null;
    this.videoSrc = null;
    this.videoProvider = null;
    this.didAutoplay = false;
    this.playlist = [];
    this.currentVideoIndex = 0;
  }

  /** When no video is available or load fails, exit focus mode and go to curriculum page after a short delay. */
  private autoExitToCurriculum(): void {
    setTimeout(() => this.exit(), 1200);
  }

  exit(): void {
    const lessonId = this.curriculumId;
    const redirectTo = this.playerState.getRedirectTo();
    this.playerState.exitFocusMode();
    if (lessonId && redirectTo) {
      this.router.navigate(['/app', redirectTo, 'details', 'curriculum-details', lessonId]);
    }
  }

  goNext(): void {
    // Step through the videos in this curriculum first, then move to the next lesson.
    if (this.currentVideoIndex < this.playlist.length - 1) {
      this.currentVideoIndex++;
      this.loadCurrentVideo();
      return;
    }
    const nextId = this.playerState.getNextLessonId();
    if (nextId) {
      this.playerState.setCurrentLessonId(nextId);
      this.router.navigate(['/app', this.playerState.getRedirectTo(), 'details', 'curriculum-details', nextId]);
    }
  }

  goPrev(): void {
    if (this.currentVideoIndex > 0) {
      this.currentVideoIndex--;
      this.loadCurrentVideo();
      return;
    }
    const prevId = this.playerState.getPrevLessonId();
    if (prevId) {
      this.playerState.setCurrentLessonId(prevId);
      this.router.navigate(['/app', this.playerState.getRedirectTo(), 'details', 'curriculum-details', prevId]);
    }
  }

  toggleFullPage(): void {
    this.playerState.toggleFullPage();
  }

  get hasNext(): boolean {
    return this.currentVideoIndex < this.playlist.length - 1 || this.playerState.getNextLessonId() != null;
  }

  get hasPrev(): boolean {
    return this.currentVideoIndex > 0 || this.playerState.getPrevLessonId() != null;
  }

  /** Number of videos in the current curriculum's playlist. */
  get videoCount(): number {
    return this.playlist.length;
  }

  /** 1-based position of the current video within the curriculum playlist. */
  get currentVideoNumber(): number {
    return this.currentVideoIndex + 1;
  }

  /** 1-based lesson number for display; falls back to 1 when index is unknown. */
  get currentLessonNumber(): number {
    const idx = this.playerState.getCurrentLessonIndex();
    return idx >= 0 ? idx + 1 : 1;
  }

  /** Total lessons in the current playlist; used for \"Lesson X of Y\" and progress. */
  get totalLessons(): number {
    return this.playerState.getLessonCount() || 0;
  }

  /** Overall progress percentage across lessons (current index / total). */
  get progressPercent(): number {
    const total = this.totalLessons;
    if (!total) return 0;
    const idx = this.playerState.getCurrentLessonIndex();
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / total) * 100);
  }

  /** Allow Left/Right arrow keys to navigate between lessons while in focus mode. */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight' && this.hasNext) {
      event.preventDefault();
      this.goNext();
    } else if (event.key === 'ArrowLeft' && this.hasPrev) {
      event.preventDefault();
      this.goPrev();
    }
  }

  /** Swipe: record start X (first touch). */
  onSwipeStart(event: TouchEvent): void {
    if (event.changedTouches?.length) {
      this.swipeStartX = event.changedTouches[0].clientX;
    }
  }

  /** Swipe: on end, if horizontal delta is large enough, go prev (swipe right) or next (swipe left). */
  onSwipeEnd(event: TouchEvent): void {
    if (this.swipeStartX == null || !event.changedTouches?.length) return;
    const endX = event.changedTouches[0].clientX;
    const deltaX = endX - this.swipeStartX;
    this.swipeStartX = null;
    if (Math.abs(deltaX) < this.swipeMinPx) return;
    this.showSwipeHint = false;
    if (deltaX > 0 && this.hasPrev) {
      this.goPrev();
    } else if (deltaX < 0 && this.hasNext) {
      this.goNext();
    }
  }

  /** Dismiss swipe hint on tap (mobile). */
  dismissSwipeHint(): void {
    this.showSwipeHint = false;
  }

  /** Call from template or after view init to show hint on touch-capable devices. */
  showSwipeHintIfMobile(): void {
    const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
    const narrow = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isTouch && narrow && (this.hasNext || this.hasPrev)) {
      this.showSwipeHint = true;
      setTimeout(() => (this.showSwipeHint = false), 5000);
    }
  }
}
