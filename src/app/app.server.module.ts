
import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';

@NgModule({
  imports: [
    // Client app module
    AppModule,
    // Server-specific providers and services
    ServerModule,
  ],
  // Bootstrap the same component as the app module
  bootstrap: [AppComponent],
})
export class AppServerModule {}