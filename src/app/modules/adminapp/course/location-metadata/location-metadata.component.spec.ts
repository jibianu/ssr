import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationMetadataComponent } from './location-metadata.component';

describe('LocationMetadataComponent', () => {
  let component: LocationMetadataComponent;
  let fixture: ComponentFixture<LocationMetadataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LocationMetadataComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationMetadataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
