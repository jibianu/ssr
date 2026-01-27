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
    isSaving: boolean = false; // ✅ FIX 4: Prevent double submit
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
        
        // ✅ FIX: Get params synchronously first (same pattern as course component)
        const routeParams = this.activatedRoute.snapshot.params;
        if (routeParams['id']) {
            this.eventId = routeParams['id'];
            this.isNew = routeParams['isNew'] === 'new';
        }
        
        // Also subscribe for route changes
        this.subscription.add(
            this.activatedRoute.params.subscribe(params => {
                if (params['id']) {
                    this.eventId = params['id'];
                    this.isNew = params['isNew'] === 'new';
                }
            })
        );
        
        // ✅ CRITICAL FIX: Initialize form BEFORE loading event data
        // This ensures eventForm exists when getEventById tries to patch it
        this.formInit();
        
        if (this.eventId) {
            this.pageTitle = 'Update Event';
            this.btntext = 'Update';
            // ✅ FIX: Call getEventById AFTER formInit to ensure form exists
            this.getEventById(this.eventId);
        } else {
            this.pageTitle = 'Add Event';
            this.btntext = 'Save';
        }
        if(this.isNew){
            this.pageTitle = 'Add Event';
            this.btntext = 'Save';
        }
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
        // ✅ SAFETY CHECK: Ensure form is initialized before trying to patch it
        if (!this.eventForm) {
            console.warn('[AddEventComponent] getEventById called before formInit - initializing form now');
            this.formInit();
        }
        
        this.subscription.add(this.appService.getEventById(id).subscribe((res: any) => {
            if (res && this.eventForm) {
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
                    title: res.title || res.Title || '',
                    canonicalUrl: res.canonicalUrl || res.CanonicalUrl || '',
                    metaDescription: res.metaDescription || res.MetaDescription || '',
                    amount: res.amount || res.Amount || 0,
                    eventInfo: res.eventInfo || res.EventInfo || '',
                    badge: res.badge || res.Badge || '',
                    duration: res.duration || res.Duration || '',
                    timeing: res.timeing || res.Timeing || '',
                    aboutEvent: res.aboutEvent || res.AboutEvent || '',
                    language: res.language || res.Language || '',
                    discount: res.discount || res.Discount || 0,
                    location: res.location || res.Location || '',
                    titleImageUrl: res.titleImageUrl || res.TitleImageUrl || '',
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
                    if (res.startDate || res.StartDate) {
                    this.eventForm.patchValue({
                            startDate: new Date(res.startDate || res.StartDate).toISOString().split('T')[0]
                        });
                    }
                    if (res.endDate || res.EndDate) {
                        this.eventForm.patchValue({
                            endDate: new Date(res.endDate || res.EndDate).toISOString().split('T')[0]
                    });
                    }
                }
                catch (e) {
                    console.log('[AddEventComponent] Error formatting dates:', e);
                }
                
                // ✅ DEBUG: Log final form state
                console.log('[AddEventComponent] Event loaded - final form state:', {
                    id: res.id,
                    showOnDashboard: this.eventForm.get('showOnDashboard')?.value,
                    registrationCompleted: this.eventForm.get('registrationCompleted')?.value
                });
                if (res.eventDetails && res.eventDetails.length > 0) {
                    // ✅ FIX A: Map organized_soc items to organized_soc_0, organized_soc_1, etc.
                    // Backend returns section "organized_soc", but UI needs "organized_soc_0", "organized_soc_1" per organizer
                    
                    // Get all organizers to determine how many we have
                    const organizers = res.eventDetails.filter((item: any) => item.section === 'organized');
                    const organizerCount = organizers.length;
                    
                    // Get all organized_soc items (from backend, they all have section "organized_soc")
                    const organizedSocItems = res.eventDetails.filter((item: any) => item.section === 'organized_soc');
                    
                    // ✅ DEBUG: Log available sections
                    const allSections = [...new Set(res.eventDetails.map((item: any) => item.section))];
                    console.log('[AddEventComponent] Event loaded - Available sections:', allSections);
                    console.log('[AddEventComponent] Event loaded - organized_soc items found:', {
                        totalEventDetails: res.eventDetails.length,
                        organizerCount: organizerCount,
                        organizedSocCount: organizedSocItems.length,
                        organizedSocItems: organizedSocItems.map((item: any) => ({
                            section: item.section,
                            tag: item.tag,
                            title: item.title,
                            sortOrder: item.sortOrder
                        }))
                    });
                    
                    // Map organized_soc items to organized_soc_0, organized_soc_1, etc.
                    // Strategy: Distribute social links sequentially to organizers
                    // Each organizer gets social links assigned based on their index
                    const mappedEventDetails = res.eventDetails.map((item: any) => {
                        // If this is an organized_soc item, map it to organized_soc_{organizerIndex}
                        if (item.section === 'organized_soc') {
                            // Find which organizer this social link belongs to
                            // Use sortOrder to determine organizer index (assuming social links are grouped by organizer)
                            // Or use a simple sequential assignment
                            const socialLinkIndex = organizedSocItems.indexOf(item);
                            // Calculate which organizer this belongs to (distribute evenly)
                            const organizerIndex = organizerCount > 0 
                                ? Math.floor(socialLinkIndex / Math.ceil(organizedSocItems.length / organizerCount))
                                : 0;
                            
                            return {
                                ...item,
                                section: `organized_soc_${organizerIndex}` // Map to virtual section for UI
                            };
                        }
                        return item;
                    });
                    
                    this.eventForm.setControl('eventDetails', this.formBuilder.array(
                        mappedEventDetails.map((item) => {
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
        // ✅ DEBUG: Log when onSubmit is called
        console.log('[AddEventComponent] === onSubmit() CALLED ===');
        console.log('[AddEventComponent] eventId:', this.eventId);
        console.log('[AddEventComponent] isNew:', this.isNew);
        console.log('[AddEventComponent] loading:', this.loading);
        console.log('[AddEventComponent] isSaving:', this.isSaving);
        console.log('[AddEventComponent] form invalid:', this.eventForm.invalid);
        console.log('[AddEventComponent] form errors:', this.eventForm.errors);
        
        this.submitted = true;
        
        // ✅ SAFETY: Reset flags if they're stuck (shouldn't happen, but safety measure)
        if (this.isSaving && !this.loading) {
            console.warn('[AddEventComponent] ⚠️ isSaving was stuck as true, resetting it');
            this.isSaving = false;
        }
        
        // ✅ FIX 4: Prevent double submission with isSaving flag
        if (this.loading || this.isSaving) {
            console.warn('[AddEventComponent] Submission already in progress, ignoring duplicate submit', {
                loading: this.loading,
                isSaving: this.isSaving
            });
            return;
        }
        
        // ✅ FIX: Stop here if form is invalid (same as course component)
        if (this.eventForm.invalid) {
            console.warn('[AddEventComponent] Form is invalid, marking fields as touched');
            // Mark all form controls as touched to show validation messages
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
        
        // ✅ FIX 4: Set loading and isSaving state before making request
        this.loading = true;
        this.isSaving = true;
        
        if (this.eventId && !this.isNew) {
            // ✅ DEBUG: Log update path
            console.log('[AddEventComponent] ✅ Update path - eventId:', this.eventId, 'isNew:', this.isNew);
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
            
            // ✅ FIX: Ensure form data includes eventId for update (same pattern as course)
            // Collect eventDetails from form array
            const eventDetailsArray = this.eventForm.get('eventDetails') as FormArray;
            const allEventDetails = eventDetailsArray.controls.map((control: AbstractControl) => {
                if (control instanceof FormGroup) {
                    let section = control.get('section')?.value || '';
                    
                    // ✅ FIX A: Convert organized_soc_0, organized_soc_1 back to organized_soc for backend
                    // Backend expects section "organized_soc", not "organized_soc_0", "organized_soc_1"
                    if (section && section.startsWith('organized_soc_')) {
                        section = 'organized_soc';
                    }
                    
                    return {
                        id: control.get('id')?.value || '',
                        section: section,
                        imageUrl: control.get('imageUrl')?.value || '',
                        sortOrder: control.get('sortOrder')?.value || 0,
                        title: control.get('title')?.value || '',
                        description: control.get('description')?.value || '',
                        tag: control.get('tag')?.value || '',
                        amount: control.get('amount')?.value || 0,
                        count: control.get('count')?.value || 0
                    };
                }
                return control.value;
            });
            
            // ✅ FIX 1 & 2: Build payload
            // Build base payload from form value, but explicitly set critical fields
            const formData: any = {
                id: this.eventId,
                title: this.eventForm.get('title')?.value || '',
                canonicalUrl: this.eventForm.get('canonicalUrl')?.value || '',
                metaDescription: this.eventForm.get('metaDescription')?.value || '',
                amount: this.eventForm.get('amount')?.value || 0,
                eventInfo: this.eventForm.get('eventInfo')?.value || '',
                badge: this.eventForm.get('badge')?.value || '',
                startDate: this.eventForm.get('startDate')?.value || '',
                endDate: this.eventForm.get('endDate')?.value || '',
                duration: this.eventForm.get('duration')?.value || '',
                timeing: this.eventForm.get('timeing')?.value || '',
                aboutEvent: this.eventForm.get('aboutEvent')?.value || '',
                language: this.eventForm.get('language')?.value || '',
                discount: this.eventForm.get('discount')?.value || 0,
                location: this.eventForm.get('location')?.value || '',
                titleImageUrl: this.eventForm.get('titleImageUrl')?.value || '',
                // ✅ FIX 3: Send both camelCase and PascalCase for backend compatibility
                showOnDashboard: showOnDashboardBool,
                ShowOnDashboard: showOnDashboardBool,
                registrationCompleted: registrationCompletedBool,
                RegistrationCompleted: registrationCompletedBool,
                eventDetails: allEventDetails
            };
            
            // ✅ DEBUG: Log exact payload being sent
            console.log('[AddEventComponent] 📤 PUT Request Payload:', {
                id: formData.id,
                eventDetailsCount: formData.eventDetails?.length || 0,
                showOnDashboard: formData.showOnDashboard,
                registrationCompleted: formData.registrationCompleted
            });
            
            // ✅ DEBUG 2: Log full payload structure (excluding large fields)
            const payloadForLog = { ...formData };
            if (payloadForLog.eventDetails) {
                payloadForLog.eventDetails = `[${payloadForLog.eventDetails.length} items]`;
            }
            console.log('[AddEventComponent] Full payload structure:', JSON.stringify(payloadForLog, null, 2));
            
            this.subscription.add(this.appService.updateEvent(this.eventId, formData).subscribe({
                next: (response) => {
                    console.log('[AddEventComponent] ✅ Update successful, response received');
                    console.log('[AddEventComponent] Response data:', response);
                    // ✅ FIX: Access metaDescription from EventResponse interface
                    console.log('[AddEventComponent] MetaDescription in response:', {
                        metaDescription: response?.metaDescription,
                        MetaDescription: response?.MetaDescription,
                        hasMetaDescription: !!response?.metaDescription || !!response?.MetaDescription
                    });
                    this.loading = false;
                    this.isSaving = false;
                    this.submitted = false;
                    
                    // ✅ SUCCESS POPUP: Show success message
                    this.toasterService.showSuccess('Update completed successfully', { delay: 3000 });
                    
                    // ✅ SHARED STATE: Updated event is automatically pushed to shared state by AdminAppService
                    // All subscribers (list, detail pages) will receive the update immediately
                    
                    // ✅ STAY ON PAGE: Keep user on the same edit page after update
                    // Patch the form with server response so the latest saved values are visible immediately.
                    if (response) {
                        this.updateFormWithServerValue(response);
                        // ✅ DEBUG: Log form value after update
                        console.log('[AddEventComponent] Form metaDescription after update:', this.eventForm.get('metaDescription')?.value);
                        
                        // ✅ FIX: Force change detection and update UI
                        this.cdr.markForCheck();
                        
                        // ✅ FIX: Use setTimeout to ensure form updates are reflected in UI
                        setTimeout(() => {
                            this.cdr.detectChanges();
                            console.log('[AddEventComponent] Form metaDescription after detectChanges:', this.eventForm.get('metaDescription')?.value);
                        }, 0);
                    }
                },
                error: (err) => {
                    // ✅ CRITICAL: Always reset flags, even on error
                    this.loading = false;
                    this.isSaving = false;
                    this.submitted = false;
                    console.error('[AddEventComponent] Error updating event:', err);
                    
                    // ✅ FIX: Handle 401 (Unauthorized) errors specifically
                    if (err?.status === 401) {
                        const errorMessage = err?.error?.message || err?.error?.Messages?.[0] || 'Your session has expired. Please log in again.';
                        this.toasterService.showError(errorMessage);
                        console.warn('[AddEventComponent] 401 Unauthorized - Token expired. User needs to log in again.');
                        // Note: ErrorInterceptor will handle logout and redirect
                        } else {
                        // ✅ Handle other errors
                        this.toasterService.showError(err?.error?.message || err?.error?.Messages?.[0] || 'Failed to update event. Please try again.');
                    }
                }
            }));
        } else {
            // ✅ DEBUG: Log create path
            console.log('[AddEventComponent] ⚠️ Create path - eventId:', this.eventId, 'isNew:', this.isNew);
            // Create new event
            if(this.isNew){
                this.eventForm.patchValue({id:''})
            }
            this.subscription.add(this.appService.createEvent(this.eventForm.value).subscribe({
                next: (response) => {
                    this.loading = false;
                    this.isSaving = false;
                    this.toasterService.showSuccess('Event created successfully');
                    this.goBack();
                },
                error: (err) => {
                    // ✅ CRITICAL: Always reset flags, even on error
                    this.loading = false;
                    this.isSaving = false;
                    console.error('[AddEventComponent] Error creating event:', err);
                    
                    // ✅ FIX: Handle 401 (Unauthorized) errors specifically
                    if (err?.status === 401) {
                        const errorMessage = err?.error?.message || err?.error?.Messages?.[0] || 'Your session has expired. Please log in again.';
                        this.toasterService.showError(errorMessage);
                        console.warn('[AddEventComponent] 401 Unauthorized - Token expired. User needs to log in again.');
                        // Note: ErrorInterceptor will handle logout and redirect
                    } else {
                    this.toasterService.showError(err?.error?.message || 'Failed to create event. Please try again.');
                    }
                }
            }));
        }
    }

    goBack() {
        this.location.back();
    }
    
    // ✅ FIX: Reset form functionality (same as course component)
    resetForm() {
        if (confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
            this.submitted = false;
            this.loading = false;
            this.uploadedFilePath = null;
            this.fileUploadProgress = null;
            this.eventForm.reset();
            this.formInit();
            
            // If editing an existing event, reload the original data
            if (this.eventId && !this.isNew) {
                this.getEventById(this.eventId);
            }
        }
    }
    // ✅ TYPE SAFETY: Return FormGroup[] instead of AbstractControl[] for proper template access
    // ✅ FIX A: Get items for a specific section (helper method)
    getSectionItems(section: string): any[] {
        const formArray = this.eventForm.get('eventDetails') as FormArray;
        if (!formArray) {
            return [];
        }
        return formArray.controls
            .filter((control: AbstractControl) => {
                const sectionValue = control.get('section')?.value;
                return sectionValue === section;
            })
            .map((control: AbstractControl) => control.value)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    
    // ✅ FIX A: Ensure form array exists for a section (helper method)
    ensureFormArrayFromSection(section: string, formArrayName: string): void {
        // This is handled automatically by eventCurriculumArrayControls
        // No additional action needed
    }
    
    eventCurriculumArrayControls(section: string): FormGroup[] {
        const formArray = this.eventForm.get('eventDetails') as FormArray;
        if (!formArray) {
            return [];
        }
        const filtered = formArray.controls.filter((control: AbstractControl) => {
            const sectionValue = control.get('section')?.value;
            return sectionValue === section;
        }) as FormGroup[];
        
        // ✅ FIX A: Improved debug logging for organized_soc
        if (section && section.startsWith('organized_soc_')) {
            console.log(`[AddEventComponent] eventCurriculumArrayControls('${section}') - Found ${filtered.length} items`);
            if (filtered.length === 0) {
                // Log all sections to debug
                const allSections = formArray.controls.map((c: AbstractControl) => c.get('section')?.value);
                const socialSections = allSections.filter((s: string) => s && s.startsWith('organized_soc'));
                console.log(`[AddEventComponent] No items found for ${section}. Available social sections:`, socialSections);
                console.log(`[AddEventComponent] All sections in form:`, [...new Set(allSections)]);
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
    
    // ✅ FIX B: Update form with server value from 409 conflict (handles organized_soc mapping)
    updateFormWithServerValue(serverValue: any) {
        try {
            // ✅ DEBUG: Log server value to see what we're receiving
            console.log('[AddEventComponent] updateFormWithServerValue called with:', {
                metaDescription: serverValue?.metaDescription,
                MetaDescription: serverValue?.MetaDescription,
                allKeys: Object.keys(serverValue || {})
            });
            
            // Handle showOnDashboard and registrationCompleted
            const showOnDashboardValue = serverValue.showOnDashboard !== undefined 
                ? serverValue.showOnDashboard 
                : (serverValue.ShowOnDashboard !== undefined ? serverValue.ShowOnDashboard : false);
            
            const registrationCompletedValue = serverValue.registrationCompleted !== undefined
                ? serverValue.registrationCompleted
                : (serverValue.RegistrationCompleted !== undefined ? serverValue.RegistrationCompleted : false);
            
            const showOnDashboardBool = showOnDashboardValue === true || showOnDashboardValue === 'true' || showOnDashboardValue === 1 || showOnDashboardValue === '1';
            const registrationCompletedBool = registrationCompletedValue === true || registrationCompletedValue === 'true' || registrationCompletedValue === 1 || registrationCompletedValue === '1';
            
            // ✅ FIX: Get metaDescription - check both camelCase and PascalCase, and also check if it's null/undefined
            const metaDescriptionValue = serverValue.metaDescription !== undefined && serverValue.metaDescription !== null
                ? serverValue.metaDescription
                : (serverValue.MetaDescription !== undefined && serverValue.MetaDescription !== null
                    ? serverValue.MetaDescription
                    : '');
            
            // Map server value to form (handle both camelCase and PascalCase from backend)
            const formPatchData: any = {
                title: serverValue.title || serverValue.Title || '',
                canonicalUrl: serverValue.canonicalUrl || serverValue.CanonicalUrl || '',
                metaDescription: metaDescriptionValue, // ✅ Use the extracted value
                amount: serverValue.amount || serverValue.Amount || 0,
                eventInfo: serverValue.eventInfo || serverValue.EventInfo || '',
                badge: serverValue.badge || serverValue.Badge || '',
                startDate: serverValue.startDate || serverValue.StartDate || null,
                endDate: serverValue.endDate || serverValue.EndDate || null,
                duration: serverValue.duration || serverValue.Duration || '',
                timeing: serverValue.timeing || serverValue.Timeing || '',
                aboutEvent: serverValue.aboutEvent || serverValue.AboutEvent || '',
                language: serverValue.language || serverValue.Language || '',
                discount: serverValue.discount || serverValue.Discount || 0,
                location: serverValue.location || serverValue.Location || '',
                showOnDashboard: showOnDashboardBool,
                registrationCompleted: registrationCompletedBool
            };
            
            // ✅ DEBUG: Log what we're patching
            console.log('[AddEventComponent] Patching form with:', {
                metaDescription: formPatchData.metaDescription,
                metaDescriptionLength: formPatchData.metaDescription?.length || 0
            });
            
            // Patch form with mapped server data
            this.eventForm.patchValue(formPatchData, { emitEvent: false });
            
            // ✅ FIX: Also update the form control directly to ensure it's set
            const metaDescControl = this.eventForm.get('metaDescription');
            if (metaDescControl) {
                metaDescControl.setValue(metaDescriptionValue, { emitEvent: false });
            }
            
            // ✅ DEBUG: Verify the form was updated
            const formMetaDesc = this.eventForm.get('metaDescription')?.value;
            console.log('[AddEventComponent] Form metaDescription after patchValue and setValue:', formMetaDesc);
            
            // ✅ FIX: Mark form control as touched to ensure UI updates
            if (metaDescControl) {
                metaDescControl.markAsTouched();
            }
            
            // ✅ FIX A: Update eventDetails with organized_soc mapping
            const eventDetails = serverValue.eventDetails || serverValue.EventDetails;
            if (eventDetails && Array.isArray(eventDetails)) {
                console.log('[AddEventComponent] Updating eventDetails from server value:', eventDetails.length, 'items');
                
                // Get all organizers to determine how many we have
                const organizers = eventDetails.filter((item: any) => 
                    (item.section === 'organized' || item.Section === 'organized')
                );
                const organizerCount = organizers.length;
                
                // Get all organized_soc items (from backend, they all have section "organized_soc")
                const organizedSocItems = eventDetails.filter((item: any) => 
                    (item.section === 'organized_soc' || item.Section === 'organized_soc')
                );
                
                // Map organized_soc items to organized_soc_0, organized_soc_1, etc.
                const mappedEventDetails = eventDetails.map((item: any) => {
                    const section = item.section || item.Section || '';
                    
                    // If this is an organized_soc item, map it to organized_soc_{organizerIndex}
                    if (section === 'organized_soc') {
                        const socialLinkIndex = organizedSocItems.indexOf(item);
                        const organizerIndex = organizerCount > 0 
                            ? Math.floor(socialLinkIndex / Math.ceil(organizedSocItems.length / organizerCount))
                            : 0;
                        
                        return {
                            ...item,
                            section: `organized_soc_${organizerIndex}` // Map to virtual section for UI
                        };
                    }
                    return item;
                });
                
                this.eventForm.setControl('eventDetails', this.formBuilder.array(
                    mappedEventDetails.map((item: any) => {
                        return this.formBuilder.group({
                            id: item.id || item.Id || '',
                            section: item.section || item.Section || '',
                            imageUrl: item.imageUrl || item.ImageUrl || '',
                            sortOrder: item.sortOrder || item.SortOrder || 0,
                            title: item.title || item.Title || '',
                            description: item.description || item.Description || '',
                            tag: item.tag || item.Tag || '',
                            amount: item.amount || item.Amount || 0,
                            count: item.count || item.Count || 0
                        });
                    })
                ));
                
                // ✅ FIX: Ensure format items exist even if not in database
                this.addInitialValue();
            }
            
            // Handle date formatting
            try {
                if (serverValue.startDate || serverValue.StartDate) {
                    this.eventForm.patchValue({
                        startDate: new Date(serverValue.startDate || serverValue.StartDate).toISOString().split('T')[0]
                    });
                }
                if (serverValue.endDate || serverValue.EndDate) {
                    this.eventForm.patchValue({
                        endDate: new Date(serverValue.endDate || serverValue.EndDate).toISOString().split('T')[0]
                    });
                }
            } catch (e) {
                console.log('[AddEventComponent] Error formatting dates from server value:', e);
            }
            
            // Update uploaded file path if exists
            if (serverValue.titleImageUrl || serverValue.TitleImageUrl) {
                this.uploadedFilePath = serverValue.titleImageUrl || serverValue.TitleImageUrl;
            }
            
            // Force change detection to update UI immediately
            this.cdr.detectChanges();
        } catch (error) {
            console.error('[AddEventComponent] Error updating form with server value:', error);
        }
    }

    // ✅ FIX: Reload event data after update with retry mechanism
    // ✅ OPTIMISTIC CONCURRENCY: Public method to manually refresh event data (e.g., after 409 conflict)
    refreshEventData(): void {
        if (!this.eventId) {
            console.warn('[AddEventComponent] Cannot refresh: eventId is null');
            return;
        }
        
        console.log('[AddEventComponent] Manual refresh requested');
        this.loading = true;
        this.getEventById(this.eventId);
    }
    
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
                                
                                // ✅ FIX A: Update eventDetails FormArray with organized_soc mapping
                                if (res.eventDetails && res.eventDetails.length > 0) {
                                    // Get all organizers to determine how many we have
                                    const organizers = res.eventDetails.filter((item: any) => item.section === 'organized');
                                    const organizerCount = organizers.length;
                                    
                                    // Get all organized_soc items (from backend, they all have section "organized_soc")
                                    const organizedSocItems = res.eventDetails.filter((item: any) => item.section === 'organized_soc');
                                    
                                    // ✅ DEBUG: Log social links being reloaded
                                    console.log('[AddEventComponent] Reload - social links found:', {
                                        totalEventDetails: res.eventDetails.length,
                                        organizerCount: organizerCount,
                                        organizedSocCount: organizedSocItems.length,
                                        organizedSocItems: organizedSocItems.map((item: any) => ({
                                            section: item.section,
                                            tag: item.tag,
                                            title: item.title,
                                            sortOrder: item.sortOrder
                                        }))
                                    });
                                    
                                    // Map organized_soc items to organized_soc_0, organized_soc_1, etc.
                                    const mappedEventDetails = res.eventDetails.map((item: any) => {
                                        // If this is an organized_soc item, map it to organized_soc_{organizerIndex}
                                        if (item.section === 'organized_soc') {
                                            const socialLinkIndex = organizedSocItems.indexOf(item);
                                            const organizerIndex = organizerCount > 0 
                                                ? Math.floor(socialLinkIndex / Math.ceil(organizedSocItems.length / organizerCount))
                                                : 0;
                                            
                                            return {
                                                ...item,
                                                section: `organized_soc_${organizerIndex}` // Map to virtual section for UI
                                            };
                                        }
                                        return item;
                                    });
                                    
                                    this.eventForm.setControl('eventDetails', this.formBuilder.array(
                                        mappedEventDetails.map((item: any) => {
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