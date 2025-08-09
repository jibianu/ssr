// main.server.ts

import { AppComponent } from './app/app.component';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { appConfig } from './main'; // where providers like routing/http are defined

export default () =>
  renderApplication(AppComponent, {
    ...appConfig,
    providers: [
      provideServerRendering(),
      ...(appConfig.providers || [])
    ]
  });