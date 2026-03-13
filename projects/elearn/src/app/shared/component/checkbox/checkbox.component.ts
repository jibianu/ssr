import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-checkbox',
    templateUrl: './checkbox.component.html',
    styleUrls: ['./checkbox.component.scss'],
    standalone: false
})
export class CheckboxComponent implements OnInit {

  @Input() permissionResponse: any;
  constructor() { }

  ngOnInit(): void {
    debugger
    console.log(this.permissionResponse);
    this.permissionResponse.forEach(element => {
      console.log(element.name)
    });
  }

}
