/**
 * Category Management Utility
 * Handles enabled/disabled categories and custom categories
 */

const DISABLED_CATEGORIES_KEY = 'fynora_disabled_categories';
const CUSTOM_CATEGORIES_KEY = 'fynora_custom_categories';

export const DEFAULT_CATEGORIES = ["Work", "Personal", "Documents", "Media", "Important"];

/**
 * Get all disabled categories
 */
export function getDisabledCategories(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(DISABLED_CATEGORIES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (err) {
    console.error('Failed to parse disabled categories:', err);
    return [];
  }
}

/**
 * Get all custom categories
 */
export function getCustomCategories(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (err) {
    console.error('Failed to parse custom categories:', err);
    return [];
  }
}

/**
 * Get all enabled categories (default + custom, excluding disabled)
 */
export function getEnabledCategories(): string[] {
  const disabled = getDisabledCategories();
  const custom = getCustomCategories();
  
  const enabledDefault = DEFAULT_CATEGORIES.filter(cat => !disabled.includes(cat));
  return [...enabledDefault, ...custom];
}

/**
 * Disable a category (remove from sidebar, but don't delete folder)
 */
export function disableCategory(categoryName: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const disabled = getDisabledCategories();
    if (!disabled.includes(categoryName)) {
      const updated = [...disabled, categoryName];
      localStorage.setItem(DISABLED_CATEGORIES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('categories-updated'));
    }
  } catch (err) {
    console.error('Failed to disable category:', err);
  }
}

/**
 * Enable a category (add back to sidebar)
 */
export function enableCategory(categoryName: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const disabled = getDisabledCategories();
    const updated = disabled.filter(cat => cat !== categoryName);
    localStorage.setItem(DISABLED_CATEGORIES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('categories-updated'));
  } catch (err) {
    console.error('Failed to enable category:', err);
  }
}

/**
 * Delete a custom category (remove from custom categories list)
 */
export function deleteCustomCategory(categoryName: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const custom = getCustomCategories();
    const updated = custom.filter(cat => cat !== categoryName);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('categories-updated'));
  } catch (err) {
    console.error('Failed to delete custom category:', err);
  }
}

/**
 * Add a custom category
 */
export function addCustomCategory(categoryName: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const trimmedName = categoryName.trim();
  if (!trimmedName) return false;
  
  try {
    const custom = getCustomCategories();
    const allCategories = [...DEFAULT_CATEGORIES, ...custom];
    
    // Check if category already exists
    if (allCategories.includes(trimmedName)) {
      return false; // Category already exists
    }
    
    const updated = [...custom, trimmedName];
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('custom-category-created'));
    window.dispatchEvent(new CustomEvent('categories-updated'));
    return true;
  } catch (err) {
    console.error('Failed to add custom category:', err);
    return false;
  }
}

/**
 * Check if a category is enabled
 */
export function isCategoryEnabled(categoryName: string): boolean {
  const disabled = getDisabledCategories();
  return !disabled.includes(categoryName);
}

/**
 * Check if a category is a default category
 */
export function isDefaultCategory(categoryName: string): boolean {
  return DEFAULT_CATEGORIES.includes(categoryName);
}

/**
 * Rename a category
 */
export function renameCategory(oldName: string, newName: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const trimmedNewName = newName.trim();
  if (!trimmedNewName || trimmedNewName === oldName) return false;
  
  try {
    const enabledCategories = getEnabledCategories();
    
    // Check if new name already exists
    if (enabledCategories.includes(trimmedNewName)) {
      return false; // Category name already exists
    }
    
    // If it's a default category, disable the old one and add new as custom
    if (isDefaultCategory(oldName)) {
      disableCategory(oldName);
      addCustomCategory(trimmedNewName);
    } else {
      // It's a custom category, update it
      const custom = getCustomCategories();
      const updated = custom.map(cat => cat === oldName ? trimmedNewName : cat);
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('categories-updated'));
    }
    
    return true;
  } catch (err) {
    console.error('Failed to rename category:', err);
    return false;
  }
}

