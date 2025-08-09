 import { Component } from '@angular/core';
import { AuthRoutingModule } from "./modules/auth/auth-routing.module";
import { NgxSpinnerModule } from "ngx-spinner";
import { SharedModule } from './shared/shared.module';
import { ToasterComponent } from './shared/component/toaster/toaster.component';

 @Component({
    selector: 'app-root' ,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [
      AuthRoutingModule,
      NgxSpinnerModule,
      SharedModule // ✅ This includes ToasterComponent, if properly exported
    ]
    
})
 export class AppComponent {
   title = 'Course';
   

   
 }

