import '@angular/localize/init';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig, appConfigWithoutHydration } from './app/app.config';

const isHydratedSsr = typeof document !== 'undefined' && document.documentElement?.hasAttribute('ng-server-context');

const configToUse = isHydratedSsr ? appConfig : appConfigWithoutHydration;

const bootstrap = () => bootstrapApplication(AppComponent, configToUse)
  .catch(err => console.error(err));

if (typeof document !== 'undefined') {
  if (document.readyState === 'complete') {
    bootstrap();
  } else {
    document.addEventListener('DOMContentLoaded', () => bootstrap());
  }
}

