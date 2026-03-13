import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Wrapper module for ngx-owl-carousel-o (View Engine library)
// This allows the library to work with Angular Ivy despite View Engine incompatibility
@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [],
  exports: []
})
export class CarouselWrapperModule {
  // This module acts as a placeholder
  // The carousel components will be loaded dynamically if needed
  // TODO: Replace ngx-owl-carousel-o with Ivy-compatible alternative (e.g., Swiper)
}
