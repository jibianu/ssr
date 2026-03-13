import { Location } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormArray, AbstractControl, UntypedFormControl } from '@angular/forms';
import { NgbModalRef, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, Subscription } from 'rxjs';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { map } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';

@Component({
    selector: 'app-curriculum-video',
    templateUrl: './curriculum-video.component.html',
    styleUrls: ['./curriculum-video.component.scss'],
    standalone: false
})
export class CurriculumVideoComponent implements OnInit, OnChanges, OnDestroy {

  videoForm: UntypedFormGroup;
  videos = [];
  pageTitle: string;
  btntext: string;
  submitted: boolean = false;
  subscription: Subscription = new Subscription();
  guid = '00000000-0000-0000-0000-000000000000';
  @Input() curriculumId: string;
  fileData: File = null;
  previewUrl: any = null;
  fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  modalReference: NgbModalRef;

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private location:Location
  ) { }
  course:any;
  ngOnInit(): void {
    this.course=JSON.parse(localStorage.getItem("course"));
  }

  ngOnChanges() {
    if (this.curriculumId) {
      this.getvideoByCurriculumId(this.curriculumId);
      this.formInit();
    }
  }

  goBack() {
    this.location.back();
  }

  addVideoLecture(content) {
    this.setvalue(null);
    this.pageTitle = 'Add Video Lecture';
    this.btntext = 'Save';
    this.modalReference = this.modalService.open(content, { size: 'lg', scrollable: true, windowClass: 'modal-right', backdrop: 'static', keyboard: false   });
  }

  updateVideoLecture(content, item) {
    this.setvalue(item);
    this.pageTitle = 'Update Video Lecture';
    this.btntext = 'Update';
    this.modalReference = this.modalService.open(content, { size: 'lg' ,scrollable: true, windowClass: 'modal-right', backdrop: 'static', keyboard: false  });
  }

  formInit() {
    this.videoForm = this.formBuilder.group({
      title: ['', Validators.required],
      id: [this.guid],
      sortOrder:0,
      videoLectures: this.formBuilder.array([])
    })
  }

  get f() { return this.videoForm.controls; }

  get courseVideoLectureArray() {
    return this.videoForm.get('videoLectures') as UntypedFormArray;
  }

  courseVideoLectureArrayControls(): AbstractControl[] {
    return (<UntypedFormArray>this.videoForm.get('videoLectures')).controls;
  }

  getvideoByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumVideoByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        this.videos = res;
        for(let i of this.videos){
          for(let it of i.videoLectures){
            it.providerType=it.videoLink.includes("youtube")?'youtube':'local'
          }
        }
        console.log(this.videos)
      }
    }));
  }

  setvalue(res) {
    this.videoForm.patchValue({
      title: res?.title ? res.title : '',
      id: res?.id ? res.id : this.guid,
      sortOrder:res?.sortOrder ? res.sortOrder : 0
    });
    if (res && res.videoLectures && res.videoLectures.length > 0) {
      let array = [];
      res.videoLectures.forEach((x) => {
        array.push(this.formBuilder.group(
          {
            description: new UntypedFormControl(x.description ? x.description : '', [Validators.required]),
            title: new UntypedFormControl(x.title ? x.title : ''),
            id: x.id ? x.id : this.guid,
            videoLink: x.videoLink ? x.videoLink : '',
            providerType: x.providerType ? x.providerType : 'local',
            thumbnailImage: x.thumbnailImage ? x.thumbnailImage : '',
            url: x.url ? x.url : '',sortOrder:array.length+1
          }))
      })
      const FormArray: UntypedFormArray = this.formBuilder.array(array);
      this.videoForm.setControl('videoLectures', FormArray);
    } else {
      this.formInit();
      this.submitted = false;
    }
  }

  createVideoLectureItems() {
    let group = {};
    group['title'] = new UntypedFormControl('');
    group['description'] = new UntypedFormControl('', [Validators.required]);
    group['videoLink'] = new UntypedFormControl('');
    group['thumbnailImage'] = new UntypedFormControl('');
    group['providerType'] = new UntypedFormControl('local');
    group['url'] = new UntypedFormControl('');
    group['sortOrder']=this.courseVideoLectureArray.length+1;
    group['id'] = new UntypedFormControl(this.guid);
    return this.formBuilder.group(group);
  }
changeProvider(provider:string,index:number){
  this.courseVideoLectureArray.at(index).patchValue({
    providerType: provider
  });
}
  addCourseVideoLectureItems(): void {
    this.courseVideoLectureArray.push(this.createVideoLectureItems())
  }

  removeCourseVideoLectureItems(index) {
    this.courseVideoLectureArray.removeAt(index);
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.videoForm.invalid) {
      return;
    }
    if (this.f.id.value !== this.guid) {
      this.subscription.add(this.appService.updateCurriculumVideo(this.videoForm.value, this.f.id.value).subscribe(() => {
        this.toasterService.showSuccess('Video Lecture updated successfully');
        this.getvideoByCurriculumId(this.curriculumId);
      }));
    } else {
      this.videoForm.patchValue({
        sortOrder:this.videos.length+1
       });
      this.subscription.add(this.appService.addCurriculumVideo(this.videoForm.value, this.curriculumId).subscribe(() => {
        this.toasterService.showSuccess('Video Lecture created successfully');
        this.getvideoByCurriculumId(this.curriculumId);
        this.modalService.dismissAll();
      }));
    }
  }

  deleteVideoLecture(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Video Lecture Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCurriculumVideo(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Video Lecture deleted successfully');
              this.getvideoByCurriculumId(this.curriculumId);
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  /** Encode video URL for playback (handles spaces and special chars in existing S3 URLs). */
  getEncodedVideoUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      return encodeURI(url);
    } catch {
      return url;
    }
  }

  /** Use proxy URL for S3 videos to avoid CORS in form preview. */
  getVideoSrc(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
      return this.appService.apiUrl + 'api/CurriculumVideoLecture/StreamVideo?url=' + encodeURIComponent(url);
    }
    return url;
  }

  fileProgress(fileInput: any, index) {
    const file = fileInput?.target?.files?.[0];
    if (!file) return;
    this.fileData = file;
    this.fileUploadProgress = '0';
    this.appService.uploadDocumnet(this.fileData, 'curriculum_Vedios').subscribe({
      next: (res: any) => {
        this.fileUploadProgress = null;
        const path = res?.documentPath;
        if (path) {
          this.uploadedFilePath = path;
          this.courseVideoLectureArray.at(index).patchValue({ videoLink: path });
          this.toasterService.showSuccess('Video uploaded successfully');
        } else {
          this.toasterService.showError('Upload did not return a valid URL');
        }
      },
      error: () => {
        this.fileUploadProgress = null;
        this.toasterService.showError('Video upload failed. Try a smaller file or check your connection.');
      }
    });
  }
  uploadLink(url: string, index) {
    this.appService.uploadDocumnetLink(url,'curriculum_Vedios').subscribe(res => {
      this.uploadedFilePath = res.documentPath;
      this.courseVideoLectureArray.at(index).patchValue({
        videoLink: this.uploadedFilePath
      });
    })
  }

  asktosave():boolean {    
    return Swal.fire({
      title: 'Are you sure, you want to close?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes'
    }).then((result) => {
      if (result.isConfirmed) {
        this.modalService.dismissAll();
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}