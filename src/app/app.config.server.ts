import { ApplicationConfig, LOCALE_ID, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Server default locale (can be overridden later if needed)
    { provide: LOCALE_ID, useFactory: () => process.env['DEFAULT_LOCALE'] || 'en-US' }
  ]
};

// ✅ Merge client and server configs properly
// mergeApplicationConfig will handle provider merging correctly
// Browser-only providers like provideClientHydration won't cause issues on server
export const config = mergeApplicationConfig(appConfig, serverConfig);
