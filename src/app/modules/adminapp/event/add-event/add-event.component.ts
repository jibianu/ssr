import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, FormArray, FormControl, UntypedFormArray, AbstractControl, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';




@Component({
    selector: 'app-add-event',
    templateUrl: './add-event.component.html',
    styleUrls: ['./add-event.component.scss'],
    standalone: true,

})
export class AddEventComponent implements OnInit, OnDestroy {

    pageTitle: string;
    btntext: string;
    eventId: string;
    eventForm: UntypedFormGroup;
    submitted = false;
    subscription: Subscription = new Subscription();
    fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  fileData: File = null;
  isNew:boolean=false;
  socailMedias=[
   
  ]
    formBuilder: any;
    activatedRoute: any;

    constructor(
        
        private appService: AdminAppService,
        private toasterService: ToasterService,

        private location: Location,
    ) { }

    ngOnInit(): void {
        this.socailMedias=[
             "LinkdIn",
            "Twitter"
        ]
        this.activatedRoute
            .params
            .subscribe(params => {
                if (params.id) {
                    this.eventId = params.id;
                    this.isNew=params.isNew=="new";
                }
            });
        if (this.eventId) {
            this.pageTitle = 'Update Event';
            this.btntext = 'Update';
            this.getEventById(this.eventId);
        } else {
            this.pageTitle = 'Add Event';
            this.btntext = 'Save';
        }
        if(this.isNew){
            this.pageTitle = 'Add Event';
            this.btntext = 'Save';
        }
        this.formInit();
    }

    formInit() {
        this.eventForm = this.formBuilder.group({
            title: ['', Validators.required],
            eventInfo: ['', Validators.required],
            canonicalUrl:['', Validators.required],
            titleImageUrl: '',
            metaDescription: ['', [Validators.required]],
            amount: ['0',Validators.required],
            location:['', Validators.required],
            discount:['0'],
            language:['',Validators.required],
            badge: [''],
            startDate: [''],
            endDate: [''],
            duration: [''],
            timeing: [''],
            aboutEvent: [''],
            registrationCompleted:false,
            showOnDashboard: false,
            eventDetails: new UntypedFormArray([
            ])
        });
        
        this.addInitialValue();
        
        this.subscription.add(this.eventForm.get('title').valueChanges.subscribe(val => {
            let value = val;
            let replaced = value.split(' ').join('-');
            this.eventForm.patchValue({
              canonicalUrl: replaced
            })
          }));
    }

    get f() { return this.eventForm.controls; }

    addInitialValue(){
        this.addCurriculumItemTitle('bonuse-info','Maximum Slot')
        this.addCurriculumItemTitle('bonuse-info','First Registrion Bonus Count')
        this.addCurriculumItemTitle('image','main')
        this.addCurriculumItem("organized",true)
        
        this.addCurriculumItemTitle('organized_list','Designation')
    }

    getEventById(id) {
        this.subscription.add(this.appService.getEventById(id).subscribe((res: any) => {
            if (res) {
                this.eventForm.patchValue(res);
                try {
                    this.eventForm.patchValue({
                      startDate: new Date(res.startDate).toISOString().split('T')[0],
                      endDate: new Date(res.endDate).toISOString().split('T')[0]
                    });
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    console.error('Error while parsing dates:', msg);
                  }
                  
                if (res.eventDetails && res.eventDetails.length > 0) {
                    this.eventForm.setControl('eventDetails', this.formBuilder.array(
                        res.eventDetails.map((item) => {
                            return this.formBuilder.group({
                                section: item.section,
                                imageUrl: item.imageUrl,
                                sortOrder: item.sortOrder,
                                title: item.title,
                                description: item.description,
                                tag: item.tag,
                                amount: item.amount,
                                count:item.count
                            });
                        }

                        )
                    ));
                }
                this.addInitialValue();
                this.uploadedFilePath = res.eventDetails.find((item) => item.section === 'image')?.imageUrl || '';
            }
        }));
    }

