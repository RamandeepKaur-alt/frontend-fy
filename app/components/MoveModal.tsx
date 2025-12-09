"use client";

import { useState, useEffect } from "react";
import { X, FolderOpen, ChevronRight } from "lucide-react";
import { API_BASE } from "../utils/authClient";

interface Folder {
  id: number;
  name: string;
  parentId: number | null;
}

interface NestedFolder extends Folder {
  subfolders?: NestedFolder[];
}

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetFolderId: number | null) => Promise<void>;
  folders: Folder[];
  token: string | null;
  currentFolderId?: number | null;
  title?: string; // Custom title (default: "Move Items")
  buttonText?: string; // Custom button text (default: "Move")
  showNewFolder?: boolean; // Show "New Folder" option instead of "Root" (default: false)
  onCreateNewFolder?: (name: string) => Promise<number | null>; // Callback to create new folder
}

export default function MoveModal({
  isOpen,
  onClose,
  onMove,
  folders,
  token,
  currentFolderId,
  title = "Move Items",
  buttonText = "Move",
  showNewFolder = false,
  onCreateNewFolder,
}: MoveModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [availableFolders, setAvailableFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      fetchAllFolders();
    }
  }, [isOpen, token]);

  // Helper function to flatten nested folders
  const flattenFolders = (folders: NestedFolder[], result: Folder[] = []): Folder[] => {
    folders.forEach((folder) => {
      result.push({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
      });
      if (folder.subfolders && folder.subfolders.length > 0) {
        flattenFolders(folder.subfolders, result);
      }
    });
    return result;
  };

  const fetchAllFolders = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/folders/contents`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Flatten nested folder structure
        const allFolders = flattenFolders(data.folders || []);
        // Filter out current folder and its children to prevent circular moves
        const filtered = allFolders.filter((f: Folder) => {
          if (currentFolderId && f.id === currentFolderId) return false;
          // Could add recursive check for children, but for now just exclude current
          return true;
        });
        setAvailableFolders(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch folders:", err);
    }
  };

  const handleMove = async () => {
    setLoading(true);
    try {
      await onMove(selectedFolderId);
      onClose();
      setSelectedFolderId(null);
      setShowNewFolderInput(false);
      setNewFolderName("");
    } catch (err) {
      console.error("Failed to move items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim() || !onCreateNewFolder) return;
    
    setCreatingFolder(true);
    try {
      const newFolderId = await onCreateNewFolder(newFolderName.trim());
      if (newFolderId !== null) {
        setSelectedFolderId(newFolderId);
        setShowNewFolderInput(false);
        setNewFolderName("");
        // Refresh folder list
        if (token) {
          fetchAllFolders();
        }
      }
    } catch (err) {
      console.error("Failed to create new folder:", err);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSelectNewFolder = () => {
    if (showNewFolder) {
      setShowNewFolderInput(true);
      setSelectedFolderId(null);
    } else {
      setSelectedFolderId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop"
      style={{ transition: 'opacity 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out' }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md modal-content">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Destination Folder
          </label>
          <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
            {/* New Folder Option */}
            {showNewFolder && (
              <div className="border-b border-gray-200">
                {!showNewFolderInput ? (
                  <button
                    onClick={handleSelectNewFolder}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 transition-all duration-200 ease-in-out ${
                      selectedFolderId === null && !showNewFolderInput ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 text-[#9bc4a8]" />
                    <span className="text-sm font-medium text-gray-800">New Folder</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-blue-50 border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="w-4 h-4 text-[#9bc4a8]" />
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newFolderName.trim()) {
                            handleCreateNewFolder();
                          } else if (e.key === 'Escape') {
                            setShowNewFolderInput(false);
                            setNewFolderName("");
                          }
                        }}
                        placeholder="Enter folder name..."
                        className="flex-1 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#9bc4a8]"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateNewFolder}
                        disabled={!newFolderName.trim() || creatingFolder}
                        className="text-xs bg-[#9bc4a8] text-white px-3 py-1 rounded hover:bg-[#8ab39a] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingFolder ? "Creating..." : "Create"}
                      </button>
                      <button
                        onClick={() => {
                          setShowNewFolderInput(false);
                          setNewFolderName("");
                        }}
                        className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Root Folder Option (when not showing New Folder) */}
            {!showNewFolder && (
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 transition-all duration-200 ease-in-out ${
                  selectedFolderId === null ? "bg-blue-50 border-l-4 border-blue-500" : ""
                }`}
              >
                <FolderOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-800">Root (Main Folder)</span>
              </button>
            )}
            
            {/* Existing Folders */}
            {availableFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setShowNewFolderInput(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 transition-all duration-200 ease-in-out ${
                  selectedFolderId === folder.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                }`}
              >
                <FolderOpen className="w-4 h-4 text-[#9bc4a8]" />
                <span className="text-sm font-medium text-gray-800">{folder.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200 transition-all duration-200 ease-in-out text-sm click-scale"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={loading || (showNewFolder && selectedFolderId === null && !showNewFolderInput)}
            className="flex-1 bg-[#9bc4a8] text-white font-medium py-2 rounded-lg hover:bg-[#8ab39a] transition-all duration-200 ease-in-out text-sm disabled:opacity-50 disabled:cursor-not-allowed click-scale"
          >
            {loading ? `${buttonText}ing...` : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

