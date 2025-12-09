"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { API_BASE } from "../utils/authClient";

/**
 * Clipboard Item Interface
 * Represents a single item (file or folder) stored in the clipboard
 */
export interface ClipboardItem {
  type: 'folder' | 'file';
  id: number;
  name: string;
  parentId?: number | null; // Current parent folder ID
}

/**
 * Clipboard State Interface
 * Stores the clipboard mode (cut/copy) and the items
 */
export interface ClipboardState {
  mode: 'cut' | 'copy' | null;
  items: ClipboardItem[];
}

/**
 * Clipboard Context Interface
 * Provides methods to interact with the global clipboard
 */
interface ClipboardContextType {
  // Current clipboard state
  clipboard: ClipboardState;
  
  // Actions
  handleCut: (items: ClipboardItem[]) => void;
  handleCopy: (items: ClipboardItem[]) => void;
  handlePaste: (targetFolderId: number | null, onSuccess?: () => void) => Promise<void>;
  clearClipboard: () => void;
  
  // Utilities
  hasItems: () => boolean;
  getItemCount: () => number;
}

// Create the context with undefined default
const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);

/**
 * Clipboard Provider Component
 * Wraps the app and provides global clipboard functionality
 */
export function ClipboardProvider({ children, token }: { children: ReactNode; token: string | null }) {
  const [clipboard, setClipboard] = useState<ClipboardState>({
    mode: null,
    items: []
  });

  /**
   * Handle Cut Operation
   * Stores items in clipboard with mode = "cut"
   * @param items - Array of items to cut
   */
  const handleCut = useCallback((items: ClipboardItem[]) => {
    if (items.length === 0) return;
    
    setClipboard({
      mode: 'cut',
      items: items
    });
    
  }, []);

  /**
   * Handle Copy Operation
   * Stores items in clipboard with mode = "copy"
   * @param items - Array of items to copy
   */
  const handleCopy = useCallback((items: ClipboardItem[]) => {
    if (items.length === 0) return;
    
    setClipboard({
      mode: 'copy',
      items: items
    });
    
  }, []);

  /**
   * Handle Paste Operation
   * Moves (if cut) or duplicates (if copy) items to target folder
   * @param targetFolderId - ID of destination folder (null for root)
   * @param onSuccess - Callback to execute after successful paste
   */
  const handlePaste = useCallback(async (
    targetFolderId: number | null,
    onSuccess?: () => void
  ) => {
    if (!token) {
      console.error("[Clipboard] No token available for paste operation");
      return;
    }

    if (clipboard.mode === null || clipboard.items.length === 0) {
      console.warn("[Clipboard] No items in clipboard to paste");
      return;
    }

    try {

      // Process each item based on clipboard mode
      for (const item of clipboard.items) {
        if (clipboard.mode === 'cut') {
          // Move item to target folder
          const moveRes = await fetch(`${API_BASE}/api/items/${item.id}/move`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: item.type,
              targetFolderId: targetFolderId
            }),
          });

          if (!moveRes.ok) {
            const errorData = await moveRes.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to move ${item.type} ${item.name}`);
          }

        } else if (clipboard.mode === 'copy') {
          // Duplicate item in target folder
          const duplicateRes = await fetch(`${API_BASE}/api/items/${item.id}/duplicate`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: item.type,
              targetFolderId: targetFolderId
            }),
          });

          if (!duplicateRes.ok) {
            const errorData = await duplicateRes.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to duplicate ${item.type} ${item.name}`);
          }

        }
      }

      // Clear clipboard after successful paste (only for cut operations)
      // For copy operations, keep items in clipboard for multiple pastes
      if (clipboard.mode === 'cut') {
        setClipboard({ mode: null, items: [] });
      }

      // Execute success callback if provided
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: unknown) {
      console.error("[Clipboard] Paste operation failed:", error);
      throw error; // Re-throw to allow component to handle error
    }
  }, [clipboard, token]);

  /**
   * Clear Clipboard
   * Resets clipboard to empty state
   */
  const clearClipboard = useCallback(() => {
    setClipboard({ mode: null, items: [] });
  }, []);

  /**
   * Check if clipboard has items
   * @returns true if clipboard has items, false otherwise
   */
  const hasItems = useCallback(() => {
    return clipboard.items.length > 0;
  }, [clipboard.items.length]);

  /**
   * Get item count in clipboard
   * @returns number of items in clipboard
   */
  const getItemCount = useCallback(() => {
    return clipboard.items.length;
  }, [clipboard.items.length]);

  const value: ClipboardContextType = {
    clipboard,
    handleCut,
    handleCopy,
    handlePaste,
    clearClipboard,
    hasItems,
    getItemCount
  };

  return (
    <ClipboardContext.Provider value={value}>
      {children}
    </ClipboardContext.Provider>
  );
}

/**
 * useClipboard Hook
 * Provides access to the global clipboard context
 * @throws Error if used outside ClipboardProvider
 */
export function useClipboard() {
  const context = useContext(ClipboardContext);
  
  if (context === undefined) {
    throw new Error("useClipboard must be used within a ClipboardProvider");
  }
  
  return context;
}

















