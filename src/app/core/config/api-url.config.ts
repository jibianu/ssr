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
    return environment.apiUrl || 'http://localhost:5000/api/';
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
  return environment.apiUrl || 'http://localhost:5000/api/';
}

/**
 * Sets the loaded configuration (called by APP_INITIALIZER)
 */
export function setApiUrl(config: AppConfig): void {
  loadedConfig = config;
}

/**
 * Loads configuration from config.json or uses default
 * Used by APP_INITIALIZER to load config before app starts
 */
export function loadApiUrl(): () => Promise<void> {
  return () => {
      return new Promise<void>((resolve) => {
      // ✅ DOCKER/PRODUCTION: Default to Docker container port (for same-container setup)
      // ✅ DEVELOPMENT: Fallback to environment.apiUrl if config.json not found
      // Priority: config.json (Docker) > environment.apiUrl (Dev) > localhost:5000 (Docker fallback)
      const dockerDefault = 'http://localhost:5000/api/';
      const devDefault = environment.apiUrl || dockerDefault;
      const defaultConfig: AppConfig = {
        // ✅ In Docker, config.json should always exist, but use Docker default if not
        // In development, use environment.apiUrl (production backend) if config.json not found
        apiUrl: devDefault
      };

      // Only fetch in browser (not during SSR)
      if (typeof window === 'undefined' || typeof fetch === 'undefined') {
        // ✅ SSR: Use Docker default (same container = localhost)
        // During SSR in Docker, config.json might not be accessible yet, use Docker default
        const ssrDefault: AppConfig = {
          apiUrl: dockerDefault
        };
        setApiUrl(ssrDefault);
        resolve();
        return;
      }

      // ✅ BROWSER: Try to load config.json first (Docker-generated from BACKEND_PORT)
      fetch('/assets/config.json', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })
        .then(response => {
          if (!response.ok) {
            // ✅ config.json not found: Use dev default (environment.apiUrl) for development
            // In Docker, this should rarely happen as entrypoint.sh generates it
            console.warn('⚠️ config.json not found, using fallback API URL:', defaultConfig.apiUrl);
            return defaultConfig;
          }
          return response.json();
        })
        .then((config: AppConfig) => {
          if (!config.apiUrl) {
            console.warn('⚠️ Invalid config.json, using fallback API URL:', defaultConfig.apiUrl);
            return defaultConfig;
          }
          
          // ✅ SUCCESS: config.json loaded (from Docker BACKEND_PORT)
          // Ensure apiUrl ends with /
          const apiUrl = config.apiUrl.endsWith('/') ? config.apiUrl : config.apiUrl + '/';
          
          const finalConfig: AppConfig = { apiUrl };
          console.log('✅ Loaded API URL from config.json (Docker BACKEND_PORT):', apiUrl);
          
          setApiUrl(finalConfig);
          resolve();
        })
        .catch(error => {
          console.error('❌ Error loading config.json:', error);
          console.warn('⚠️ Using fallback API URL:', defaultConfig.apiUrl);
          setApiUrl(defaultConfig);
          resolve();
        });
    });
  };
}

