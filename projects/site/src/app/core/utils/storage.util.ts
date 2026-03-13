/**
 * Utility class for safe storage operations with error handling.
 * Provides type-safe methods for sessionStorage and localStorage.
 */
export class StorageUtil {
  /**
   * Checks if code is running in browser environment (SSR-safe)
   */
  private static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
  }

  /**
   * Safely retrieves an item from sessionStorage
   * @param key Storage key
   * @param defaultValue Default value if key doesn't exist or parsing fails
   * @returns Parsed value or default value
   */
  static getItemFromSession<T>(key: string, defaultValue: T | null = null): T | null {
    if (!this.isBrowser()) {
      return defaultValue;
    }

    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error parsing ${key} from sessionStorage:`, errorMessage);
      return defaultValue;
    }
  }

  /**
   * Safely saves an item to sessionStorage
   * @param key Storage key
   * @param value Value to store
   * @returns True if successful, false otherwise
   */
  static setItemToSession<T>(key: string, value: T): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error saving ${key} to sessionStorage:`, errorMessage);
      return false;
    }
  }

  /**
   * Removes an item from sessionStorage
   * @param key Storage key to remove
   * @returns True if successful, false otherwise
   */
  static removeItemFromSession(key: string): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error removing ${key} from sessionStorage:`, errorMessage);
      return false;
    }
  }

  /**
   * Clears all items from sessionStorage
   * @returns True if successful, false otherwise
   */
  static clearSession(): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error clearing sessionStorage:', errorMessage);
      return false;
    }
  }

  /**
   * Safely retrieves an item from localStorage
   * @param key Storage key
   * @param defaultValue Default value if key doesn't exist or parsing fails
   * @returns Parsed value or default value
   */
  static getItemFromLocal<T>(key: string, defaultValue: T | null = null): T | null {
    if (!this.isBrowser()) {
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error parsing ${key} from localStorage:`, errorMessage);
      return defaultValue;
    }
  }

  /**
   * Safely saves an item to localStorage
   * @param key Storage key
   * @param value Value to store
   * @returns True if successful, false otherwise
   */
  static setItemToLocal<T>(key: string, value: T): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error saving ${key} to localStorage:`, errorMessage);
      return false;
    }
  }
}

