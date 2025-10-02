 import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxSpinnerModule } from "ngx-spinner";
import { AuthModule } from './modules/auth/auth.module';
import { SharedModule } from './shared/shared.module';

 @Component({
    selector: 'app-root' ,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [
      AuthModule,
      RouterModule,
      NgxSpinnerModule,
      SharedModule // ✅ This includes ToasterComponent, if properly exported
    ]
    
})
 export class AppComponent {
   title = 'Course';
   

   
 }

