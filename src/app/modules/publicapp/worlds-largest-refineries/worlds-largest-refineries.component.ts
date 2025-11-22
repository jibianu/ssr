

import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

interface Refinery {
  rank: number;
  name: string;
  location: string;
  capacity: string;
}

@Component({
  selector: 'app-worlds-largest-refineries',
  templateUrl: './worlds-largest-refineries.component.html',
  styleUrls: ['./worlds-largest-refineries.component.scss'],
  standalone: false
})
export class WorldsLargestRefineriesComponent implements OnInit {

  refineries: Refinery[] = [
    { rank: 1, name: 'Jamnagar Refinery (Reliance Industries Ltd.)', location: 'Jamnagar, Gujarat, India', capacity: '1,240,000' },
    { rank: 2, name: 'Paraguana Refinery Complex (PDVSA)', location: 'Paraguana, Falcon, Venezuela', capacity: '940,000' },
    { rank: 3, name: 'SK Energy Ulsan Refinery (SK Energy)', location: 'Ulsan, South Korea', capacity: '850,000' },
    { rank: 4, name: 'Ruwais Refinery (ADNOC Refining)', location: 'Ruwais, UAE', capacity: '817,000' },
    { rank: 5, name: 'GS Caltex Yeosu Refinery (GS Caltex)', location: 'Yeosu, South Korea', capacity: '730,000' },
    { rank: 6, name: 'S-Oil Onsan Refinery (S-Oil)', location: 'Ulsan, South Korea', capacity: '670,000' },
    { rank: 7, name: 'ExxonMobil Refinery', location: 'Jurong, Singapore', capacity: '605,000' },
    { rank: 8, name: 'Port Arthur Refinery (Motiva Enterprises)', location: 'Port Arthur, Texas, USA', capacity: '600,250' },
    { rank: 9, name: 'Baytown Refinery (ExxonMobil)', location: 'Baytown, Texas, USA', capacity: '560,500' },
    { rank:10, name: 'Ras Tanura Refinery (Saudi Aramco)', location: 'Ras Tanura, Saudi Arabia', capacity: '550,000' },
    { rank:11, name: 'Garyville Refinery (Marathon Petroleum)', location: 'Garyville, Louisiana, USA', capacity: '539,000' },
    { rank:12, name: 'Baton Rouge Refinery (ExxonMobil)', location: 'Baton Rouge, Louisiana, USA', capacity: '502,500' },
    { rank:13, name: 'Abadan Refinery (NIOC)', location: 'Abadan, Iran', capacity: '450,000' },
    { rank:14, name: 'SAMREF (Aramco Mobil Refinery)', location: 'Yanbu, Saudi Arabia', capacity: '405,000' },
    { rank:15, name: 'Shell Pernis (Royal Dutch Shell)', location: 'Rotterdam, The Netherlands', capacity: '416,000' }
  ];

  heroStats = [
    { label: 'Global Capacity', value: '10.2M+', detail: 'Barrels refined every day by the top 15 sites' },
    { label: 'Continents', value: '4', detail: 'Asia, Middle East, Americas & Europe' },
    { label: 'Upgrades', value: '24/7', detail: 'Continuous debottlenecking & green retrofits' }
  ];

  insights = [
    'Mega refineries thrive near deep-water ports, enabling flexibility between domestic and export markets.',
    'Asian refiners lead in petrochemical integration, while Gulf Coast sites focus on heavy-crude conversion.',
    'New energy mandates are pushing every complex to invest in carbon capture, hydrogen, and efficiency upgrades.'
  ];

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/worlds-largest-refineries');
    this.titleService.setTitle('World’s Largest Refineries - Oil and Gas Club');
    this.metaService.addTags([
      { name: 'description', content: "Explore the world's largest refineries, their impact on the oil and gas industry, technological advancements, and their crucial role in global energy production. Learn about the top refineries that shape the future of the sector." },
      { name: 'keywords', content: "world's largest refineries, oil and gas refineries, refinery technologies, global refineries, oil refining process, top refineries, energy production, oil industry advancements, refinery capacity, largest oil refineries, oil refining innovations, oil and gas industry impact, refinery operations" }
    ]);
  }

  setCanonicalURL(url: string): void {
    const existingLink: HTMLLinkElement | null = this.document.querySelector('link[rel=\"canonical\"]');
    if (existingLink) {
      existingLink.setAttribute('href', url);
    } else {
      const link: HTMLLinkElement = this.renderer.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.renderer.appendChild(this.document.head, link);
    }
  }
}
