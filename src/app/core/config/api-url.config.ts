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
    return environment.apiUrl || 'http://localhost:52056/';
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
        // In development, use http://localhost:52056/ directly (matches backend HTTP port)
        // In production, use the production backend URL
        let ssrApiUrl = devDefault;
        
        // If apiUrl is a relative path (old proxy setup), convert to full backend URL
        if (ssrApiUrl === '/api/' || ssrApiUrl.startsWith('/api/')) {
          ssrApiUrl = 'http://localhost:52056/';
        } else if (ssrApiUrl === '/' || !ssrApiUrl || ssrApiUrl.trim() === '') {
          // Handle case where apiUrl is just "/" or empty
          ssrApiUrl = 'http://localhost:52056/';
        }
        
        const ssrDefault: AppConfig = {
          apiUrl: ssrApiUrl
        };
        setApiUrl(ssrDefault);
        isLoading = false;
        loadPromise = null;
        resolve();
        return;
      }

      // ✅ FIX: Prevent multiple simultaneous fetches
      if (isLoading) {
        // This shouldn't happen due to loadPromise check above, but add safety
        resolve();
        return;
      }

      isLoading = true;

      // ✅ BROWSER: Try to load config.json first (Docker-generated from BACKEND_PORT)
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

