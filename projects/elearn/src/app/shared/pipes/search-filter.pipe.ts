import { Pipe, PipeTransform } from '@angular/core';

/**
 * Ivy-compatible replacement for ng2-search-filter
 * Filters an array of objects based on a search term
 */
@Pipe({
  name: 'filter',
  standalone: false
})
export class FilterByPipe implements PipeTransform {
  transform(items: any[], searchText: string, fields?: string[]): any[] {
    if (!items) {
      return [];
    }
    if (!searchText) {
      return items;
    }

    searchText = searchText.toLowerCase();

    return items.filter(item => {
      if (fields && fields.length > 0) {
        // Search in specific fields
        return fields.some(field => {
          const value = this.getNestedValue(item, field);
          return value && value.toString().toLowerCase().includes(searchText);
        });
      } else {
        // Search in all string/number properties
        return Object.keys(item).some(key => {
          const value = item[key];
          if (value != null) {
            return value.toString().toLowerCase().includes(searchText);
          }
          return false;
        });
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o && o[p], obj);
  }
}
