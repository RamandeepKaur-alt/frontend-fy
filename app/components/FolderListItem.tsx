"use client";

import { useState, useRef, useEffect } from "react";
import { Folder, Lock, Star, Trash2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSmoothNavigation } from "../hooks/useSmoothNavigation";
import { addRecentItem } from "../utils/recentItems";
import RowItem from "./RowItem";

interface FolderListItemProps {
  folder: {
    id: number;
    name: string;
    createdAt: string;
    folderColor?: string;
    isLocked?: boolean;
    isImportant?: boolean;
  };
  folderColorHex: string;
  locationText?: string;
  lockedView?: boolean;
  onRename?: (id: number, newName: string) => Promise<void>;
  onLock?: (id: number, password: string) => Promise<void>;
  onUnlock?: (id: number, password?: string) => Promise<void>;
  onToggleImportant?: (id: number) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  onClick?: () => void;
  isSelected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  selectionMode?: boolean;
}

export default function FolderListItem({
  folder,
  folderColorHex,
  locationText: locationTextProp,
  lockedView = false,
  onRename,
  onLock,
  onUnlock,
  onToggleImportant,
  onDelete,
  onClick,
  isSelected = false,
  onSelect,
  selectionMode = false,
}: FolderListItemProps) {
  const router = useRouter();
  const smoothNavigate = useSmoothNavigation();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [lockPassword, setLockPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const itemRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Basic location text placeholder; can be overridden via props or wired to real path/category later
  const locationText = locationTextProp ?? "Folder";

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    // Handle single click - select the folder
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return; // This was a double-click, ignore the second click
    }
    
    // Set a timer to handle single click after a delay
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      
      // Single click - select the folder (toggle selection)
      if (onSelect) {
        onSelect(folder.id, !isSelected);
      }
    }, 200); // 200ms delay to detect double-click
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Clear the single-click timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    // Double click - open the folder
    e.preventDefault();
    e.stopPropagation();
    
    // Always add to recent items when folder is opened
    addRecentItem(folder.id, 'folder', folder.name);
    
    // Dispatch custom events to notify dashboard to refresh
    window.dispatchEvent(new CustomEvent('folder-opened', { detail: { folderId: folder.id } }));
    window.dispatchEvent(new CustomEvent('recent-items-updated'));
    
    if (onClick) {
      onClick();
    } else {
      smoothNavigate(`/dashboard/folder/${folder.id}`);
    }
  };


  const handleRename = async () => {
    if (!onRename || !newName.trim() || newName.trim() === folder.name) {
      setShowRenameModal(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onRename(folder.id, newName.trim());
      setShowRenameModal(false);
      setShowContextMenu(false);
    } catch (err) {
      setError("Failed to rename folder");
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    if (!onLock) return;

    setLoading(true);
    setError("");
    try {
      // Lock folder without password requirement
      await onLock(folder.id, "");
      setShowLockModal(false);
      setLockPassword("");
      setShowContextMenu(false);
    } catch (err) {
      setError("Failed to lock folder");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!onUnlock) return;

    setLoading(true);
    setError("");
    try {
      // Check if user is authenticated in locked folders session
      const isAuthenticated = sessionStorage.getItem('locked_folders_authenticated') === 'true';
      
      // If authenticated, unlock without password; otherwise require password
      if (isAuthenticated) {
        await onUnlock(folder.id);
      } else {
        if (!unlockPassword.trim()) {
          setError("Password is required");
          setLoading(false);
          return;
        }
        await onUnlock(folder.id, unlockPassword);
      }
      
      setShowUnlockModal(false);
      setUnlockPassword("");
      setShowContextMenu(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to unlock folder";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleImportant = async () => {
    if (onToggleImportant) {
      setLoading(true);
      try {
        await onToggleImportant(folder.id);
        setShowContextMenu(false);
      } catch (err) {
        console.error("Failed to toggle important:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const getContextMenuStyle = () => {
    const baseX = contextMenuPos.x;
    const baseY = contextMenuPos.y;

    if (typeof window === "undefined") {
      return {
        left: `${baseX}px`,
        top: `${baseY}px`,
        transform: "translate(4px, -10px)",
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const menuWidth = 220; // approximate width
    const menuHeight = 200; // approximate height (slightly taller than files)

    let x = baseX;
    let y = baseY;

    // If menu would overflow right edge, shift left
    if (x + menuWidth > viewportWidth) {
      x = Math.max(8, viewportWidth - menuWidth - 8);
    }

    // If menu would overflow bottom edge, shift up
    if (y + menuHeight > viewportHeight) {
      y = Math.max(8, viewportHeight - menuHeight - 8);
    }

    // If menu would go off the top, push it down slightly
    if (y < 8) {
      y = 8;
    }

    return {
      left: `${x}px`,
      top: `${y}px`,
    };
  };

  const handleDelete = async () => {
    if (onDelete && confirm(`Are you sure you want to delete "${folder.name}"?`)) {
      setLoading(true);
      try {
        await onDelete(folder.id);
        setShowContextMenu(false);
      } catch (err) {
        console.error("Failed to delete folder:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        itemRef.current &&
        !itemRef.current.contains(e.target as Node)
      ) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showContextMenu]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={itemRef}
        data-folder-item
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
        className={`hover:bg-gray-50 cursor-pointer transition-all duration-200 ease-in-out group ${
          isSelected ? "bg-gray-100" : ""
        }`}
        aria-label={`${folder.name} — ${locationText} — created ${formatDate(folder.createdAt)}`}
      >
        <RowItem
          icon={
            <Folder
              className="w-[22px] h-[22px] flex-shrink-0"
              style={{ color: folderColorHex, strokeWidth: 1, opacity: 0.7 }}
            />
          }
          name={folder.name}
          location={locationText}
          createdAt={formatDate(folder.createdAt)}
        />
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]"
          style={getContextMenuStyle()}
        >
          {!lockedView && onRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRenameModal(true);
                setShowContextMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Rename
            </button>
          )}
          {lockedView && onUnlock && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                await onUnlock(folder.id);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Unlock
            </button>
          )}
          {!lockedView && (folder.isLocked ? (
            onUnlock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUnlockModal(true);
                  setShowContextMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Unlock Folder
              </button>
            )
          ) : (
            onLock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLockModal(true);
                  setShowContextMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Lock Folder
              </button>
            )
          ))}
          {!lockedView && onToggleImportant && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleImportant();
              }}
              className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Star className={`w-4 h-4 ${folder.isImportant ? "fill-yellow-400 text-yellow-400" : ""}`} />
              {folder.isImportant ? "Remove from Favorites" : "Favorite"}
            </button>
          )}
          {!lockedView && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Rename Folder</h2>
            {error && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">
                {error}
              </div>
            )}
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setShowRenameModal(false);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#9bc4a8] mb-4"
              autoFocus
              disabled={loading}
            />
            <div className="flex gap-3">
              <button
                onClick={handleRename}
                disabled={loading || !newName.trim()}
                className="flex-1 bg-[#9bc4a8] text-white font-medium py-2 rounded-lg hover:bg-[#8ab39a] transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Renaming..." : "Rename"}
              </button>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewName(folder.name);
                  setError("");
                }}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Modal (unused in lockedView) */}
      {!lockedView && showLockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Lock Folder</h2>
            <p className="text-sm text-gray-600 mb-4">This folder will be moved to the Locked Folders section.</p>
            {error && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleLock}
                disabled={loading}
                className="flex-1 bg-[#9bc4a8] text-white font-medium py-2 rounded-lg hover:bg-[#8ab39a] transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Locking..." : "Lock Folder"}
              </button>
              <button
                onClick={() => {
                  setShowLockModal(false);
                  setLockPassword("");
                  setError("");
                }}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal (unused in lockedView) */}
      {!lockedView && showUnlockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Unlock Folder</h2>
            {(() => {
              const isAuthenticated = sessionStorage.getItem('locked_folders_authenticated') === 'true';
              if (isAuthenticated) {
                return (
                  <>
                    <p className="text-sm text-gray-600 mb-4">This folder will be moved back to your main folders.</p>
                    {error && (
                      <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">
                        {error}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={handleUnlock}
                        disabled={loading}
                        className="flex-1 bg-[#9bc4a8] text-white font-medium py-2 rounded-lg hover:bg-[#8ab39a] transition-colors disabled:opacity-50 text-sm"
                      >
                        {loading ? "Unlocking..." : "Unlock Folder"}
                      </button>
                      <button
                        onClick={() => {
                          setShowUnlockModal(false);
                          setUnlockPassword("");
                          setError("");
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              } else {
                return (
                  <>
                    <p className="text-sm text-gray-600 mb-4">Enter the lock password to unlock this folder.</p>
                    {error && (
                      <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">
                        {error}
                      </div>
                    )}
                    <input
                      type="password"
                      value={unlockPassword}
                      onChange={(e) => {
                        setUnlockPassword(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUnlock();
                        if (e.key === "Escape") setShowUnlockModal(false);
                      }}
                      placeholder="Enter lock password"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#9bc4a8] mb-4"
                      autoFocus
                      disabled={loading}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleUnlock}
                        disabled={loading || !unlockPassword.trim()}
                        className="flex-1 bg-[#9bc4a8] text-white font-medium py-2 rounded-lg hover:bg-[#8ab39a] transition-colors disabled:opacity-50 text-sm"
                      >
                        {loading ? "Unlocking..." : "Unlock"}
                      </button>
                      <button
                        onClick={() => {
                          setShowUnlockModal(false);
                          setUnlockPassword("");
                          setError("");
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              }
            })()}
          </div>
        </div>
      )}
    </>
  );
}

