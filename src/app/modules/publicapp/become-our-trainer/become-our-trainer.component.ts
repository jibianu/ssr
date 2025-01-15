import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
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
  constructor(private router: Router ,
 
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}
  ngOnInit(): void {

   
      this.setCanonicalURL('https://www.oilandgasclub.com/become-our-traine');
           this.titleService.setTitle('Become an Instructor | Teach Oil and Gas Courses Online - Oilandgasclub');
       this.metaService.addTags([
        { name: 'description', content: 'Become a trainer with Oil and Gas Club and share your expertise in the oil and gas industry. Empower learners worldwide by delivering professional courses and certifications. Join our global team of industry leaders today!' },
        { name: 'keywords', content: 'become a trainer, oil and gas training, professional trainer opportunity industry experts, oil and gas industry training, teaching opportunities, professional certifications, career as a trainer, oil and gas courses, trainer application, global training team, share industry knowledge.' },
      ]);
    }
  
    setCanonicalURL(url: string): void {
      // Remove any existing canonical link
      const existingLink: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
      if (existingLink) {
        existingLink.setAttribute('href', url);
      } else {
        // Create a new canonical link
        const link: HTMLLinkElement = this.renderer.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', url);
        this.renderer.appendChild(this.document.head, link);
      }
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
