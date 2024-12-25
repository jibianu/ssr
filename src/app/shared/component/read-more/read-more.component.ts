import { Component, OnInit, Input, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-read-more',
  templateUrl: './read-more.component.html',
  styleUrls: ['./read-more.component.css']
})
export class ReadMoreComponent implements OnInit {

  @Input() content: string;
  @Input() limit: number;
  @Input() completeWords: boolean;
  lastIndex
  isContentToggled: boolean;
  nonEditedContent: string;

  constructor() {

  }

  ngOnInit() {
    this.nonEditedContent = this.content;
    this.content = this.formatContent(this.content);
  }

  toggleContent() {
    this.isContentToggled = !this.isContentToggled;
    this.content = this.isContentToggled ? this.nonEditedContent : this.formatContent(this.content);
  }

  formatContent(content: string) {
    if (this.completeWords) {
      this.lastIndex = content.substr(0, this.limit).lastIndexOf(' ');
    }
    if (this.content.length > this.limit) {
      return `${content.substr(0, this.limit)}...`;
    } else{
      return `${content.substr(0, this.limit)}`
    }
  }

}
