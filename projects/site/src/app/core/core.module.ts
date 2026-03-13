// ✅ REMOVED: Interceptors are now provided in app.config.ts and app.config.server.ts
// This prevents duplicate registration since the app uses standalone components with bootstrapApplication
// CoreModule is kept for backward compatibility but interceptors are registered via ApplicationConfig providers
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    // ✅ Interceptors are provided in app.config.ts and app.config.server.ts
    // No need to register here to avoid duplicate registration
  ]
})
export class CoreModule { }
