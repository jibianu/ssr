import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment.prod';
import { Injectable } from '@angular/core';

@Injectable()
export class ChatService {
    apiUrl = environment.apiUrl;
    constructor(private http: HttpClient) {
    }

    getChat(userId): Observable<any> {
        return this.http.get<any>(this.apiUrl + `api/Chat/` + userId);
    }

    postChat(obj) {
        return this.http.post<any>(this.apiUrl + `api/Chat`, obj);
    }

    getUnreadCount() {
        return this.http.get<any>(this.apiUrl + `api/Chat/unreadcount`);
    }

    getUnreadCountByUserId(id) {
        return this.http.get<any>(this.apiUrl + `api/Chat/unreadcount/` + id);
    }
    
}