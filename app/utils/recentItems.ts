/**
 * Utility functions for tracking and managing recently viewed/opened folders and files
 */

import { getEnabledCategories, isDefaultCategory } from './categoryManagement';

const RECENT_ITEMS_KEY = 'fynora_recent_items';
const MAX_RECENT_ITEMS = 50; // Maximum number of recent items to keep

export interface RecentItem {
  id: number;
  type: 'folder' | 'file';
  name: string;
  viewedAt: number; // Timestamp
}

/**
 * Get all recent items from localStorage
 */
export function getRecentItems(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    if (!stored) return [];
    
    const items = JSON.parse(stored) as RecentItem[];
    return items.sort((a, b) => b.viewedAt - a.viewedAt); // Most recent first
  } catch (err) {
    console.error('Failed to parse recent items:', err);
    return [];
  }
}

/**
 * Add or update a recent item
 * Prevents category folders from being added to recent items
 */
export function addRecentItem(id: number, type: 'folder' | 'file', name: string): void {
  if (typeof window === 'undefined') return;
  
  // Don't add category folders to recent items
  if (type === 'folder') {
    const enabledCategories = getEnabledCategories();
    if (enabledCategories.includes(name)) {
      return; // Don't add any category (default or custom) to recent items
    }
  }
  
  try {
    const items = getRecentItems();
    
    // Remove existing item with same id and type if it exists
    const filteredItems = items.filter(item => !(item.id === id && item.type === type));
    
    // Add new item at the beginning
    const newItem: RecentItem = {
      id,
      type,
      name,
      viewedAt: Date.now()
    };
    
    const updatedItems = [newItem, ...filteredItems].slice(0, MAX_RECENT_ITEMS);
    
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updatedItems));
    
    // Dispatch a custom event to notify listeners
    window.dispatchEvent(new CustomEvent('localStorage-recent-items-updated', { 
      detail: { itemId: id, itemType: type, itemName: name } 
    }));
  } catch (err) {
    console.error('Failed to save recent item:', err);
  }
}

export function addRecentItemAndNotify(id: number, type: 'folder' | 'file', name: string): void {
  addRecentItem(id, type, name);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('recent-items-updated'));
  }
}

/**
 * Remove a recent item
 */
export function removeRecentItem(id: number, type: 'folder' | 'file'): void {
  if (typeof window === 'undefined') return;
  
  try {
    const items = getRecentItems();
    const filteredItems = items.filter(item => !(item.id === id && item.type === type));
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(filteredItems));
  } catch (err) {
    console.error('Failed to remove recent item:', err);
  }
}

/**
 * Clear all recent items
 */
export function clearRecentItems(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_ITEMS_KEY);
}

/**
 * Check if a folder name is a default category
 * Re-exported from categoryManagement for backward compatibility
 */
export { isDefaultCategory };

/**
 * Get recent item IDs as a Set for quick lookup
 */
export function getRecentItemIds(): { folders: Set<number>, files: Set<number> } {
  const items = getRecentItems();
  const folders = new Set<number>();
  const files = new Set<number>();
  
  items.forEach(item => {
    if (item.type === 'folder') {
      folders.add(item.id);
    } else {
      files.add(item.id);
    }
  });
  
  return { folders, files };
}

