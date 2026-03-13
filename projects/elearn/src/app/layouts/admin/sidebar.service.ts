import { Injectable } from '@angular/core';

@Injectable()
export class SideNavService {
    hideSideNav: boolean = false;

    constructor() { }

    toggleSideNav(): void {
        this.hideSideNav = !this.hideSideNav;
    }
}
