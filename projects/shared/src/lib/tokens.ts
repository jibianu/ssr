import { InjectionToken } from '@angular/core';

/** Base API URL for backend (e.g. https://oilandgasclub.com/api or http://localhost:5001) */
export const API_URL_TOKEN = new InjectionToken<string>('API_URL');
