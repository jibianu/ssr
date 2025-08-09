// import { enableProdMode } from '@angular/core';
// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// import { AppModule } from './app/app.module';
// import { environment } from './environments/environment';

// if (environment.production) {
//   enableProdMode();
// }


// function bootstrap() {
//   platformBrowserDynamic().bootstrapModule(AppModule)
//     .catch((err: unknown) => {
//       console.error('Bootstrap error:', err instanceof Error ? err.stack : String(err));
//     });
// }

// if (document.readyState === 'complete') {
//   bootstrap();
// } else {
//   document.addEventListener('DOMContentLoaded', bootstrap);
// }

// // document.addEventListener('DOMContentLoaded', () => {
// //   platformBrowserDynamic().bootstrapModule(AppModule)
// //   .catch(err => console.error(err));
// // });
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
