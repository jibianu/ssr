import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import {FormGroup,FormBuilder, Validators, FormArray, FormControl, AbstractControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';



@Component({
    selector: 'app-add-event',
    templateUrl: './add-event.component.html',
    styleUrls: ['./add-event.component.scss'],
    standalone: false
})
export class AddEventComponent implements OnInit, OnDestroy {

    pageTitle: string;
    btntext: string;
    eventId: string;
    eventForm: FormGroup;
    submitted = false;
    loading = false;
    subscription: Subscription = new Subscription();
    fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  fileData: File = null;
  isNew:boolean=false;
  socailMedias=[
   
  ]

    private apiUrl = environment.apiUrl;

    constructor(
        private formBuilder: FormBuilder,
        private appService: AdminAppService,
        private toasterService: ToasterService,
        private activatedRoute: ActivatedRoute,
        private location: Location,
        private cdr: ChangeDetectorRef,
        private http: HttpClient,
    ) { }

    ngOnInit(): void {
        this.socailMedias=[
             "LinkdIn",
            "Twitter"
        ]
        // FIXED: Add route.params subscription to cleanup on destroy
        this.subscription.add(
            this.activatedRoute.params.subscribe(params => {
                if (params['id']) {
                    this.eventId = params['id'];
                    this.isNew = params['isNew'] === 'new';
                }
            })
        );
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
            metaDescription: [''],
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
            eventDetails: new FormArray([
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
                }
                catch (e) {
                    console.log(e);
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
        
        // Mark all form controls as touched to show validation messages
        if (this.eventForm.invalid) {
            Object.keys(this.eventForm.controls).forEach(key => {
                const control = this.eventForm.get(key);
                if (control) {
                    control.markAsTouched();
                }
            });
            // Mark form array controls as touched
            const eventDetailsArray = this.eventForm.get('eventDetails') as FormArray;
            eventDetailsArray.controls.forEach(control => {
                if (control instanceof FormGroup) {
                    Object.keys(control.controls).forEach(key => {
                        control.get(key)?.markAsTouched();
                    });
                }
            });
            return;
        }
        
        // Prevent double submission
        if (this.loading) {
            return;
        }
        
        this.loading = true;
        if (this.eventId && !this.isNew) {
            // Update event
            const formData = {
                ...this.eventForm.value,
                id: this.eventId
            };
            this.subscription.add(this.appService.updateEvent(this.eventId, formData).subscribe({
                next: (response) => {
                    this.loading = false;
                    this.submitted = false;
                    this.toasterService.showSuccess('Event updated successfully');
                    
                    // Update form immediately with submitted data (optimistic update)
                    this.updateFormWithSubmittedData(formData);
                    
                    // Reload event data from server to get complete updated data
                    this.reloadEventDataWithRetry(3, 300);
                },
                error: (err) => {
                    this.loading = false;
                    console.error('[AddEventComponent] Error updating event:', err);
                    this.toasterService.showError(err?.error?.message || 'Failed to update event. Please try again.');
                }
            }));
        } else {
            // Create new event
            if(this.isNew){
                this.eventForm.patchValue({id:''})
            }
            this.subscription.add(this.appService.createEvent(this.eventForm.value).subscribe({
                next: () => {
                    this.loading = false;
                    this.toasterService.showSuccess('Event created successfully');
                    this.goBack();
                },
                error: (err) => {
                    this.loading = false;
                    this.toasterService.showError(err?.error?.message || 'Failed to create event. Please try again.');
                }
            }));
        }
    }

    goBack() {
        this.location.back();
    }
    // ✅ TYPE SAFETY: Return FormGroup[] instead of AbstractControl[] for proper template access
    eventCurriculumArrayControls(section: string): FormGroup[] {
        // var x = (<FormArray>this.eventForm.get('eventDetails')).controls;
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
        return (<FormArray>this.eventForm.get('eventDetails')).
            controls.filter((control: AbstractControl) => control.get('section').value === section) as FormGroup[];
    }
    getIndexOfCurriculum(section: string, index: number): number {
        var x = (<FormArray>this.eventForm.get('eventDetails')).controls;
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
        (<FormArray>this.eventForm.get('eventDetails')).removeAt(ix);
    }
    addCurriculumItem(section: string,isOnlyOne:boolean=false) {
        if(isOnlyOne &&  this.getIndexOfCurriculum(section, 0) !== -1){
            return;
        }
        (<FormArray>this.eventForm.get('eventDetails')).push(
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
        var x = (<FormArray>this.eventForm.get('eventDetails'))
            .controls.filter((control: AbstractControl) => control.get('section').value === section)
            .filter((control: AbstractControl) => control.get('title').value === title);
        if (x.length > 0) {
            return;
        }
        (<FormArray>this.eventForm.get('eventDetails')).push(
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
            return (<FormArray>this.eventForm.get('eventDetails')).controls[ix].get(key).value;
        }
        return '';
    }
    
    getProgressPercentage(): number {
        if (!this.fileUploadProgress) {
            return 0;
        }
        // Remove % sign if present and parse to number
        const progress = this.fileUploadProgress.toString().replace('%', '');
        return parseInt(progress, 10) || 0;
    }

    // ✅ FIX: Update form immediately with submitted data (optimistic update)
    updateFormWithSubmittedData(formData: any) {
        try {
            // Update basic form fields immediately for instant UI feedback
            this.eventForm.patchValue({
                title: formData.title || '',
                canonicalUrl: formData.canonicalUrl || '',
                eventInfo: formData.eventInfo || '',
                metaDescription: formData.metaDescription || '',
                language: formData.language || '',
                badge: formData.badge || '',
                amount: formData.amount || '0',
                location: formData.location || '',
                discount: formData.discount || '0',
                startDate: formData.startDate || '',
                endDate: formData.endDate || '',
                duration: formData.duration || '',
                timeing: formData.timeing || '',
                aboutEvent: formData.aboutEvent || '',
                registrationCompleted: formData.registrationCompleted || false,
                showOnDashboard: formData.showOnDashboard || false
            }, { emitEvent: false });

            // Update uploaded file path if exists
            if (formData.titleImageUrl) {
                this.uploadedFilePath = formData.titleImageUrl;
            }

            // Force change detection to update UI immediately
            this.cdr.detectChanges();
        } catch (error) {
            console.error('[AddEventComponent] Error updating form with submitted data:', error);
        }
    }

    // ✅ FIX: Reload event data after update with retry mechanism
    reloadEventDataWithRetry(maxRetries: number = 3, initialDelay: number = 200) {
        if (!this.eventId) return;

        let attempt = 0;
        const attemptReload = () => {
            attempt++;
            // Exponential backoff: 0ms (first), 200ms, 400ms, 800ms
            const delay = attempt === 1 ? 0 : initialDelay * Math.pow(2, attempt - 2);
            
            const performReload = () => {
                // Use cache-busting by adding timestamp to ensure fresh data
                const cacheBustUrl = `${this.apiUrl}page/event/${this.eventId}?_refresh=${Date.now()}`;
                this.subscription.add(
                    this.http.get(cacheBustUrl).subscribe({
                        next: (res: any) => {
                            if (res && res.id) {
                                // Successfully received data - reuse getEventById logic
                                this.resetFormArrays();
                                this.eventForm.patchValue(res);
                                
                                // Handle date formatting
                                try {
                                    if (res.startDate) {
                                        this.eventForm.patchValue({
                                            startDate: new Date(res.startDate).toISOString().split('T')[0]
                                        });
                                    }
                                    if (res.endDate) {
                                        this.eventForm.patchValue({
                                            endDate: new Date(res.endDate).toISOString().split('T')[0]
                                        });
                                    }
                                } catch (e) {
                                    console.log('[AddEventComponent] Error formatting dates:', e);
                                }
                                
                                // Update eventDetails FormArray
                                if (res.eventDetails && res.eventDetails.length > 0) {
                                    this.eventForm.setControl('eventDetails', this.formBuilder.array(
                                        res.eventDetails.map((item: any) => {
                                            return this.formBuilder.group({
                                                section: item.section,
                                                imageUrl: item.imageUrl,
                                                sortOrder: item.sortOrder,
                                                title: item.title,
                                                description: item.description,
                                                tag: item.tag,
                                                amount: item.amount,
                                                count: item.count
                                            });
                                        })
                                    ));
                                }
                                
                                // Re-add initial values
                                this.addInitialValue();
                                
                                // Update uploaded file path
                                this.uploadedFilePath = res.eventDetails?.find((item: any) => item.section === 'image')?.imageUrl || '';
                                
                                // Mark form as pristine since we just updated it with fresh data
                                this.eventForm.markAsPristine();
                                this.submitted = false;
                                
                                // Force change detection to update UI immediately
                                this.cdr.detectChanges();
                                console.log(`[AddEventComponent] Event data reloaded successfully after update (attempt ${attempt})`);
                            } else if (attempt < maxRetries) {
                                // Retry if no valid data received
                                console.log(`[AddEventComponent] No data received, retrying (attempt ${attempt}/${maxRetries})...`);
                                attemptReload();
                            } else {
                                console.warn('[AddEventComponent] Failed to reload event data after all retries');
                            }
                        },
                        error: (err) => {
                            console.error(`[AddEventComponent] Error reloading event data (attempt ${attempt}):`, err);
                            if (attempt < maxRetries) {
                                attemptReload();
                            } else {
                                console.error('[AddEventComponent] Failed to reload event data after all retries');
                            }
                        }
                    })
                );
            };

            if (delay === 0) {
                // First attempt: execute immediately
                performReload();
            } else {
                // Subsequent attempts: use delay
                setTimeout(performReload, delay);
            }
        };

        // Start first attempt
        attemptReload();
    }

    // Helper method to reset form arrays before reloading
    resetFormArrays() {
        const eventDetailsArray = this.eventForm.get('eventDetails') as FormArray;
        while (eventDetailsArray.length > 0) {
            eventDetailsArray.removeAt(0);
        }
    }

    fileProgress(fileInput: any) {
        this.fileData = <File>fileInput.target.files[0];
        this.appService.eventUploadTitleImage(this.fileData).subscribe(res => {
          this.uploadedFilePath = res.url;
          var x= this.getIndexOfCurriculum('image', 0);
          if (x !== -1) {
              (<FormArray>this.eventForm.get('eventDetails')).controls[x].patchValue({
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
              (<FormArray>this.eventForm.get('eventDetails')).controls[x].patchValue({
                  imageUrl: this.uploadedFilePath
              });
          }
        })
      }

    // Accordion toggle functionality
    expandedSections: Set<string> = new Set();

    toggleCollapse(sectionId: string, event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (this.expandedSections.has(sectionId)) {
            this.expandedSections.delete(sectionId);
        } else {
            this.expandedSections.add(sectionId);
        }
    }

    isExpanded(sectionId: string): boolean {
        return this.expandedSections.has(sectionId);
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}