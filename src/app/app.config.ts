import { provideHttpClient, withFetch } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { routes } from "./app-routing.module";
import { provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from "@angular/core";
import { provideClientHydration, withEventReplay } from "@angular/platform-browser";

export const appConfig = {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideZoneChangeDetection({ eventCoalescing: true }),
      provideClientHydration(withEventReplay()),
      provideRouter(routes),
      provideHttpClient(withFetch()),
      provideAnimations()
    ]
  };
  