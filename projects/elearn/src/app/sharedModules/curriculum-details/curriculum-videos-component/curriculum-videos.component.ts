import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

/** In-memory cache to avoid refetching videos when revisiting the same curriculum. */
const videoCache = new Map<string, any[]>();

@Component({
    selector: 'app-curriculum-videos',
    templateUrl: './curriculum-videos.component.html',
    styleUrls: ['./curriculum-videos.component.scss'],
    standalone: false
})
export class CurriculumVideosComponent implements OnInit, OnChanges, OnDestroy {

  @Input() curriculumId: string;
  videos = [];
  videoObj: { videoLink?: string; title?: string; description?: string; providerType?: string } = {};
  modalReference: NgbModalRef;
  subscription: Subscription = new Subscription();

  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
  ) { }
  course: any;
  curriculam: any;
  userName: string;

  ngOnInit(): void {
    this.course = JSON.parse(localStorage.getItem('course'));
    this.curriculam = JSON.parse(localStorage.getItem('curriculum'));
    this.userName = JSON.parse(sessionStorage.getItem('CurrentUser'));
    if (this.curriculumId) {
      this.getvideoByCurriculumId(this.curriculumId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.curriculumId && this.curriculumId) {
      this.getvideoByCurriculumId(this.curriculumId);
    }
  }

  getvideoByCurriculumId(id: string): void {
    this.videoObj = {};
    this.videos = [];
    const cached = videoCache.get(id);
    if (cached && cached.length >= 0) {
      this.videos = cached;
      this.setFirstVideo();
      return;
    }
    this.subscription.add(this.appService.getCurriculumVideoByCurriculumId(id).subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res)) {
          this.videos = res;
          videoCache.set(id, res);
          this.setFirstVideo();
        }
      },
      error: () => {
        this.videos = [];
      }
    }));
  }

  /** Set videoObj to the first video so the player has a source. */
  private setFirstVideo(): void {
    const first = this.videos[0]?.videoLectures?.[0];
    if (first) {
      this.setVideoObj(first);
    }
  }

  setVideoObj(item: { videoLink?: string; title?: string; description?: string }): void {
    if (!item) return;
    this.videoObj = {
      videoLink: item.videoLink,
      title: item.title,
      description: item.description,
      providerType: (item.videoLink || '').includes('https://www.youtube.com') ? 'youtube' : 'local'
    };
  }

  /** Use proxy URL for S3 videos to avoid CORS. */
  getVideoSrc(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
      return this.appService.apiUrl + 'api/CurriculumVideoLecture/StreamVideo?url=' + encodeURIComponent(url);
    }
    return url;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}

