"use client";

import { useState, useRef, useEffect } from "react";
import { 
  File, 
  FileText, 
  Image, 
  Video, 
  Code, 
  Archive,
  Trash2,
  MoreVertical,
  Lock,
  Edit,
  Star
} from "lucide-react";
import { detectFileType, formatFileSize } from "../utils/fileTypeDetection";
import { useToast } from "../contexts/ToastContext";
import RowItem from "./RowItem";
import { API_BASE } from "../utils/authClient";

interface FileMeta {
  id: number;
  name: string;
  url: string;
  size: number;
  mimetype: string;
  createdAt: string;
  folderId?: number | null;
}

interface FileListItemProps {
  file: FileMeta;
  onDelete?: (id: number) => Promise<void>;
  onPreview?: (file: FileMeta) => void;
  onDownload?: (file: FileMeta) => void;
  onLock?: (id: number) => Promise<void>;
  isSelected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  selectionMode?: boolean;
  token?: string | null;
  locationText?: string;
  lockedView?: boolean;
  onUnlock?: (id: number) => Promise<void>;
  hideActions?: boolean;
}

export default function FileListItem({
  file,
  onDelete,
  onPreview,
  onDownload,
  onLock,
  isSelected = false,
  onSelect,
  selectionMode = false,
  token,
  locationText: locationTextProp,
  lockedView = false,
  hideActions = false,
}: FileListItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const itemRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showError } = useToast();
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileTypeInfo = detectFileType(file.name, file.mimetype);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Basic location text placeholder based on folder association; can be overridden via props
  const defaultLocationText = file.folderId ? "Folder" : "Root";
  const locationText = locationTextProp ?? defaultLocationText;

  const getFileIcon = () => {
    switch (fileTypeInfo.icon) {
      case "image":
        return <Image className="w-[18px] h-[18px] text-blue-500" />;
      case "file-text":
        return <FileText className="w-[18px] h-[18px] text-red-500" />;
      case "video":
        return <Video className="w-[18px] h-[18px] text-purple-500" />;
      case "code":
        return <Code className="w-[18px] h-[18px] text-green-500" />;
      case "archive":
        return <Archive className="w-[18px] h-[18px] text-orange-500" />;
      default:
        return <File className="w-[18px] h-[18px] text-gray-500" />;
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (hideActions) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (onSelect) {
        onSelect(file.id, !isSelected);
      }
    }, 200);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    e.preventDefault();
    e.stopPropagation();

    if (fileTypeInfo.canPreview && onPreview) {
      onPreview(file);
    } else if (onDownload) {
      onDownload(file);
    }
  };

  const handleDelete = async () => {
    if (onDelete && confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        await onDelete(file.id);
        setShowContextMenu(false);
      } catch (err) {
        console.error("Failed to delete file:", err);
      }
    }
  };

  const handleLock = async () => {
    if (!onLock && !token) return;
    
    try {
      // Since files can't be locked directly, create a locked folder and move the file there
      const folderName = file.name.replace(/\.[^/.]+$/, "") || "Locked Files";
      
      // Create a locked folder
      const folderRes = await fetch(`${API_BASE}/api/folders/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: folderName,
          folderColor: "blue",
          parentId: file.folderId || null,
        }),
      });

      if (folderRes.ok) {
        const folderData = await folderRes.json();
        const newFolderId = folderData.folder.id;
        
        // Lock the folder
        await fetch(`${API_BASE}/api/folders/lock/${newFolderId}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        
        // Move the file to the locked folder
        await fetch(`${API_BASE}/api/files/${file.id}/move`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folderId: newFolderId }),
        });
        
        // Call onLock callback if provided (for parent component to refresh)
        if (onLock) {
          await onLock(file.id);
        }
        
        setShowContextMenu(false);
      } else {
        const errorData = await folderRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to lock file");
      }
    } catch (err: unknown) {
      console.error("Failed to lock file:", err);
      const message = err instanceof Error ? err.message : "Failed to lock file. Please try again.";
      showError(message);
    }
  };

  const handleRename = () => {
    // File rename behavior is handled at a higher level; this is a visual placeholder
    setShowContextMenu(false);
  };

  const handleToggleFavorite = () => {
    // File favorite behavior is handled at a higher level; this is a visual placeholder
    setShowContextMenu(false);
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
    const menuHeight = 180; // approximate height

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
        data-file-item
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={hideActions ? undefined : handleRightClick}
        className={`hover:bg-gray-50 cursor-pointer transition-all duration-200 ease-in-out group ${
          isSelected ? "bg-gray-100" : ""
        }`}
        aria-label={`${file.name} — ${locationText} — created ${formatDate(file.createdAt)}`}
      >
        <RowItem
          icon={
            <div className="flex-shrink-0 w-[22px] h-[22px] flex items-center justify-center">
              {getFileIcon()}
            </div>
          }
          name={file.name}
          location={locationText}
          createdAt={formatDate(file.createdAt)}
          rightExtra={
            !hideActions && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContextMenu(true);
                  setContextMenuPos({ x: e.clientX, y: e.clientY });
                }}
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out p-1 hover:bg-gray-200 rounded click-scale"
                aria-label="More actions"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )
          }
        />
      </div>

      {/* Context Menu */}
      {!hideActions && showContextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]"
          style={getContextMenuStyle()}
        >
          {lockedView ? (
            // Locked view: only show Unlock
            onLock && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setShowContextMenu(false);
                  await onLock(file.id);
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Unlock
              </button>
            )
          ) : (
            <>
              {/* Rename */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRename();
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Rename
              </button>

              {/* Lock File */}
              {(onLock || token) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLock();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Lock
                </button>
              )}

              {/* Favorite */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite();
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Favorite
              </button>

              {/* Delete */}
              {onDelete && (
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
            </>
          )}
        </div>
      )}
    </>
  );
}


