import { map, switchMap, catchError } from 'rxjs/operators';
import { Category } from './category/category.model';
import { Observable, of, throwError } from 'rxjs';
import { environment } from './../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AuthenticationService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminAppService {
    user: any;
    apiUrl = environment.apiUrl;
    constructor(
        private http: HttpClient,
        private authService: AuthenticationService
    ) {
    }

    getCourses(params,right:boolean=true): Observable<any> {
        if(right)
        return this.http.get<any>(this.apiUrl + `api/course`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/courses`, { params });
    }

    /** Search courses by title for topbar autocomplete. Returns up to 10 items (id, title, slug). */
    searchCourses(keyword: string): Observable<{ id: string; title: string; slug: string }[]> {
        const term = (keyword ?? '').trim();
        if (term.length < 2) return of([]);
        const params = {
            'Filter.Title': term,
            pageSize: '10',
            pageNumber: '1',
            'Sort.PropertyName': 'Title',
            'Sort.IsAscending': 'true'
        };
        return this.http.get<{ results?: any[] }>(this.apiUrl + 'api/course', { params }).pipe(
            map(res => {
                const list = res?.results || [];
                return list.slice(0, 10).map((item: any) => ({
                    id: String(item?.id ?? item?.Id ?? ''),
                    title: item?.title ?? item?.Title ?? '',
                    slug: (item?.slug ?? item?.Slug ?? '').trim()
                }));
            }),
            catchError(() => of([]))
        );
    }

    addCourse(obj) {
        return this.http.post<any>(this.apiUrl + `api/course`, obj);
    }
    addEnrollCourse(obj) {
        return this.http.post<any>(this.apiUrl + `api/course/enrollCourse`, obj);
    }
    updateCourse(obj, id) {
        return this.http.put<any>(this.apiUrl + `api/course/` + id, obj);
    }

    /** Update course from landing sidebar (title, canonicalUrl, categoryId, metaDescription, titleImageUrl, promoVideoUrl). Persists Slug. */
    updateCourseFromLanding(id: string, obj: { title?: string; canonicalUrl?: string; categoryId?: string; metaDescription?: string; titleImageUrl?: string; promoVideoUrl?: string }) {
        return this.http.put<any>(this.apiUrl + `page/course/course/` + id, obj);
    }

    /** Upload course title image to S3; returns { url } or { Url }. Caller should then persist via updateCourseFromLanding. */
    uploadCourseTitleImage(courseId: string, file: File): Observable<{ url?: string; Url?: string }> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        return this.http.post<{ url?: string; Url?: string }>(this.apiUrl + `page/course/course/${courseId}/title-image`, formData);
    }

    /** Upload course promo video to S3; returns { url } or { Url }. Caller should then persist via updateCourseFromLanding. */
    uploadCoursePromoVideo(courseId: string, file: File): Observable<{ url?: string; Url?: string }> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        return this.http.post<{ url?: string; Url?: string }>(this.apiUrl + `page/course/course/${courseId}/promo-video`, formData);
    }

    /** Remove title image from S3 and clear URL in DB. */
    deleteCourseTitleImage(courseId: string): Observable<{ message?: string }> {
        return this.http.delete<{ message?: string }>(this.apiUrl + `page/course/course/${courseId}/title-image`);
    }

    /** Remove promo video from S3 and clear URL in DB. */
    deleteCoursePromoVideo(courseId: string): Observable<{ message?: string }> {
        return this.http.delete<{ message?: string }>(this.apiUrl + `page/course/course/${courseId}/promo-video`);
    }

    getCourseById(id) {
        return this.http.get<any>(this.apiUrl + `api/course/` + id);
    }

    getBlogByCanonicalURL(url) {
        return this.http.get<any>(this.apiUrl + `api/course/` + url);
    }

    getBlogByUser() {
        return this.http.get<any>(this.apiUrl + `api/course/user`);
    }

    deleteCourseById(id) {
        return this.http.delete<any>(this.apiUrl + `api/course/` + id);
    }

    addCategory(obj) {
        return this.http.post<any>(this.apiUrl + `api/category`, obj);
    }

    updateCategory(obj, id) {
        return this.http.put<any>(this.apiUrl + `api/category/` + id, obj);
    }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl + `api/category`);
    }
    getPublishedCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl + `api/category/published`);
    }

    getCategoryById(id): Observable<Category> {
        return this.http.get<any>(this.apiUrl + `api/category/` + id);
    }

    deleteCategoryById(id) {
        return this.http.delete<any>(this.apiUrl + `api/category/` + id);
    }

    getEvents(): Observable<any[]> {
        return this.http.get<any>(this.apiUrl + `api/events`);
    }

    getEventById(eventId: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/events/` + eventId);
    }

    createEvent(obj: any): Observable<any> {
        return this.http.post<any>(this.apiUrl + `api/events`, obj);
    }

    updateEvent(eventId: string, obj: any): Observable<any> {
        return this.http.put<any>(this.apiUrl + `api/events/` + eventId, obj);
    }

    uploadEventTitleImage(file: File): Observable<{ url?: string }> {
        const data = new FormData();
        data.append('file', file, file.name);
        return this.http.post<{ url?: string }>(this.apiUrl + `api/events/TitleImage`, data);
    }

    /** Upload event video to S3; returns { url } to store in event. */
    uploadEventVideo(file: File): Observable<{ url?: string }> {
        const data = new FormData();
        data.append('file', file, file.name);
        return this.http.post<{ url?: string }>(this.apiUrl + `api/events/Video`, data);
    }

    /** Delete event media (title image or video) from S3. Call before clearing the URL from the form so DB and S3 stay in sync. */
    deleteEventMedia(url: string): Observable<{ message?: string }> {
        return this.http.post<{ message?: string }>(this.apiUrl + `api/events/Media/delete`, { url });
    }

    deleteEvent(eventId: string): Observable<any> {
        return this.http.delete(this.apiUrl + `api/events/` + eventId);
    }

    /** Set event publish status. When published, event is shown on site and elearn pages. */
    setEventPublishStatus(eventId: string, isPublished: boolean): Observable<{ message?: string }> {
        return this.http.patch<{ message?: string }>(this.apiUrl + `api/events/` + eventId + `/publish`, { isPublished });
    }

    /** Set event page completion percentage (0-100). */
    setEventProgress(eventId: string, completionPercent: number): Observable<{ message?: string; completionPercent?: number }> {
        return this.http.patch<{ message?: string; completionPercent?: number }>(
            this.apiUrl + `api/events/` + eventId + `/progress`,
            { completionPercent }
        );
    }

    getEventUsers(eventId: string): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl + `api/events/users/` + eventId);
    }

    getUsers(params) {
        return this.http.get<any>(this.apiUrl + `api/user`, { params });
    }

    getStudents(params, right: boolean = true) {
        if (right)
            return this.http.get<any>(this.apiUrl + `api/user/students`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/students`, { params });
    }

    getTrainers(params, right: boolean = true) {
        if (right)
            return this.http.get<any>(this.apiUrl + `api/user/trainers`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/trainers`, { params });

    }

    getCompanies(params, right: boolean = true) {
        if(right)
        return this.http.get<any>(this.apiUrl + `api/user/companies`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/companies`, { params });
    }

    getManagement(params, right: boolean = true): Observable<any> {
        if (!this.authService.currentToken()) {
            return of({ results: [], totalNumberOfRecords: 0 });
        }
        if (right)
            return this.http.get<any>(this.apiUrl + `api/user/management`, { params });
        return this.http.get<any>(this.apiUrl + `api/UserManagement/management`, { params });
    }

    getUserById(Id) {
        return this.http.get<any>(this.apiUrl + `api/user/` + Id);
    }

    /** Admin student drawer: profile, stats, engagement, timeline. */
    getStudentDrawer(studentId: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/admin/analytics/student/${studentId}/drawer`);
    }

    /** Admin student purchases with date filter and pagination. */
    getStudentPurchases(studentId: string, params: { from?: string; to?: string; page?: number; pageSize?: number }): Observable<any> {
        const p: any = { page: params.page ?? 1, pageSize: params.pageSize ?? 10 };
        if (params.from) p.from = params.from;
        if (params.to) p.to = params.to;
        return this.http.get<any>(this.apiUrl + `api/admin/analytics/student/${studentId}/purchases`, { params: p });
    }

    createUser(obj) {
        return this.http.post<any>(this.apiUrl + `api/user`, obj);
    }

    updateUser(id, obj) {
        return this.http.put<any>(this.apiUrl + `api/user/` + id, obj);
    }

    deleteUserById(id) {
        return this.http.delete<any>(this.apiUrl + `api/user/` + id);
    }

    getUserInfo() {
        return this.http.get<any>(this.apiUrl + `api/account/getinfo/`);
    }

    profileUpdate(obj) {
        return this.http.put<any>(this.apiUrl + `api/account/updateinfo/`, obj);
    }

    passwordUpdate(obj) {
        return this.http.put<any>(this.apiUrl + `api/account/changepassword/`, obj);
    }
    inviteUser(obj) {
        return this.http.post<any>(this.apiUrl + `api/UserManagement/invite`, obj);
    }

    uploadImage(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `api/CurriculumVideoLecture/UploadImage`, data);
    }

    deleteImage(imageUrl: string): Observable<any> {
        return this.http.post(this.apiUrl + `api/CurriculumVideoLecture/DeleteImage`, { imageUrl });
    }
    /** Upload file to backend; backend uploads to S3. Always send file in POST to avoid CORS (no direct PUT to S3 from browser). */
    uploadDocumnet(file: File, docType): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        data.append('DocType', docType);
        data.append('userId', 'b9d1cec3-d0ee-4723-bbab-45de466b5cef');
        return this.http.post<{ documentPath?: string; documentComments?: string; isPreSignedUrl?: boolean }>(
            this.apiUrl + 'api/Document/UploadDocument',
            data,
            { reportProgress: true }
        );
    }
    uploadDocumnetLink(fileLink, docType) {
        var obj = {
            "fileLink": fileLink,
            "docType": docType,
            "providerType": "youtube"
        }
        return this.http.post<any>(this.apiUrl + `api/Document/UploadDocumentLink`, obj);
    }

    addDocuments(obj) {
        return this.http.post<any>(this.apiUrl + `api/Document`, obj);
    }
    getDocumentByEntry(id, entry) {
        return this.http.get<any>(this.apiUrl + `api/Document/Entry/${entry}/${id}`);
    }

    /**
     * Check if course is completed for certificate (dynamic certificate view/download).
     */
    checkCertificateCompleted(enrollmentId: string): Observable<{ completed: boolean }> {
        return this.http.get<{ completed: boolean }>(this.apiUrl + `certificate/check/${enrollmentId}`);
    }

    getDocumnetAsFile(doc, docId) {
        return this.http.get(this.apiUrl + `api/Document/download/${doc}/${docId}`, { responseType: 'blob' })
        // .pipe(map((res) => {
        //     return new Blob([res.blob()], {type: res.headers.get('Content-Type')});
        // }));
    }

    uploadVideo(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `api/CurriculumVideoLecture/UploadVideo`, data);
    }

    addLocation(obj) {
        return this.http.post<any>(this.apiUrl + `api/location`, obj);
    }

    updateLocation(obj, id) {
        return this.http.put<any>(this.apiUrl + `api/location/` + id, obj);
    }

    getLocation(): Observable<any> {
        return this.http.get(this.apiUrl + `api/location`);
    }

    getLocationById(id) {
        return this.http.get<any>(this.apiUrl + `api/location/` + id);
    }

    deleteLocationById(id) {
        return this.http.delete<any>(this.apiUrl + `api/location/` + id);
    }

    getCurriculumByCourseId(courseId) {
        return this.http.get<any>(this.apiUrl + `api/curriculum/course/` + courseId);
    }
    getCurriculumByCourseId1(courseId) {
        return this.http.get<any>(this.apiUrl + `api/curriculum/courseByCourse/` + courseId);
    }

    // Curriculum
    addCurriculum(obj, courseId) {
        return this.http.post<any>(this.apiUrl + `api/curriculum/` + courseId, obj);
    }

    deleteCurriculum(curriculumId) {
        return this.http.delete<any>(this.apiUrl + `api/curriculum/` + curriculumId);
    }

    getCurriculumByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/curriculum/` + curriculumId);
    }

    updateCurriculum(obj, curriculumId) {
        return this.http.put<any>(this.apiUrl + `api/curriculum/` + curriculumId, obj);
    }

    // Course FAQ (public landing sidebar)
    getCourseFaqsByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/coursefaq/course/` + courseId);
    }
    addCourseFaq(courseId: string, obj: { question?: string; answer?: string; sortOrder?: number }) {
        return this.http.post<any>(this.apiUrl + `api/coursefaq/course/` + courseId, obj);
    }
    updateCourseFaq(id: string, obj: { question?: string; answer?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/coursefaq/` + id, obj);
    }
    deleteCourseFaq(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/coursefaq/` + id);
    }

    // Course Trainers (public landing sidebar)
    getCourseTrainersByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/coursetrainer/course/` + courseId);
    }
    addCourseTrainer(courseId: string, obj: { name?: string; imageUrl?: string; description?: string; sortOrder?: number }) {
        return this.http.post<any>(this.apiUrl + `api/coursetrainer/course/` + courseId, obj);
    }
    updateCourseTrainer(id: string, obj: { name?: string; imageUrl?: string; description?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/coursetrainer/` + id, obj);
    }
    deleteCourseTrainer(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/coursetrainer/` + id);
    }

    // Course Title Summaries (public landing)
    getCourseSummariesByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/coursesummary/course/` + courseId);
    }
    addCourseSummary(courseId: string, obj: { title?: string; summary?: string }) {
        return this.http.post<any>(this.apiUrl + `api/coursesummary/course/` + courseId, obj);
    }
    updateCourseSummary(id: string, obj: { title?: string; summary?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/coursesummary/` + id, obj);
    }
    deleteCourseSummary(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/coursesummary/` + id);
    }

    // Course About Information (info sections)
    getCourseInformationByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/courseinformation/course/` + courseId);
    }
    addCourseInformation(courseId: string, obj: { title?: string; summary?: string }) {
        return this.http.post<any>(this.apiUrl + `api/courseinformation/course/` + courseId, obj);
    }
    updateCourseInformation(id: string, obj: { title?: string; summary?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/courseinformation/` + id, obj);
    }
    deleteCourseInformation(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/courseinformation/` + id);
    }

    // Course Features
    getCourseFeaturesByCourseId(courseId: string) {
        return this.http.get<any[]>(this.apiUrl + `api/coursefeature/course/` + courseId);
    }
    addCourseFeature(courseId: string, obj: { description?: string }) {
        return this.http.post<any>(this.apiUrl + `api/coursefeature/course/` + courseId, obj);
    }
    updateCourseFeature(id: string, obj: { description?: string; sortOrder?: number }) {
        return this.http.put<any>(this.apiUrl + `api/coursefeature/` + id, obj);
    }
    deleteCourseFeature(id: string) {
        return this.http.delete<any>(this.apiUrl + `api/coursefeature/` + id);
    }

    // Become Course (single title + description)
    getBecomeCourseByCourseId(courseId: string) {
        return this.http.get<any>(this.apiUrl + `api/becomecourse/course/` + courseId);
    }
    upsertBecomeCourse(courseId: string, obj: { title?: string; description?: string }) {
        return this.http.put<any>(this.apiUrl + `api/becomecourse/course/` + courseId, obj);
    }

    // Curriculum Concept

    addCurriculumConcept(obj, curriculumId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumConcept/` + curriculumId, obj);
    }

    deleteCurriculumConcept(curriculumId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumConcept/` + curriculumId);
    }

    getCurriculumConceptById(curriculumConceptId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumConcept/` + curriculumConceptId);
    }

    updateCurriculumConcept(obj, curriculumConceptId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumConcept/` + curriculumConceptId, obj);
    }

    getCurriculumConceptByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumConcept/curriculum/` + curriculumId);
    }

    // Curriculum Topics

    addCurriculumTopic(obj, curriculumId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumTopic/` + curriculumId, obj);
    }

    deleteCurriculumTopic(curriculumId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumTopic/` + curriculumId);
    }

    getCurriculumTopicById(curriculumTopicId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumTopic/` + curriculumTopicId);
    }

    updateCurriculumTopic(obj, curriculumTopicId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumTopic/` + curriculumTopicId, obj);
    }

    getCurriculumTopicByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumTopic/curriculum/` + curriculumId);
    }

    // Curriculum Study material

    addCurriculumStudyMaterial(obj, curriculumId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumStudyMaterial/` + curriculumId, obj);
    }

    deleteCurriculumStudyMaterial(sutdyMateialId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumStudyMaterial/` + sutdyMateialId);
    }

    getCurriculumStudyMaterialById(sutdyMateialId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumStudyMaterial/` + sutdyMateialId);
    }

    updateCurriculumStudyMaterial(obj, sutdyMateialId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumStudyMaterial/` + sutdyMateialId, obj);
    }

    getCurriculumStudyMaterialByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumStudyMaterial/curriculum/` + curriculumId);
    }

    // Curriculum Video

    addCurriculumVideo(obj, curriculumId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumVideoLecture/` + curriculumId, obj);
    }

    deleteCurriculumVideo(videoId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumVideoLecture/` + videoId);
    }

    getCurriculumVideoById(videoId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumVideoLecture/` + videoId);
    }

    updateCurriculumVideo(obj, videoId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumVideoLecture/` + videoId, obj);
    }

    getCurriculumVideoByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumVideoLecture/curriculum/` + curriculumId);
    }

    // Curriculum Question Set

    addCourseQuestionSet(obj, courseId) {
        return this.http.post<any>(this.apiUrl + `api/CurriculumQuestionSet/` + courseId, obj);
    }

    deleteCurriculumQuestionSet(questionSetId) {
        return this.http.delete<any>(this.apiUrl + `api/CurriculumQuestionSet/` + questionSetId);
    }

    getQuetionSetCourseId(courseId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/course/` + courseId);
    }

    updateCurriculumQuestionSet(obj, questionSetId) {
        return this.http.put<any>(this.apiUrl + `api/CurriculumQuestionSet/` + questionSetId, obj);
    }

    getCurriculumQuestionSetByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/curriculum/` + curriculumId);
    }

    //add questions

    addQuestion(obj) {
        return this.http.post<any>(this.apiUrl + `api/question`, obj);
    }

    deleteQuestion(questionId) {
        return this.http.delete<any>(this.apiUrl + `api/question/` + questionId);
    }

    getQuestionById(questionId) {
        return this.http.get<any>(this.apiUrl + `api/question/` + questionId);
    }

    updateQuestion(obj, questionId) {
        return this.http.put<any>(this.apiUrl + `api/question/` + questionId, obj);
    }

    getQuestionByquestionSetId(questionSetId) {
        return this.http.get<any>(this.apiUrl + `api/question/questionSet/` + questionSetId);
    }

    getQuestionsByCurriculumId(curriculumId) {
        return this.http.get<any>(this.apiUrl + `api/Question/questionbycurriculum/` + curriculumId);
    }

    getQuestionsByCourseId(courseId) {
        return this.http.get<any>(this.apiUrl + `api/Question/questionbycourse/` + courseId);
    }

    getAllQuestionsByCourseId(courseId) {
        return this.http.get<any>(this.apiUrl + `api/Question/questionbycourseandcurriculum/` + courseId);
    }

    // getRandomQuestions(questionSetId, difficultyLevelId) {
    //     return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/` + questionSetId + `/random/` + difficultyLevelId);
    // }

    getRandomQuestions(courseId, difficultyLevelId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/` + courseId + `/randomByCourse/` + difficultyLevelId);
    }

    getQuestionsetById(questionSetId) {
        return this.http.get<any>(this.apiUrl + `api/CurriculumQuestionSet/questionSet/` + questionSetId);
    }
    Get(apiUrl) {
        return this.http.get<any>(this.apiUrl + apiUrl)
            .toPromise()
            .then(response => response);
    }
    updateStudent(params) {
        return this.http.put<any>(this.apiUrl + `api/User/userpermissions/update`, params);
    }
    getCourseByCategory(categoryID) {
        return this.http.get<any>(this.apiUrl + `api/Course/ByCategory/` + categoryID)
            .toPromise()
            .then(response => response);;
    }
    getCourseByUserAndCategory(userId, categoryID) {
        return this.http.get<any>(this.apiUrl + `api/Course/ByUserCategory/` + userId + '/' + categoryID)
            .toPromise()
            .then(response => response);;
    }
    getCategoriesForModal() {
        return this.http.get<Category[]>(this.apiUrl + `api/category`)
            .toPromise()
            .then(response => response);;
    }
    enrollCourse(obj) {
        return this.http.post<any>(this.apiUrl + `api/Course/EnrollCourses`, obj);
    }
    getCourseByCourseID(id: string, skipCache?: boolean) {
        const url = skipCache
            ? `${this.apiUrl}api/Course/${id}?_t=${Date.now()}`
            : `${this.apiUrl}api/Course/${id}`;
        return this.http.get(url);
    }
    publishCourse(id): Observable<any> {
        return this.http.patch<any>(this.apiUrl + `api/Course/Publish/` + id, null);
    }
    unPublishCourse(id): Observable<any> {
        return this.http.patch<any>(this.apiUrl + `api/Course/UnPublish/` + id, null);
    }
    /** Set visibility on Elearn LMS and Public marketing page (checkbox-based). */
    setCourseVisibility(courseId: string, showOnLms: boolean, showOnPublic: boolean): Observable<any> {
        return this.http.patch<any>(this.apiUrl + `api/Course/Visibility/` + courseId, { showOnLms, showOnPublic });
    }
    /** Set ShowOnPublicListing = true for all published courses so they appear on the public site. Returns { updatedCount, message }. */
    setShowOnPublicForAllPublished(): Observable<{ updatedCount: number; message?: string }> {
        return this.http.post<{ updatedCount: number; message?: string }>(this.apiUrl + `api/Course/publish-all-to-public`, {});
    }
    updateProgress(id,progress): Observable<any> {
        var data={
            progress:progress,
            courseId:id
        }
        return this.http.post<any>(this.apiUrl + `api/Course/UpdateProgress/` + id, data);
    }
    getAuthor(right:boolean=true,param:string=''): Observable<any> {
        if(right)
        return this.http.get<any>(this.apiUrl + `api/User/trainers?${param}`);
        return this.http.get<any>(this.apiUrl + `api/UserManagement/trainers?${param}`);
    }
    addCourseProgress(obj) {
        return this.http.post<any>(this.apiUrl + `api/CourseProgress`, obj);
    }
    addCourseProgressDetail(obj) {
        return this.http.post<any>(this.apiUrl + `api/CourseProgress/AddCourseProgressDetail`, obj);
    }
    /** Save watch progress for a curriculum (video). When progress >= 90%, curriculum is marked completed. */
    saveCurriculumWatchProgress(payload: { curriculumId: string; secondsWatched: number; videoDurationSeconds?: number }) {
        return this.http.post<any>(this.apiUrl + `api/CourseProgress/SaveCurriculumWatchProgress`, payload);
    }
    getEnrolledCourses(params): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/Course/GetEnrolledCourse`, { params });
    }
    startTest(obj) {
        return this.http.post<any>(this.apiUrl + `api/Test/StartTest`, obj);
    }
    saveTestsDetail(obj) {
        return this.http.post<any>(this.apiUrl + `api/Test/SaveTestsDetail`, obj);
    }
    submitTests(obj) {
        return this.http.post<any>(this.apiUrl + `api/Test/SubmitTests`, obj);
    }
    addWishList(obj) {
        return this.http.post<any>(this.apiUrl + `api/WishLists`, obj);
    }
    updateWishList(obj) {
        return this.http.put<any>(this.apiUrl + `api/WishLists/${obj.wishListId}`, obj);
    }
    getWishList() {
        return this.http.get<any>(this.apiUrl + `api/WishLists`);
    }
    getWishListbyId(id) {
        return this.http.get<any>(this.apiUrl + `api/WishLists/${id}`);
    }
    getTestsResult(questionSetId) {
        return this.http.get<any>(this.apiUrl + `api/Test/GetTestsResult/` + questionSetId);
    }
    addUserManagemntMap(obj) {
        return this.http.post<any>(this.apiUrl + `api/UserManagement/AddUsers`, obj);
    }
    assignTrainersToManagement(managementUserId: string, trainerUserIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/trainers/map`, {
            managementUserId,
            trainerUserIds
        });
    }
    unmapTrainerFromManagement(managementUserId: string, trainerUserId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/trainers/unmap`, {
            body: { managementUserId, trainerUserId }
        });
    }
    mapCompaniesToManagement(managementUserId: string, companyUserIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/companies/map`, {
            managementUserId,
            companyUserIds
        });
    }
    unmapCompanyFromManagement(managementUserId: string, companyUserId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/companies/unmap`, {
            body: { managementUserId, companyUserId }
        });
    }
    getMappedCompaniesForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/companies`, { params: params || {} });
    }
    getAssignedCompaniesForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/companies`, { params: params || {} });
    }
    mapManagementsToManagement(parentManagementUserId: string, managementUserIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/management-users/map`, {
            managementUserId: parentManagementUserId,
            managementUserIds
        });
    }
    unmapManagementFromManagement(parentManagementUserId: string, childManagementUserId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/management-users/unmap`, {
            body: { managementUserId: parentManagementUserId, childManagementUserId }
        });
    }
    getMappedManagementsForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/management-users`, { params: params || {} });
    }
    getAssignedManagementsForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/management-users`, { params: params || {} });
    }
    mapStudentsToManagement(managementUserId: string, studentUserIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/students/map`, {
            managementUserId,
            studentUserIds
        });
    }
    unmapStudentFromManagement(managementUserId: string, studentUserId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/students/unmap`, {
            body: { managementUserId, studentUserId }
        });
    }
    getMappedStudentsForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/students`, { params: params || {} });
    }
    getAssignedStudentsForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/students`, { params: params || {} });
    }
    mapCoursesToManagement(managementUserId: string, courseIds: string[]) {
        return this.http.post<any>(this.apiUrl + `api/Management/courses/map`, {
            managementUserId,
            courseIds
        });
    }
    unmapCourseFromManagement(managementUserId: string, courseId: string) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/courses/unmap`, {
            body: { managementUserId, courseId }
        });
    }
    unmapCoursesFromManagement(managementUserId: string, courseIds: string[]) {
        return this.http.request<any>('delete', this.apiUrl + `api/Management/courses/unmap-bulk`, {
            body: { managementUserId, courseIds }
        });
    }
    getMappedCoursesForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/courses`, { params: params || {} });
    }
    getAssignedCoursesForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/courses`, { params: params || {} });
    }
    getMappedTrainersForManagement(managementUserId: string, params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/${managementUserId}/trainers`, { params: params || {} });
    }
    getAssignedTrainers() {
        return this.http.get<any[]>(this.apiUrl + `api/Management/profile/trainers`);
    }
    /** Get current Management user's permissions (StudentList, TrainerList, etc.) for sidebar filtering. */
    getMyManagementPermissions() {
        return this.http.get<string[]>(this.apiUrl + `api/Management/profile/permissions`);
    }
    getAssignedTrainersForManagement(params?: any) {
        return this.http.get<any>(this.apiUrl + `api/Management/trainers`, { params: params || {} });
    }
    getManagementTrainerById(trainerId: string) {
        return this.http.get<any>(this.apiUrl + `api/Management/trainers/${trainerId}`);
    }
    lockManagementTrainer(trainerId: string, locked: boolean) {
        return this.http.post<any>(this.apiUrl + `api/Management/trainers/${trainerId}/lock`, { locked });
    }
    enrollManagementTrainerCourse(request: any) {
        return this.http.post<any>(this.apiUrl + `api/Management/trainers/enroll`, request);
    }
    getManagementByUser(userId) {
        return this.http.get<any>(this.apiUrl + `api/UserManagement/Management/` + userId);
    }
    getManagementByCourse(courseId: string) {
        return this.http.get<any>(this.apiUrl + `api/Management/courses/` + courseId + `/managements`);
    }
    addToGroupUser(obj){
        return this.http.post<any>(this.apiUrl + `api/UserManagement/addtogroup`, obj);
    }
    getUserGroups(userId){
        return this.http.get<any>(this.apiUrl + `api/UserManagement/usergroups/${userId}`);
    }
    GetPermissionByAction(actionName) {
        var ac = btoa(actionName);
        return this.http.get<any>(this.apiUrl + `api/UserManagement/userpermissions/` + ac);
    }

    deleteUserManagemntMap(id) {
        return this.http.delete<any>(this.apiUrl + `api/UserManagement/RemoveUser/` + id);
    }

    // prices
    addCoursePrices(courseId,obj) {
        return this.http.post<any>(this.apiUrl + `api/Course/price/${courseId}`, obj);
    }
    updateCoursePrices(obj,id) {
        return this.http.put<any>(this.apiUrl + `api/Course/price/${id}`, obj);
    }
    deleteCoursePrices(id) {
        return this.http.delete<any>(this.apiUrl + `api/Course/price/${id}`);
    }
    getCoursePrices(courseId){
        return this.http.get<any>(this.apiUrl + `api/Course/prices/${courseId}`);
    }
    /** Start purchase (Buy flow): returns status + redirectUrl. already_enrolled | enrolled → course page; payment_required → checkout. */
    startPurchase(courseId: string) {
        return this.http.post<{ status: string; redirectUrl: string }>(this.apiUrl + `api/Course/start-purchase`, { courseId });
    }
    getCheckout(courseId){
        return this.http.get<any>(this.apiUrl + `api/Payment/checkout/${courseId}`);
    }
    createPaymentIntent(courseId,obj){
        return this.http.post<any>(this.apiUrl + `api/Payment/intent/${courseId}`,obj);
    }
    verifyPayment(sessionId,obj){
        return this.http.post<any>(this.apiUrl + `api/Payment/checkout/verify/${sessionId}`,obj);
    }

    /** Send push notification to students (Admin/Management). targetAudience: 'all_students' | 'selected' | 'by_category'; categoryId when by_category. */
    sendPushNotification(body: { title: string; message: string; type?: string; linkUrl?: string; targetAudience: string; userIds?: string[]; categoryId?: string }) {
        return this.http.post<{ message: string; count: number }>(this.apiUrl + `api/push-notifications/send`, body);
    }

    /** Get all notifications list (Admin/Management). */
    getNotificationList(page = 1, pageSize = 20, type?: string) {
        let params: any = { page: String(page), pageSize: String(pageSize) };
        if (type && type.trim()) params.type = type.trim();
        return this.http.get<any>(this.apiUrl + `api/push-notifications/list`, { params });
    }

    /** Notification history (sent notifications) with filters and paging. */
    getNotificationHistory(params: {
        title?: string;
        type?: string;
        sendTo?: string;
        fromDate?: string;
        toDate?: string;
        pageSize?: number;
        pageNumber?: number;
        sortPropertyName?: string;
        sortIsAscending?: boolean;
    }) {
        const q: any = {
            pageSize: String(params.pageSize ?? 20),
            pageNumber: String(params.pageNumber ?? 1)
        };
        if (params.title != null && params.title.trim()) q.title = params.title.trim();
        if (params.type != null && params.type.trim()) q.type = params.type.trim();
        if (params.sendTo != null && params.sendTo.trim()) q.sendTo = params.sendTo.trim();
        if (params.fromDate != null && params.fromDate.trim()) q.fromDate = params.fromDate.trim();
        if (params.toDate != null && params.toDate.trim()) q.toDate = params.toDate.trim();
        if (params.sortPropertyName != null && params.sortPropertyName.trim()) q.sortPropertyName = params.sortPropertyName.trim();
        if (params.sortIsAscending != null) q.sortIsAscending = params.sortIsAscending;
        return this.http.get<{ items: any[]; totalCount: number }>(this.apiUrl + `api/notifications`, { params: q });
    }

    /** Get single notification history item by id (for View panel). */
    getNotificationHistoryById(id: string) {
        return this.http.get<any>(this.apiUrl + `api/notifications/${id}`);
    }

    /** Update notification history record (Title, Type, SendTo, CreatedAt, Link, Message). */
    updateNotificationHistory(id: string, body: { title: string; message: string; type: string; linkUrl?: string; sendTo?: string; categoryId?: string; createdAt?: string }) {
        return this.http.put<{ message: string }>(this.apiUrl + `api/notifications/${id}`, body);
    }

    /** Delete notification history record. */
    deleteNotificationHistory(id: string) {
        return this.http.delete<{ message: string }>(this.apiUrl + `api/notifications/${id}`);
    }
}

