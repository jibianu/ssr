import { ToasterService } from './toaster.service';
import { Component, OnInit, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-toaster',
  templateUrl: './toaster.component.html',
  styleUrls: ['./toaster.component.scss'],
  // tslint:disable-next-line:no-host-metadata-property
  host: { '[class.ngb-toasts]': 'true' }
})
export class ToasterComponent implements OnInit {

  constructor(public toastService: ToasterService) { }

  isTemplate(toast) { return toast.textOrTpl instanceof TemplateRef; }

  ngOnInit() {
  }

}