    onSubmit() {
        this.submitted = true;
        // stop here if form is invalid
        if (this.eventForm.invalid) {
            return;
        }
        if (this.eventId && !this.isNew) {
            this.subscription.add(this.appService.updateEvent(this.eventId,this.eventForm.value).subscribe(() => {
                this.toasterService.showSuccess('Event updated successfully');
                this.goBack();
            }));
        } else {
            if(this.isNew){
                this.eventForm.patchValue({id:''})
            }
            this.subscription.add(this.appService.createEvent(this.eventForm.value).subscribe(() => {
                this.toasterService.showSuccess('Event created successfully');
                this.goBack();
            }));
        }
    }

    goBack() {
        this.location.back();
    }
    eventCurriculumArrayControls(section: string) {
        // var x = (<UntypedFormArray>this.eventForm.get('eventDetails')).controls;
        // var ix = 0;
        // var arr: AbstractControl[] = [];
        // var dt = [];
        // for (let i = 0; i < x.length; i++) {
        //     if (x[i].value.section === section) {
        //         // arr[ix] = i;
        //         dt.push({ index: i, control: x[i] });
        //     }
        //     // ix++;
        // }
        // // console.log(dt);
        // return dt;
        return (<UntypedFormArray>this.eventForm.get('eventDetails')).
            controls.filter((control: AbstractControl) => control.get('section').value === section);
    }
    getIndexOfCurriculum(section: string, index: number): number {
        var x = (<UntypedFormArray>this.eventForm.get('eventDetails')).controls;
        var ix = 0;
        for (let i = 0; i < x.length; i++) {
            if (x[i].value.section === section) {
                if (ix === index) {
                    return i;
                }
                ix++;
            }
        }
        return -1;
    }
   
    
    removeCurriculum(index: number, section: string) {
        var ix=this.getIndexOfCurriculum(section, index);
        (<UntypedFormArray>this.eventForm.get('eventDetails')).removeAt(ix);
    }
    addCurriculumItem(section: string,isOnlyOne:boolean=false) {
        if(isOnlyOne &&  this.getIndexOfCurriculum(section, 0) !== -1){
            return;
        }
        (<UntypedFormArray>this.eventForm.get('eventDetails')).push(
            this.formBuilder.group({
                id:'',
                section: section,
                imageUrl: '',
                sortOrder: this.eventCurriculumArrayControls(section).length+1,
                title: '',
                description: '',
                tag: '',
                amount: 0,
                count:0
            })
        );
    }
    addCurriculumItemTitle(section: string,title: string) {
        var x = (<UntypedFormArray>this.eventForm.get('eventDetails'))
            .controls.filter((control: AbstractControl) => control.get('section').value === section)
            .filter((control: AbstractControl) => control.get('title').value === title);
        if (x.length > 0) {
            return;
        }
        (<UntypedFormArray>this.eventForm.get('eventDetails')).push(
            this.formBuilder.group({
                id: '',
                section: section,
                imageUrl: '',
                sortOrder: this.eventCurriculumArrayControls(section).length + 1,
                title: title,
                description: '',
                tag: '',
                amount: 0,
                count: 0
            })
        );
    }
    getValueOfCurriculum(section: string, index: number, key: string): any {
        var ix = this.getIndexOfCurriculum(section, index);
        if (ix !== -1) {
            return (<UntypedFormArray>this.eventForm.get('eventDetails')).controls[ix].get(key).value;
        }
        return '';
    }
    fileProgress(fileInput: any) {
        this.fileData = <File>fileInput.target.files[0];
        this.appService.eventUploadTitleImage(this.fileData).subscribe(res => {
          this.uploadedFilePath = res.url;
          var x= this.getIndexOfCurriculum('image', 0);
          if (x !== -1) {
              (<UntypedFormArray>this.eventForm.get('eventDetails')).controls[x].patchValue({
                  imageUrl: this.uploadedFilePath
              });
          }
        })
      }

      fileProgressIx(fileInput: any,section:string,ix:number) {
        this.fileData = <File>fileInput.target.files[0];
        this.appService.eventUploadTitleImage(this.fileData).subscribe(res => {
          this.uploadedFilePath = res.url;
          var x= this.getIndexOfCurriculum(section, ix);
          if (x !== -1) {
              (<UntypedFormArray>this.eventForm.get('eventDetails')).controls[x].patchValue({
                  imageUrl: this.uploadedFilePath
              });
          }
        })
      }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}


