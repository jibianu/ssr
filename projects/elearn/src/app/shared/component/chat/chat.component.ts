import { Subscription } from 'rxjs';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ChatService } from './chat.service';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss'],
    providers: [ChatService],
    standalone: false
})
export class ChatComponent implements OnInit {

  userId = '';
  subscription: Subscription = new Subscription();
  constructor(
    private cookieService: CookieService,
    private chatService: ChatService,
  ) { }

  ngOnInit(): void {
    const raw = this.cookieService.getCookie('currentUser');
    if (!raw) return;
    let user: { id?: string } | null = null;
    try {
      user = JSON.parse(raw);
    } catch {
      return;
    }
    this.userId = user?.id ?? '';
    if (this.userId) {
      this.getChatByUserId(this.userId);
      this.getUnreadCount(this.userId);
    }
  }

  getChatByUserId(id){
    this.subscription.add(this.chatService.getChat(id).subscribe(() => {
    }));
  }

  getUnreadCount(id){
    this.subscription.add(this.chatService.getUnreadCountByUserId(id).subscribe(() => {
    }));
  }

  sendMessage(){
    let obj = {
      "message": "string",
      "attachmentUrl": "string",
      "toUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    }
    this.subscription.add(this.chatService.postChat(obj).subscribe(() => {
    }));
  }

}
