import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Injection token for API URL
 * Will be provided by APP_INITIALIZER after loading config
 */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => {
    // ✅ FIX: Fallback to environment.apiUrl if available (supports development with production backend)
    // Otherwise use Docker default (for containerized deployments)
    return environment.apiUrl || 'http://localhost:5001/';
  }
});

/**
 * Configuration interface
 */
export interface AppConfig {
  apiUrl: string;
}

// Global config storage (set by APP_INITIALIZER)
let loadedConfig: AppConfig | null = null;

/**
 * Ensures trailing slash so `${base}api/...` and `${base}page/...` concatenate correctly (SSR + browser).
 */
export function normalizeApiUrlBase(raw: string): string {
  const u = raw.trim();
  if (!u) {
    return u;
  }
  return u.endsWith('/') ? u : `${u}/`;
}

/**
 * Gets the loaded configuration (or default if not loaded yet)
 */
export function getApiUrl(): string {
  if (loadedConfig) {
    return loadedConfig.apiUrl;
  }
  // ✅ FIX: Fallback to environment.apiUrl if available (supports development)
  // Otherwise use Docker default (for containerized deployments)
  return environment.apiUrl || 'http://localhost:52056/';
}

/**
 * Sets the loaded configuration (called by APP_INITIALIZER)
 */
export function setApiUrl(config: AppConfig): void {
  loadedConfig = config;
}

// ✅ FIX: Track if config is already loaded to prevent race conditions in SSR
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Loads configuration from config.json or uses default
 * Used by APP_INITIALIZER to load config before app starts
 */
export function loadApiUrl(): () => Promise<void> {
  return () => {
    // ✅ SSR override support: allow forcing backend URL from env.
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env['SSR_API_URL']) {
      setApiUrl({ apiUrl: normalizeApiUrlBase(process.env['SSR_API_URL']!) });
      return Promise.resolve();
    }

    // ✅ FIX: If config is already loaded, resolve immediately
    if (loadedConfig) {
      return Promise.resolve();
    }

    // ✅ FIX: Use singleton promise to prevent multiple simultaneous loads
    // This prevents race conditions when APP_INITIALIZER runs multiple times (SSR scenarios)
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = new Promise<void>((resolve) => {
      // ✅ DOCKER/PRODUCTION: Default to Docker container port (for same-container setup)
      // ✅ DEVELOPMENT: Fallback to environment.apiUrl if config.json not found
      // Priority: config.json (Docker) > environment.apiUrl (Dev/Prod) > localhost:5000 (Docker fallback)
      const dockerDefault = 'http://localhost:5000/api/';
      const devDefault = environment.apiUrl || dockerDefault;
      const defaultConfig: AppConfig = {
        // ✅ In Docker, config.json should always exist, but use Docker default if not
        // In development, use environment.apiUrl (localhost:52056) if config.json not found
        // In production, use environment.apiUrl (coursebackend.oilandgasclub.com) if config.json not found
        apiUrl: devDefault
      };

      // Only fetch in browser (not during SSR)
      if (typeof window === 'undefined' || typeof fetch === 'undefined') {
        // ✅ SSR: Use full backend URL directly (no proxy needed)
        let ssrApiUrl = devDefault;
        if (ssrApiUrl === '/api/' || ssrApiUrl.startsWith('/api/')) {
          ssrApiUrl = 'http://localhost:5001/';
        } else if (ssrApiUrl === '/' || !ssrApiUrl || ssrApiUrl.trim() === '') {
          ssrApiUrl = 'http://localhost:5001/';
        }
        setApiUrl({ apiUrl: ssrApiUrl });
        isLoading = false;
        loadPromise = null;
        resolve();
        return;
      }

      // ✅ DEVELOPMENT: Skip fetch so we never get 404 for missing config.json (use environment.apiUrl)
      if (!environment.production) {
        const apiUrl = devDefault.endsWith('/') ? devDefault : devDefault + '/';
        setApiUrl({ apiUrl });
        loadPromise = null;
        resolve();
        return;
      }

      // ✅ FIX: Prevent multiple simultaneous fetches
      if (isLoading) {
        resolve();
        return;
      }

      isLoading = true;

      // ✅ BROWSER (non-localhost or production): Try to load config.json (Docker-generated from BACKEND_PORT)
      fetch('/assets/config.json', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })
        .then(async response => {
          // ✅ FIX: Check if response has content before parsing JSON
          const text = await response.text();
          
          if (!response.ok) {
            // ✅ config.json not found: Use dev default (environment.apiUrl) for development
            // In Docker, this should rarely happen as entrypoint.sh generates it
            console.warn('⚠️ config.json not found (HTTP ' + response.status + '), using fallback API URL:', defaultConfig.apiUrl);
            isLoading = false;
            return { config: defaultConfig, fromFile: false };
          }
          if (!text || text.trim().length === 0) {
            console.warn('⚠️ config.json is empty, using fallback API URL:', defaultConfig.apiUrl);
            isLoading = false;
            return { config: defaultConfig, fromFile: false };
          }
          
          try {
            const parsedConfig = JSON.parse(text);
            isLoading = false;
            return { config: parsedConfig, fromFile: true };
          } catch (parseError) {
            console.warn('⚠️ config.json is not valid JSON, using fallback API URL:', defaultConfig.apiUrl);
            isLoading = false;
            return { config: defaultConfig, fromFile: false };
          }
        })
        .then((result: { config: AppConfig, fromFile: boolean }) => {
          const config = result.config;
          const fromFile = result.fromFile;
          
          // ✅ FIX: Ensure we only set config once and clean up state
          if (!config || !config.apiUrl) {
            console.warn('⚠️ Invalid config.json, using fallback API URL:', defaultConfig.apiUrl);
            setApiUrl(defaultConfig);
            isLoading = false;
            loadPromise = null;
            resolve();
            return;
          }
          
          // Ensure apiUrl ends with /
          const apiUrl = config.apiUrl.endsWith('/') ? config.apiUrl : config.apiUrl + '/';
          
          const finalConfig: AppConfig = { apiUrl };
          
          // ✅ Only log success message if we actually loaded from config.json
          if (fromFile) {
            console.log('✅ Loaded API URL from config.json (Docker BACKEND_PORT):', apiUrl);
          } else {
            // In development, this is expected - config.json is only generated in Docker
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log('ℹ️ Using development API URL (config.json not required in dev):', apiUrl);
            } else {
              console.log('ℹ️ Using fallback API URL:', apiUrl);
            }
          }
          
          setApiUrl(finalConfig);
          isLoading = false;
          loadPromise = null;
          resolve();
        })
        .catch(error => {
          console.error('❌ Error loading config.json:', error);
          console.warn('⚠️ Using fallback API URL:', defaultConfig.apiUrl);
          setApiUrl(defaultConfig);
          isLoading = false;
          loadPromise = null;
          resolve();
        });
    });

    return loadPromise;
  };
}

