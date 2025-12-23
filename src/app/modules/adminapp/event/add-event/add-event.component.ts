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
            // ✅ FIX: Use FormControl for checkboxes to ensure proper binding
            registrationCompleted: [false],
            showOnDashboard: [false], // ✅ Explicitly use FormControl array syntax
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
        // ✅ FIX: Allow multiple organizers - remove isOnlyOne restriction
        // If no organized items exist, add one by default
        if (this.getIndexOfCurriculum('organized', 0) === -1) {
            this.addCurriculumItem("organized", false)
        }
        
        this.addCurriculumItemTitle('organized_list','Designation')
        
        // ✅ FIX: Initialize format items (Skill Level, Certification, Mode) if they don't exist
        this.addCurriculumItemTitle('format', 'Level')
        this.addCurriculumItemTitle('format', 'Certification')
        this.addCurriculumItemTitle('format', 'Mode')
    }

    getEventById(id) {
        this.subscription.add(this.appService.getEventById(id).subscribe((res: any) => {
            if (res) {
                // ✅ FIX: Handle both camelCase and PascalCase for showOnDashboard
                // Backend may return ShowOnDashboard (PascalCase), form expects showOnDashboard (camelCase)
                const showOnDashboardValue = res.showOnDashboard !== undefined 
                    ? res.showOnDashboard 
                    : (res.ShowOnDashboard !== undefined ? res.ShowOnDashboard : false);
                
                const registrationCompletedValue = res.registrationCompleted !== undefined
                    ? res.registrationCompleted
                    : (res.RegistrationCompleted !== undefined ? res.RegistrationCompleted : false);
                
                // Convert to proper boolean (handle all possible formats)
                const showOnDashboardBool = showOnDashboardValue === true || showOnDashboardValue === 'true' || showOnDashboardValue === 1 || showOnDashboardValue === '1';
                const registrationCompletedBool = registrationCompletedValue === true || registrationCompletedValue === 'true' || registrationCompletedValue === 1 || registrationCompletedValue === '1';
                
                // ✅ DEBUG: Log loaded values
                console.log('[AddEventComponent] Event loaded - checkbox values:', {
                    rawShowOnDashboard: showOnDashboardValue,
                    rawShowOnDashboardType: typeof showOnDashboardValue,
                    convertedShowOnDashboard: showOnDashboardBool,
                    rawRegistrationCompleted: registrationCompletedValue,
                    convertedRegistrationCompleted: registrationCompletedBool
                });
                
                // Patch form with normalized field names
                this.eventForm.patchValue({
                    ...res,
                    showOnDashboard: showOnDashboardBool,
                    registrationCompleted: registrationCompletedBool
                });
                
                // ✅ CRITICAL FIX: Explicitly set form control values to ensure binding
                // This ensures the checkbox UI reflects the correct state
                const showOnDashboardControl = this.eventForm.get('showOnDashboard');
                const registrationCompletedControl = this.eventForm.get('registrationCompleted');
                if (showOnDashboardControl) {
                    showOnDashboardControl.setValue(showOnDashboardBool, { emitEvent: false });
                    console.log('[AddEventComponent] Set showOnDashboard control value:', showOnDashboardBool);
                }
                if (registrationCompletedControl) {
                    registrationCompletedControl.setValue(registrationCompletedBool, { emitEvent: false });
                }
                
                try {
                    this.eventForm.patchValue({
                        startDate: new Date(res.startDate).toISOString().split('T')[0],
                        endDate: new Date(res.endDate).toISOString().split('T')[0]
                    });
                }
                catch (e) {
                    console.log(e);
                }
                
                // ✅ DEBUG: Log final form state
                console.log('[AddEventComponent] Event loaded - final form state:', {
                    id: res.id,
                    showOnDashboard: this.eventForm.get('showOnDashboard')?.value,
                    registrationCompleted: this.eventForm.get('registrationCompleted')?.value
                });
                if (res.eventDetails && res.eventDetails.length > 0) {
                    // ✅ DEBUG: Log loaded eventDetails
                    const socialLinksLoaded = res.eventDetails.filter((item: any) => 
                        item.section && item.section.startsWith('organized_soc_')
                    );
                    console.log('[AddEventComponent] Event loaded - social links found:', {
                        totalEventDetails: res.eventDetails.length,
                        socialLinksCount: socialLinksLoaded.length,
                        socialLinks: socialLinksLoaded.map((item: any) => ({
                            section: item.section,
                            tag: item.tag,
                            title: item.title
                        }))
                    });
                    
                    this.eventForm.setControl('eventDetails', this.formBuilder.array(
                        res.eventDetails.map((item) => {
                            return this.formBuilder.group({
                                id: item.id || '',
                                section: item.section || '',
                                imageUrl: item.imageUrl || '',
                                sortOrder: item.sortOrder || 0,
                                title: item.title || '',
                                description: item.description || '',
                                tag: item.tag || '',
                                amount: item.amount || 0,
                                count: item.count || 0
                            });
                        }
                        )
                    ));
                    
                    // ✅ DEBUG: Verify social links are in form array after loading
                    setTimeout(() => {
                        const organizers = this.eventCurriculumArrayControls('organized');
                        console.log('[AddEventComponent] After loading - Organizers count:', organizers.length);
                        organizers.forEach((org: FormGroup, orgIndex: number) => {
                            const socialSection = this.getOrganizerSocialSection(orgIndex);
                            const socialLinks = this.eventCurriculumArrayControls(socialSection);
                            console.log(`[AddEventComponent] Organizer ${orgIndex + 1} (${socialSection}) - Social links:`, socialLinks.length);
                            socialLinks.forEach((social: FormGroup, socialIndex: number) => {
                                console.log(`[AddEventComponent]   Social ${socialIndex + 1}:`, {
                                    section: social.get('section')?.value,
                                    tag: social.get('tag')?.value,
                                    title: social.get('title')?.value
                                });
                            });
                        });
                    }, 100);
                }
                // ✅ FIX: Ensure format items exist even if not in database
                this.addInitialValue();
                this.uploadedFilePath = res.eventDetails?.find((item) => item.section === 'image')?.imageUrl || '';
                
                // ✅ FIX: Trigger change detection to update UI
                this.cdr.detectChanges();
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
            // ✅ CRITICAL FIX: Explicitly read checkbox value from form control
            const showOnDashboardControl = this.eventForm.get('showOnDashboard');
            const registrationCompletedControl = this.eventForm.get('registrationCompleted');
            
            // Get raw values from form controls
            const showOnDashboardValue = showOnDashboardControl ? showOnDashboardControl.value : false;
            const registrationCompletedValue = registrationCompletedControl ? registrationCompletedControl.value : false;
            
            // Convert to proper boolean (handle string 'true', number 1, etc.)
            const showOnDashboardBool = showOnDashboardValue === true || showOnDashboardValue === 'true' || showOnDashboardValue === 1 || showOnDashboardValue === '1';
            const registrationCompletedBool = registrationCompletedValue === true || registrationCompletedValue === 'true' || registrationCompletedValue === 1 || registrationCompletedValue === '1';
            
            // ✅ CRITICAL FIX: Build payload with explicit field mapping
            const formValue = this.eventForm.value;
            
            // ✅ CRITICAL FIX: Explicitly ensure eventDetails are included
            const eventDetailsArray = this.eventForm.get('eventDetails') as FormArray;
            
            // ✅ DEBUG: Log form array state before collection
            console.log('[AddEventComponent] Form array controls before collection:', {
                totalControls: eventDetailsArray.controls.length,
                controls: eventDetailsArray.controls.map((control: AbstractControl, idx: number) => {
                    if (control instanceof FormGroup) {
                        return {
                            index: idx,
                            section: control.get('section')?.value,
                            tag: control.get('tag')?.value,
                            title: control.get('title')?.value,
                            isValid: control.valid,
                            isDirty: control.dirty,
                            isTouched: control.touched
                        };
                    }
                    return { index: idx, value: control.value };
                })
            });
            
            const allEventDetails = eventDetailsArray.controls.map((control: AbstractControl) => {
                if (control instanceof FormGroup) {
                    const detail = {
                        id: control.get('id')?.value || '',
                        section: control.get('section')?.value || '',
                        imageUrl: control.get('imageUrl')?.value || '',
                        sortOrder: control.get('sortOrder')?.value || 0,
                        title: control.get('title')?.value || '',
                        description: control.get('description')?.value || '',
                        tag: control.get('tag')?.value || '',
                        amount: control.get('amount')?.value || 0,
                        count: control.get('count')?.value || 0
                    };
                    // ✅ DEBUG: Log social links being collected
                    if (detail.section && detail.section.startsWith('organized_soc_')) {
                        console.log('[AddEventComponent] Collecting social link:', detail);
                    }
                    return detail;
                }
                return control.value;
            });
            
            // ✅ DEBUG: Verify all eventDetails including social links
            const socialLinks = allEventDetails.filter((item: any) => 
                item.section && item.section.startsWith('organized_soc_')
            );
            console.log('[AddEventComponent] All eventDetails before submission:', {
                total: allEventDetails.length,
                socialLinks: socialLinks.length,
                socialLinksDetails: socialLinks.map((item: any) => ({
                    section: item.section,
                    tag: item.tag,
                    title: item.title
                }))
            });
            
            const formData: any = {
                ...formValue,
                id: this.eventId,
                eventDetails: allEventDetails, // ✅ CRITICAL: Explicitly set eventDetails
                // ✅ CRITICAL: Backend expects PascalCase (ShowOnDashboard) as nullable bool
                // Explicitly set to boolean value (not undefined/null) to ensure AutoMapper processes it
                // TypeScript sends boolean, backend C# receives it as bool?
                ShowOnDashboard: showOnDashboardBool,
                // Also include camelCase for consistency (but backend uses PascalCase)
                showOnDashboard: showOnDashboardBool,
                // ✅ Also fix registrationCompleted
                RegistrationCompleted: registrationCompletedBool,
                registrationCompleted: registrationCompletedBool
            };
            
            // ✅ CRITICAL: Ensure ShowOnDashboard is always explicitly set (true or false, never null/undefined)
            // This ensures the backend receives a clear boolean value
            if (formData.ShowOnDashboard === undefined || formData.ShowOnDashboard === null) {
                formData.ShowOnDashboard = false;
            }
            if (formData.RegistrationCompleted === undefined || formData.RegistrationCompleted === null) {
                formData.RegistrationCompleted = false;
            }
            
            // ✅ DEBUG: Log checkbox state before update
            console.log('[AddEventComponent] Checkbox state before update:', {
                showOnDashboardControl: showOnDashboardControl?.value,
                showOnDashboardControlType: typeof showOnDashboardControl?.value,
                showOnDashboardBool: showOnDashboardBool,
                registrationCompletedControl: registrationCompletedControl?.value,
                registrationCompletedBool: registrationCompletedBool
            });
            
            // ✅ DEBUG: Log social links before submission (already collected above)
            console.log('[AddEventComponent] Social links being submitted:', {
                totalEventDetails: allEventDetails.length,
                socialLinksCount: socialLinks.length,
                socialLinks: socialLinks.map((item: any) => ({
                    section: item.section,
                    tag: item.tag,
                    title: item.title,
                    description: item.description,
                    id: item.id
                })),
                // ✅ DEBUG: Show all sections to verify
                allSections: allEventDetails.map((item: any) => item.section)
            });
            
            // ✅ DEBUG: Verify form array state
            const formArray = this.eventForm.get('eventDetails') as FormArray;
            console.log('[AddEventComponent] Form array state:', {
                formArrayLength: formArray.length,
                formArraySections: formArray.controls.map((c: AbstractControl) => ({
                    section: c.get('section')?.value,
                    tag: c.get('tag')?.value,
                    title: c.get('title')?.value
                }))
            });
            
            // ✅ DEBUG: Log payload being sent
            console.log('[AddEventComponent] Payload sent to backend:', {
                id: formData.id,
                showOnDashboard: formData.showOnDashboard,
                ShowOnDashboard: formData.ShowOnDashboard,
                registrationCompleted: formData.registrationCompleted,
                RegistrationCompleted: formData.RegistrationCompleted,
                eventDetailsCount: formData.eventDetails?.length || 0,
                curriculumItems: formData.eventDetails?.filter((item: any) => item.section === 'curriculum') || [],
                allFormValues: formValue
            });
            
            this.subscription.add(this.appService.updateEvent(this.eventId, formData).subscribe({
                next: (response) => {
                    this.loading = false;
                    this.submitted = false;
                    this.toasterService.showSuccess('Event updated successfully');
                    
                    // ✅ DEBUG: Log response to verify backend returned correct values
                    console.log('[AddEventComponent] Event update response received:', {
                        id: response?.id,
                        showOnDashboard: response?.showOnDashboard ?? response?.ShowOnDashboard,
                        ShowOnDashboard: response?.ShowOnDashboard,
                        registrationCompleted: response?.registrationCompleted ?? response?.RegistrationCompleted,
                        RegistrationCompleted: response?.RegistrationCompleted,
                        eventDetailsCount: response?.eventDetails?.length || 0
                    });
                    
                    // ✅ FIX: Use response data directly instead of reloading (faster and more reliable)
                    // Update form with response data from backend (includes all EventDetails)
                    if (response && response.id) {
                        // ✅ FIX: If response doesn't include eventDetails, do a quick reload
                        if (!response.eventDetails || response.eventDetails.length === 0) {
                            console.log('[AddEventComponent] Response missing eventDetails, doing quick reload...');
                            // Quick reload without retry delays
                            setTimeout(() => {
                                this.getEventById(this.eventId);
                            }, 100);
                            return; // Exit early, reload will handle the rest
                        }
                        
                        // Handle showOnDashboard and registrationCompleted
                        const showOnDashboardValue = response.showOnDashboard !== undefined 
                            ? response.showOnDashboard 
                            : (response.ShowOnDashboard !== undefined ? response.ShowOnDashboard : false);
                        const registrationCompletedValue = response.registrationCompleted !== undefined
                            ? response.registrationCompleted
                            : (response.RegistrationCompleted !== undefined ? response.RegistrationCompleted : false);
                        
                        const showOnDashboardBool = showOnDashboardValue === true || String(showOnDashboardValue) === 'true' || Number(showOnDashboardValue) === 1 || String(showOnDashboardValue) === '1';
                        const registrationCompletedBool = registrationCompletedValue === true || String(registrationCompletedValue) === 'true' || Number(registrationCompletedValue) === 1 || String(registrationCompletedValue) === '1';
                        
                        // Update eventDetails FormArray with response data
                        if (response.eventDetails && response.eventDetails.length > 0) {
                            // ✅ DEBUG: Log social links in response
                            const socialLinksInResponse = response.eventDetails.filter((item: any) => 
                                item.section && item.section.startsWith('organized_soc_')
                            );
                            console.log('[AddEventComponent] Response - social links:', {
                                totalEventDetails: response.eventDetails.length,
                                socialLinksCount: socialLinksInResponse.length,
                                socialLinks: socialLinksInResponse.map((item: any) => ({
                                    section: item.section,
                                    tag: item.tag,
                                    title: item.title
                                }))
                            });
                            
                            this.eventForm.setControl('eventDetails', this.formBuilder.array(
                                response.eventDetails.map((item: any) => {
                                    return this.formBuilder.group({
                                        id: item.id || '',
                                        section: item.section || '',
                                        imageUrl: item.imageUrl || '',
                                        sortOrder: item.sortOrder || 0,
                                        title: item.title || '',
                                        description: item.description || '',
                                        tag: item.tag || '',
                                        amount: item.amount || 0,
                                        count: item.count || 0
                                    });
                                })
                            ));
                            
                            // ✅ DEBUG: Verify social links are in form after update
                            setTimeout(() => {
                                const organizers = this.eventCurriculumArrayControls('organized');
                                console.log('[AddEventComponent] After update - Organizers count:', organizers.length);
                                organizers.forEach((org: FormGroup, orgIndex: number) => {
                                    const socialSection = this.getOrganizerSocialSection(orgIndex);
                                    const socialLinks = this.eventCurriculumArrayControls(socialSection);
                                    console.log(`[AddEventComponent] After update - Organizer ${orgIndex + 1} (${socialSection}) - Social links:`, socialLinks.length);
                                });
                            }, 50);
                        }
                        
                        // Update other form fields
                        this.eventForm.patchValue({
                            showOnDashboard: showOnDashboardBool,
                            registrationCompleted: registrationCompletedBool
                        }, { emitEvent: false });
                        
                        // Update uploaded file path if exists
                        const imageDetail = response.eventDetails?.find((item: any) => item.section === 'image');
                        if (imageDetail?.imageUrl) {
                            this.uploadedFilePath = imageDetail.imageUrl;
                        }
                        
                        // Ensure format items exist
                        this.addInitialValue();
                        
                        // ✅ FIX: Trigger change detection to update UI immediately
                        this.cdr.detectChanges();
                    }
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
        const formArray = this.eventForm.get('eventDetails') as FormArray;
        if (!formArray) {
            return [];
        }
        const filtered = formArray.controls.filter((control: AbstractControl) => {
            const sectionValue = control.get('section')?.value;
            return sectionValue === section;
        }) as FormGroup[];
        
        // ✅ DEBUG: Log social links filtering
        if (section && section.startsWith('organized_soc_')) {
            console.log(`[AddEventComponent] eventCurriculumArrayControls('${section}') - Found ${filtered.length} items`);
            if (filtered.length === 0) {
                // Log all sections to debug
                const allSections = formArray.controls.map((c: AbstractControl) => c.get('section')?.value);
                const socialSections = allSections.filter((s: string) => s && s.startsWith('organized_soc_'));
                console.log(`[AddEventComponent] No items found for ${section}. Available social sections:`, socialSections);
            }
        }
        
        return filtered;
    }
    getIndexOfCurriculum(section: string, index: number): number {
        var x = (<FormArray>this.eventForm.get('eventDetails')).controls;
        var ix = 0;
        for (let i = 0; i < x.length; i++) {
            const sectionValue = x[i].get('section')?.value || x[i].value?.section;
            if (sectionValue === section) {
                if (ix === index) {
                    // ✅ DEBUG: Log when finding social link index
                    if (section && section.startsWith('organized_soc_')) {
                        console.log(`[AddEventComponent] getIndexOfCurriculum('${section}', ${index}) = ${i}`);
                    }
                    return i;
                }
                ix++;
            }
        }
        // ✅ DEBUG: Log when not found
        if (section && section.startsWith('organized_soc_')) {
            console.warn(`[AddEventComponent] getIndexOfCurriculum('${section}', ${index}) = -1 (not found)`);
            console.log('[AddEventComponent] Available sections:', x.map((c: AbstractControl) => c.get('section')?.value || c.value?.section));
        }
        return -1;
    }
   
    
    removeCurriculum(index: number, section: string) {
        var ix=this.getIndexOfCurriculum(section, index);
        (<FormArray>this.eventForm.get('eventDetails')).removeAt(ix);
        
        // ✅ FIX: If removing an organizer, also remove their associated social links
        if (section === 'organized') {
            const socialSection = `organized_soc_${index}`;
            const socialLinks = this.eventCurriculumArrayControls(socialSection);
            // Remove all social links for this organizer (in reverse order to maintain indices)
            for (let i = socialLinks.length - 1; i >= 0; i--) {
                this.removeCurriculum(i, socialSection);
            }
            
            // ✅ FIX: Reindex remaining organizers' social links
            // After removing organizer at index, all organizers after need their social links reindexed
            const organizers = this.eventCurriculumArrayControls('organized');
            for (let orgIndex = index; orgIndex < organizers.length; orgIndex++) {
                const oldSection = `organized_soc_${orgIndex + 1}`;
                const newSection = `organized_soc_${orgIndex}`;
                const oldSocialLinks = this.eventCurriculumArrayControls(oldSection);
                
                // Update section name for each social link
                oldSocialLinks.forEach((control: FormGroup, socialIndex: number) => {
                    const globalIndex = this.getIndexOfCurriculum(oldSection, socialIndex);
                    if (globalIndex !== -1) {
                        (<FormArray>this.eventForm.get('eventDetails')).controls[globalIndex].patchValue({
                            section: newSection
                        });
                    }
                });
            }
        }
    }
    addCurriculumItem(section: string,isOnlyOne:boolean=false) {
        if(isOnlyOne &&  this.getIndexOfCurriculum(section, 0) !== -1){
            return;
        }
        
        // ✅ DEBUG: Log social link addition
        if (section && section.startsWith('organized_soc_')) {
            console.log('[AddEventComponent] Adding social link with section:', section);
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
        
        // ✅ DEBUG: Verify social link was added
        if (section && section.startsWith('organized_soc_')) {
            const addedItems = this.eventCurriculumArrayControls(section);
            console.log('[AddEventComponent] Social links for section', section, ':', addedItems.length);
            console.log('[AddEventComponent] All eventDetails sections:', 
                (<FormArray>this.eventForm.get('eventDetails')).controls.map((c: AbstractControl) => c.get('section')?.value));
        }
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
    
    // ✅ Helper method to get organizer social links section name
    getOrganizerSocialSection(organizerIndex: number): string {
        return `organized_soc_${organizerIndex}`;
    }
    
    // ✅ TrackBy function for ngFor performance
    trackByIndex(index: number, item: any): any {
        return index;
    }
    
    // ✅ FIX: Add method to update curriculum values from input fields
    updateCurriculumValue(section: string, index: number, key: string, event: any): void {
        const value = event.target.value;
        const ix = this.getIndexOfCurriculum(section, index);
        if (ix !== -1) {
            (<FormArray>this.eventForm.get('eventDetails')).controls[ix].patchValue({
                [key]: value
            });
        } else {
            // If item doesn't exist, create it
            const titles = ['Level', 'Certification', 'Mode'];
            if (index < titles.length) {
                this.addCurriculumItemTitle('format', titles[index]);
                // Try again after adding
                setTimeout(() => {
                    const newIx = this.getIndexOfCurriculum(section, index);
                    if (newIx !== -1) {
                        (<FormArray>this.eventForm.get('eventDetails')).controls[newIx].patchValue({
                            [key]: value
                        });
                    }
                }, 0);
            }
        }
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
                                
                                // ✅ FIX: Handle both camelCase and PascalCase for showOnDashboard
                                const showOnDashboardValue = res.showOnDashboard !== undefined 
                                    ? res.showOnDashboard 
                                    : (res.ShowOnDashboard !== undefined ? res.ShowOnDashboard : false);
                                
                                const registrationCompletedValue = res.registrationCompleted !== undefined
                                    ? res.registrationCompleted
                                    : (res.RegistrationCompleted !== undefined ? res.RegistrationCompleted : false);
                                
                                // Convert to proper boolean
                                const showOnDashboardBool = showOnDashboardValue === true || showOnDashboardValue === 'true' || showOnDashboardValue === 1 || showOnDashboardValue === '1';
                                const registrationCompletedBool = registrationCompletedValue === true || registrationCompletedValue === 'true' || registrationCompletedValue === 1 || registrationCompletedValue === '1';
                                
                                // Patch form with normalized field names
                                this.eventForm.patchValue({
                                    ...res,
                                    showOnDashboard: showOnDashboardBool,
                                    registrationCompleted: registrationCompletedBool
                                });
                                
                                // ✅ CRITICAL FIX: Explicitly set form control values after reload
                                const showOnDashboardControl = this.eventForm.get('showOnDashboard');
                                const registrationCompletedControl = this.eventForm.get('registrationCompleted');
                                if (showOnDashboardControl) {
                                    showOnDashboardControl.setValue(showOnDashboardBool, { emitEvent: false });
                                }
                                if (registrationCompletedControl) {
                                    registrationCompletedControl.setValue(registrationCompletedBool, { emitEvent: false });
                                }
                                
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
                                    // ✅ DEBUG: Log social links being reloaded
                                    const socialLinksReloaded = res.eventDetails.filter((item: any) => 
                                        item.section && item.section.startsWith('organized_soc_')
                                    );
                                    console.log('[AddEventComponent] Reload - social links found:', {
                                        totalEventDetails: res.eventDetails.length,
                                        socialLinksCount: socialLinksReloaded.length,
                                        socialLinks: socialLinksReloaded.map((item: any) => ({
                                            section: item.section,
                                            tag: item.tag,
                                            title: item.title
                                        }))
                                    });
                                    
                                    this.eventForm.setControl('eventDetails', this.formBuilder.array(
                                        res.eventDetails.map((item: any) => {
                                            return this.formBuilder.group({
                                                id: item.id || '',
                                                section: item.section || '',
                                                imageUrl: item.imageUrl || '',
                                                sortOrder: item.sortOrder || 0,
                                                title: item.title || '',
                                                description: item.description || '',
                                                tag: item.tag || '',
                                                amount: item.amount || 0,
                                                count: item.count || 0
                                            });
                                        })
                                    ));
                                    
                                    // ✅ DEBUG: Verify social links are in form array after reload
                                    setTimeout(() => {
                                        const organizers = this.eventCurriculumArrayControls('organized');
                                        console.log('[AddEventComponent] After reload - Organizers count:', organizers.length);
                                        organizers.forEach((org: FormGroup, orgIndex: number) => {
                                            const socialSection = this.getOrganizerSocialSection(orgIndex);
                                            const socialLinks = this.eventCurriculumArrayControls(socialSection);
                                            console.log(`[AddEventComponent] Reload - Organizer ${orgIndex + 1} (${socialSection}) - Social links:`, socialLinks.length);
                                            socialLinks.forEach((social: FormGroup, socialIndex: number) => {
                                                console.log(`[AddEventComponent] Reload - Social ${socialIndex + 1}:`, {
                                                    section: social.get('section')?.value,
                                                    tag: social.get('tag')?.value,
                                                    title: social.get('title')?.value
                                                });
                                            });
                                        });
                                    }, 100);
                                }
                                
                                // ✅ FIX: Ensure format items exist even if not in database
                                this.addInitialValue();
                                this.uploadedFilePath = res.eventDetails?.find((item) => item.section === 'image')?.imageUrl || '';
                                
                                // ✅ FIX: Trigger change detection to update UI
                                this.cdr.detectChanges();
                                
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