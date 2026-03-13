import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Wrapper module for ng-multiselect-dropdown (View Engine library)
// This allows the library to work with Angular Ivy despite View Engine incompatibility
@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [],
  exports: []
})
export class MultiselectWrapperModule {
  // This module acts as a placeholder
  // Multi-select components will be loaded dynamically if needed
  // TODO: Replace with @angular/material/select with multiple selection or Ivy-compatible alternative
}
