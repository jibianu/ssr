import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

@Component({
    selector: 'app-student-curriculum-videos',
    templateUrl: './student-curriculum-videos.component.html',
    styleUrls: ['./student-curriculum-videos.component.scss'],
    standalone: false
})
export class StudentCurriculumVideosComponent implements OnInit, OnChanges, OnDestroy {

  @Input() curriculumId: string;
  videos = [];
  videoObj = {};
  modalReference: NgbModalRef;
  subscription: Subscription = new Subscription();
  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    if (this.curriculumId) {
      this.getvideoByCurriculumId(this.curriculumId);
    }
  }

   getvideoByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumVideoByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        this.videos = res;
      }
    }));
  }

  loadVideo(content,item){
    this.videoObj['videoLink'] = item.videoLink;
    this.videoObj['title'] = item.title;
    this.videoObj['description'] = item.description;
    this.modalReference = this.modalService.open(content, { size: 'xl', windowClass: 'video-modal' });
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
