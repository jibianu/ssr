import { Injectable } from '@angular/core';

const STORAGE_KEY = 'elearn_utm';

export interface StoredUtm {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** Marketing campaign tracking code (cmp query param). */
  campaignCode?: string;
  /** Affiliate tracking code (aff query param). */
  affiliateCode?: string;
}

@Injectable({ providedIn: 'root' })
export class UtmService {
  /**
   * Parse UTM params from a URL (or current window.location) and store in sessionStorage.
   * Call on app load and on navigation so attribution is available at checkout.
   */
  captureFromUrl(url?: string): void {
    const raw = url ?? (typeof window !== 'undefined' ? window.location.href : '');
    if (!raw) return;
    try {
      const idx = raw.indexOf('?');
      const query = idx >= 0 ? raw.slice(idx + 1) : '';
      const params = new URLSearchParams(query);
      const utmSource = params.get('utm_source')?.trim() || undefined;
      const utmMedium = params.get('utm_medium')?.trim() || undefined;
      const utmCampaign = params.get('utm_campaign')?.trim() || undefined;
      const campaignCode = params.get('cmp')?.trim() || undefined;
      // Marketing site uses ?ref=OIL… for affiliates; some links use ?aff=
      const affiliateCode =
        params.get('aff')?.trim() ||
        params.get('ref')?.trim() ||
        undefined;
      if (utmSource || utmMedium || utmCampaign || campaignCode || affiliateCode) {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ utmSource, utmMedium, utmCampaign, campaignCode, affiliateCode })
        );
      }
    } catch {
      // ignore parse errors
    }
  }

  /** Return UTM params previously stored from the URL (for checkout create-order). */
  getStoredUtm(): StoredUtm {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const o = JSON.parse(raw) as StoredUtm;
      return {
        utmSource: o?.utmSource || undefined,
        utmMedium: o?.utmMedium || undefined,
        utmCampaign: o?.utmCampaign || undefined,
        campaignCode: o?.campaignCode || undefined,
        affiliateCode: o?.affiliateCode || undefined
      };
    } catch {
      return {};
    }
  }
}
