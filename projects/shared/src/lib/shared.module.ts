import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiUrlService } from './services/api-url.service';
import { AuthService } from './services/auth.service';
import { API_URL_TOKEN } from './tokens';

@NgModule({
  imports: [CommonModule],
  declarations: [],
  exports: [CommonModule]
})
export class SharedModule {
  static forRoot(apiUrl: string): ModuleWithProviders<SharedModule> {
    return {
      ngModule: SharedModule,
      providers: [
        { provide: API_URL_TOKEN, useValue: apiUrl },
        ApiUrlService,
        AuthService
      ]
    };
  }
}
