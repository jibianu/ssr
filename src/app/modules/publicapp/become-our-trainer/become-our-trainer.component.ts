import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-become-our-trainer',
  templateUrl: './become-our-trainer.component.html',
  styleUrls: ['./become-our-trainer.component.scss']
})
export class BecomeOurTrainerComponent implements OnInit {
  dropdownTitle = 8;
  dropdownValue = 84000;
  submitted = false;
  dropdownValues = [
    {title: 2, value: 21000},
    {title: 4, value: 42000},
    {title: 8, value: 84000},
  ];
  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  setDropdown(title: number, countTarget: number): void {
    this.dropdownTitle = title;
    if (this.dropdownValue < countTarget) {
      this.changeValuePositive(countTarget);
    } else {
      this.changeValueNagitive(countTarget);
    }
  }
  custommsg(): void {
    this.router.navigate(['home']);
  }

  changeValuePositive(countTarget: number): void {
    if (this.dropdownValue < countTarget) {
        this.dropdownValue += 500;
        setTimeout(() => {
          this.changeValuePositive(countTarget);
        }, 1);
      } else {
        this.dropdownValue = countTarget;
      }
  }
  changeValueNagitive(countTarget: number): void {
    if (this.dropdownValue > countTarget) {
      this.dropdownValue -= 500;
      setTimeout(() => {
        this.changeValueNagitive(countTarget);
      }, 1);
    } else {
      this.dropdownValue = countTarget;
    }
  }
  navigationHome = (): void => {
    if (this.submitted || false) {
      this.router.navigate(['home']);
    }
  }
}
