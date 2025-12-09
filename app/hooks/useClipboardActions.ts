"use client";

import { useCallback } from "react";
import { useClipboard, ClipboardItem } from "../contexts/ClipboardContext";
import { API_BASE } from "../utils/authClient";

/**
 * useClipboardActions Hook
 * Provides convenient wrapper functions for clipboard operations
 * Works with selected items from UI components
 */
export function useClipboardActions() {
  const { handleCut, handleCopy, handlePaste, hasItems, clearClipboard } = useClipboard();

  /**
   * Cut selected items
   * Converts selected items to ClipboardItem format and stores in clipboard
   */
  const cutItems = useCallback((
    selectedItems: Set<number>,
    itemTypes: Map<number, 'folder' | 'file'>,
    folders: Array<{ id: number; name: string; parentId?: number | null }>,
    files: Array<{ id: number; name: string; folderId?: number | null }>
  ) => {
    const items: ClipboardItem[] = [];
    
    selectedItems.forEach(id => {
      const type = itemTypes.get(id);
      if (!type) return;

      if (type === 'folder') {
        const folder = folders.find(f => f.id === id);
        if (folder) {
          items.push({
            type: 'folder',
            id: folder.id,
            name: folder.name,
            parentId: folder.parentId ?? null
          });
        }
      } else {
        const file = files.find(f => f.id === id);
        if (file) {
          items.push({
            type: 'file',
            id: file.id,
            name: file.name,
            parentId: file.folderId ?? null
          });
        }
      }
    });

    if (items.length > 0) {
      handleCut(items);
    }
  }, [handleCut]);

  /**
   * Copy selected items
   * Converts selected items to ClipboardItem format and stores in clipboard
   */
  const copyItems = useCallback((
    selectedItems: Set<number>,
    itemTypes: Map<number, 'folder' | 'file'>,
    folders: Array<{ id: number; name: string; parentId?: number | null }>,
    files: Array<{ id: number; name: string; folderId?: number | null }>
  ) => {
    const items: ClipboardItem[] = [];
    
    selectedItems.forEach(id => {
      const type = itemTypes.get(id);
      if (!type) return;

      if (type === 'folder') {
        const folder = folders.find(f => f.id === id);
        if (folder) {
          items.push({
            type: 'folder',
            id: folder.id,
            name: folder.name,
            parentId: folder.parentId ?? null
          });
        }
      } else {
        const file = files.find(f => f.id === id);
        if (file) {
          items.push({
            type: 'file',
            id: file.id,
            name: file.name,
            parentId: file.folderId ?? null
          });
        }
      }
    });

    if (items.length > 0) {
      handleCopy(items);
    }
  }, [handleCopy]);

  /**
   * Paste items to target folder
   * Shows MoveModal if needed, or pastes directly
   */
  const pasteItems = useCallback(async (
    targetFolderId: number | null,
    onSuccess?: () => void
  ) => {
    if (!hasItems()) {
      console.warn("[ClipboardActions] No items in clipboard to paste");
      return;
    }

    try {
      await handlePaste(targetFolderId, onSuccess);
    } catch (error: unknown) {
      console.error("[ClipboardActions] Paste failed:", error);
      throw error;
    }
  }, [handlePaste, hasItems]);

  /**
   * Delete selected items
   * Calls the unified delete endpoint for each item
   */
  const deleteItems = useCallback(async (
    selectedItems: Set<number>,
    itemTypes: Map<number, 'folder' | 'file'>,
    token: string | null
  ) => {
    if (!token) {
      throw new Error("Authentication required");
    }

    if (selectedItems.size === 0) {
      return;
    }

    const deletePromises: Promise<void>[] = [];

    selectedItems.forEach(id => {
      const type = itemTypes.get(id);
      if (!type) return;

      const promise = fetch(`${API_BASE}/api/items/${id}?type=${type}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete ${type}`);
        }
      });

      deletePromises.push(promise);
    });

    await Promise.all(deletePromises);
  }, []);

  /**
   * Share selected items
   * Generates shareable links for items
   */
  const shareItems = useCallback(async (
    selectedItems: Set<number>,
    itemTypes: Map<number, 'folder' | 'file'>,
    token: string | null
  ) => {
    if (!token) {
      throw new Error("Authentication required");
    }

    if (selectedItems.size === 0) {
      return;
    }

    // For now, share the first selected item
    // In the future, you might want to create a share bundle
    const firstId = Array.from(selectedItems)[0];
    const type = itemTypes.get(firstId);

    if (!type) {
      throw new Error("Invalid item type");
    }

    const res = await fetch(`${API_BASE}/api/items/${firstId}/share?type=${type}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to share item");
    }

    const data = await res.json();
    return data;
  }, []);

  return {
    cutItems,
    copyItems,
    pasteItems,
    deleteItems,
    shareItems,
    hasItems,
    clearClipboard
  };
}

















