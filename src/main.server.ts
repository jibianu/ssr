// ✅ FIX: Load $localize for i18n support during SSR
// NOTE: This import is necessary for SSR even though Angular recommends including it in polyfills.ts
// The polyfills.ts is loaded for browser bundles, but SSR needs $localize in main.server.ts
// This build warning is expected and can be safely ignored for SSR builds
// The $localize function must be available in the global scope during server-side rendering
// @ts-ignore - Angular build tool warns about direct import, but it's required for SSR i18n support
import '@angular/localize/init';

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

const bootstrap = () => bootstrapApplication(AppComponent, config);

export default bootstrap;
