import { UntypedFormControl } from '@angular/forms';
import { Component, Input, OnInit, Output, EventEmitter, OnChanges } from '@angular/core';

@Component({
  selector: 'app-icon-dropdown',
  templateUrl: './icon-dropdown.component.html',
  styleUrls: ['./icon-dropdown.component.scss']
})
export class IconDropdownComponent implements OnInit, OnChanges {

  constructor() { }

  @Input() iconList = [];
  @Input() modelValue;
  @Input() controlName: UntypedFormControl;
  @Input() modelName: any = [];
  dropdownIconSettings;
  @Output() iconChange = new EventEmitter<any>();

  ngOnInit(): void {
    this.dropdownIconSettings = {
      singleSelection: true,
      itemsShowLimit: 5,
      idField: 'id',
      textField: 'url',
      closeDropDownOnSelection: true
    };
  }

  ngOnChanges() {
    if (this.modelValue && this.iconList.length > 0) {
      if (this.modelValue.value && this.modelValue.value.iconId) {
        let data = this.iconList.filter(x => x.id === this.modelValue.value.iconId);
        this.modelName = data;
      }
    }
  }

  onIconSelect(item: any) {
    this.iconChange.emit(item);
  }

  get getItems() {
    if (this.iconList && this.iconList.length > 0) {
      return this.iconList.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {});
    }
  }

}
