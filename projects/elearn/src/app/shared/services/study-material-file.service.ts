import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StudyMaterialFileDto } from '../models/study-material.model';

@Injectable({ providedIn: 'root' })
export class StudyMaterialFileService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getFiles(studyMaterialId: string): Observable<StudyMaterialFileDto[]> {
    return this.http.get<StudyMaterialFileDto[]>(
      `${this.apiUrl}api/StudyMaterialFile/section/${studyMaterialId}`
    );
  }

  uploadFile(studyMaterialId: string, file: File): Observable<{ progress: number; result?: StudyMaterialFileDto }> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<StudyMaterialFileDto>(`${this.apiUrl}api/StudyMaterialFile/${studyMaterialId}`, form, {
        reportProgress: true,
        observe: 'events'
      })
      .pipe(
        map((event: HttpEvent<StudyMaterialFileDto>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            return { progress: Math.round((100 * event.loaded) / event.total) };
          }
          if (event.type === HttpEventType.Response) {
            return { progress: 100, result: event.body ?? undefined };
          }
          return { progress: 0 };
        })
      );
  }

  deleteFile(fileId: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}api/StudyMaterialFile/${fileId}`);
  }

  private static readonly emptyGuid = '00000000-0000-0000-0000-000000000000';

  /** Same-origin PDF bytes (JWT via interceptor) — avoids S3 CORS. */
  getFileContent(fileId: string, fileUrl?: string): Observable<ArrayBuffer> {
    const id = (fileId || '').trim();
    const url = (fileUrl || '').trim();
    const hasValidId = id && id !== StudyMaterialFileService.emptyGuid;

    const byUrl = () =>
      this.http.get(`${this.apiUrl}api/StudyMaterialFile/stream`, {
        params: { fileUrl: url },
        responseType: 'arraybuffer'
      });

    if (hasValidId) {
      return this.http
        .get(`${this.apiUrl}api/StudyMaterialFile/${id}/content`, { responseType: 'arraybuffer' })
        .pipe(catchError(() => (url ? byUrl() : throwError(() => new Error('File not found')))));
    }
    if (url) {
      return byUrl();
    }
    return throwError(() => new Error('Missing file id or URL'));
  }
}
