"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { 
  Search, 
  User,
  FolderOpen,
  Star,
  X
} from "lucide-react";
import FolderListItem from "../../components/FolderListItem";
import { buildFolderPath } from "../../utils/folderPath";
import VoiceSearchButton from "../../components/VoiceSearchButton";
import ActionToolbar from "../../components/ActionToolbar";
import MoveModal from "../../components/MoveModal";
import FileManagerSidebar from "../../components/FileManagerSidebar";
import ProfileDropdown from "../../components/ProfileDropdown";
import LeaveConfirmModal from "../../components/LeaveConfirmModal";
import { useLeaveConfirmation } from "../../hooks/useLeaveConfirmation";
import { fuzzySearch, SearchableItem } from "../../utils/fuzzySearch";
import { BRAND_NAME } from "../../config/brand";
import { useClipboard } from "../../contexts/ClipboardContext";
import { useClipboardActions } from "../../hooks/useClipboardActions";
import { useToast } from "../../contexts/ToastContext";
import { useSmoothNavigation } from "../../hooks/useSmoothNavigation";
import { API_BASE } from "../../utils/authClient";

interface Folder extends SearchableItem {
  id: number;
  name: string;
  parentId?: number | null;
  createdAt: string;
  folderColor?: string;
  isLocked?: boolean;
  isImportant?: boolean;
  parentChain?: Array<{ id: number; name: string }>;
}

export default function ImportantFoldersPage() {
  const router = useRouter();
  const smoothNavigate = useSmoothNavigation();
  const { leaveOpen, onStay, onLeave } = useLeaveConfirmation({ leaveTo: "/dashboard" });
  const [userName, setUserName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<number>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  
  // Global clipboard system
  const { clipboard, hasItems } = useClipboard();
  const { cutItems, copyItems, pasteItems, deleteItems, shareItems } = useClipboardActions();
  const { showSuccess, showError } = useToast();
  
  // Convert selected folders to item types map for clipboard actions
  const selectedItemTypes = new Map<number, 'folder' | 'file'>();
  selectedFolderIds.forEach(id => selectedItemTypes.set(id, 'folder'));

  const colorOptions = [
    { name: "Blue", value: "blue", hex: "#3B82F6" },
    { name: "Teal", value: "teal", hex: "#059669" },
    { name: "Yellow", value: "yellow", hex: "#F59E0B" },
    { name: "Orange", value: "orange", hex: "#F97316" },
  ];

  const getColorHex = (colorName: string) => {
    const color = colorOptions.find(c => c.value === colorName);
    return color?.hex || "#3b82f6";
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedUser !== "undefined") {
      try {
        const parsed = JSON.parse(storedUser);
        setUserName(parsed.name || "");
        
        if (storedToken) {
          setToken(storedToken);
        } else {
          router.push("/login");
          return;
        }
      } catch (err) {
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (token) {
      fetchImportantFolders();
    }
  }, [token]);

  // Handle sidebar category navigation
  useEffect(() => {
    if (!token) return;

    const getOrCreateCategoryFolder = async (categoryName: string): Promise<number | null> => {
      if (!token) return null;

      const categoryColors: Record<string, string> = {
        "Work": "blue",
        "Personal": "green",
        "Documents": "blue",
        "Media": "purple",
        "Important": "orange",
      };

      try {
        // 1) Try to find an existing folder with this name at root level
        try {
          const res = await fetch(`${API_BASE}/api/folders?parentId=`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (res.ok) {
            const data = await res.json();
            const categoryFolder = data.folders?.find((f: Folder) => f.name === categoryName && f.parentId === null);
            
            if (categoryFolder) {
              return categoryFolder.id;
            }
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error(`Failed to list folders when resolving category '${categoryName}' (important view):`, res.status, errorData);
          }
        } catch (err) {
          console.error(`Error fetching folders when resolving category '${categoryName}' (important view):`, err);
        }

        // 2) If not found or listing failed, try to create the category folder
        try {
          const createRes = await fetch(`${API_BASE}/api/folders/create`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: categoryName,
              folderColor: categoryColors[categoryName] || "blue",
              parentId: null,
            }),
          });

          const createData = await createRes.json().catch(() => ({}));

          if (!createRes.ok) {
            console.error(`Failed to create category folder '${categoryName}' (important view):`, createRes.status, createData);
            return null;
          }

          if (createData && createData.folder && createData.folder.id) {
            return createData.folder.id as number;
          }
        } catch (err) {
          console.error(`Error creating category folder '${categoryName}' (important view):`, err);
        }
      } catch (err) {
        console.error(`Failed to get or create category folder ${categoryName} (important view):`, err);
      }

      return null;
    };

    const handleCategoryClick = async (event: CustomEvent<{ category: string }>) => {
      const category = event.detail.category;

      try {
        const categoryFolderId = await getOrCreateCategoryFolder(category);
        
        if (categoryFolderId) {
          smoothNavigate(`/dashboard/folder/${categoryFolderId}?category=${encodeURIComponent(category)}`);
        } else {
          showError(`Failed to access ${category}. Please try again.`);
        }
      } catch (err) {
        console.error(`Failed to navigate to ${category}:`, err);
        showError(`Failed to access ${category}. Please try again.`);
      }
    };

    const wrappedHandler = (e: Event) => {
      handleCategoryClick(e as CustomEvent<{ category: string }>);
    };

    window.addEventListener("sidebar-category-clicked", wrappedHandler);

    return () => {
      window.removeEventListener("sidebar-category-clicked", wrappedHandler);
    };
  }, [token, smoothNavigate, showError]);


  const fetchImportantFolders = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/folders/important`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      } else if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      } else {
        console.error("Failed to fetch important folders:", res.status);
      }
    } catch (err) {
      console.error("Failed to fetch important folders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameFolder = async (id: number, newName: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/folders/${id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setFolders(prev =>
          prev.map(f => f.id === id ? { ...f, name: data.folder.name } : f)
        );
        showSuccess("Folder renamed successfully");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to rename folder");
      }
    } catch (err: unknown) {
      console.error("Failed to rename folder:", err);
      const message = err instanceof Error ? err.message : "Failed to rename folder";
      showError(message);
      throw err;
    }
  };

  const handleToggleImportant = async (id: number) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/folders/important/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Remove from list if unmarked as important
        if (!data.folder.isImportant) {
          setFolders(prev => prev.filter(f => f.id !== id));
          setSelectedFolderIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        } else {
          setFolders(prev =>
            prev.map(f => f.id === id ? { ...f, isImportant: data.folder.isImportant } : f)
          );
        }
      } else {
        throw new Error("Failed to toggle important");
      }
    } catch (err: unknown) {
      console.error("Failed to toggle important:", err);
      throw err;
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/folders/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        setFolders(prev => prev.filter(f => f.id !== id));
        setSelectedFolderIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        showSuccess("Folder deleted successfully");
      } else {
        throw new Error("Failed to delete folder");
      }
    } catch (err: unknown) {
      console.error("Failed to delete folder:", err);
      showError("Failed to delete folder");
    }
  };

  const handleSelectFolder = (id: number, selected: boolean) => {
    setSelectedFolderIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleCut = () => {
    if (selectedFolderIds.size === 0) return;
    cutItems(selectedFolderIds, selectedItemTypes, folders, []);
    setSelectedFolderIds(new Set());
  };

  const handleCopy = () => {
    if (selectedFolderIds.size === 0) return;
    copyItems(selectedFolderIds, selectedItemTypes, folders, []);
  };

  const handlePaste = async () => {
    if (!hasItems()) return;
    setShowPasteModal(true);
  };

  const handleShare = async () => {
    if (selectedFolderIds.size === 0) {
      showError("Please select folders to share");
      return;
    }
    
    try {
      setLoading(true);
      const shareData = await shareItems(selectedFolderIds, selectedItemTypes, token);
      
      if (shareData.shareLink) {
        await navigator.clipboard.writeText(shareData.shareLink);
        showSuccess("Share link copied to clipboard!");
      }
      setSelectedFolderIds(new Set());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to share folders";
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedFolderIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedFolderIds.size} folder(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteItems(selectedFolderIds, selectedItemTypes, token);
      setFolders(prev => prev.filter(f => !selectedFolderIds.has(f.id)));
      setSelectedFolderIds(new Set());
      showSuccess("Folders deleted successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete folders";
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeselectAll = () => {
    setSelectedFolderIds(new Set());
  };

  // Filter folders based on search query
  const filteredFolders = debouncedSearchQuery
    ? fuzzySearch<Folder>(folders, debouncedSearchQuery)
    : folders;

  return (
    <Suspense fallback={null}>
    <div className="min-h-screen flex flex-col page-transition" style={{ backgroundColor: '#FAFAFA' }}>
      <LeaveConfirmModal open={leaveOpen} onStay={onStay} onLeave={onLeave} />
      {/* Modern Navbar - Matching Dashboard */}
      <nav 
        className="px-6 py-4 transition-shadow duration-200" 
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderBottom: '1px solid #E2E8F0', 
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' 
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <FolderOpen className="w-5 h-5 flex-shrink-0" style={{ color: '#64748B' }} />
            <h1 className="text-xl font-semibold tracking-tight flex-shrink-0" style={{ color: '#0F172A' }}>
              {BRAND_NAME}
            </h1>
          </div>

          <div className="flex items-center justify-center flex-1">
            <div className="relative group" style={{ width: '100%', maxWidth: '400px' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200" style={{ color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVoiceError("");
                }}
                className="w-full pl-9 pr-10 py-2 bg-white border rounded-full focus:outline-none focus:border-[#2563EB] text-sm transition-all duration-200 hover:shadow-sm focus:shadow-md focus:ring-2 focus:ring-[#2563EB]/20"
                style={{
                  borderColor: '#E2E8F0',
                  color: '#0F172A',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <VoiceSearchButton
                  onTranscript={(text) => {
                    setSearchQuery(text);
                    setVoiceError("");
                  }}
                  onError={(error) => {
                    setVoiceError(error);
                    setTimeout(() => setVoiceError(""), 5000);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <ProfileDropdown userName={userName || ""} />
          </div>
        </div>
      </nav>

      <div className="flex flex-1">
        {/* File Manager Sidebar */}
        <FileManagerSidebar />
        
        <main className="flex-1 overflow-y-auto flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Action Toolbar */}
        <div className="px-8 pt-4 pb-3 action-toolbar" style={{ backgroundColor: '#FFFFFF' }}>
          <ActionToolbar
            onCut={handleCut}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onShare={handleShare}
            onDelete={handleDelete}
            disabled={{
              cut: selectedFolderIds.size === 0,
              copy: selectedFolderIds.size === 0,
              paste: !hasItems(),
              share: selectedFolderIds.size === 0,
              delete: selectedFolderIds.size === 0,
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
        {/* Show loading state when fetching */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-sm" style={{ color: '#64748B' }}>Loading important folders...</p>
          </div>
        ) : (
          /* Content Area - Matches Dashboard Style */
          <div className="min-h-full">
            <div className="px-8 pb-8 pt-6">
              {/* Section title aligned with sidebar, matching dashboard style */}
              <div className="mb-4">
                <h2 className="text-sm font-medium tracking-wide text-slate-500 uppercase">
                  Favorites
                </h2>
              </div>
              {/* Voice Error Message */}
              {voiceError && (
                <div className="mb-4 p-3 rounded-lg text-sm border" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}>
                  {voiceError}
                </div>
              )}

              {/* Important Folders Empty / List */}
              {filteredFolders.length === 0 ? (
                <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                  <div className="text-center">
                    <Star className="w-12 h-12 mx-auto mb-4" style={{ color: '#94A3B8', opacity: 0.5 }} />
                    <p className="text-sm" style={{ color: '#64748B' }}>
                      {debouncedSearchQuery ? "No folders match your search" : "No important folders yet"}
                    </p>
                    {!debouncedSearchQuery && (
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        Mark folders as important to quickly access them here.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredFolders.map((folder) => {
                    const folderColorHex = getColorHex(folder.folderColor || "blue");
                    return (
                      <div key={`folder-${folder.id}`} className="transition-colors hover:bg-gray-50/50">
                        <FolderListItem
                          folder={folder}
                          folderColorHex={folderColorHex}
                          locationText={buildFolderPath(folder)}
                          onRename={handleRenameFolder}
                          onToggleImportant={handleToggleImportant}
                          onDelete={handleDeleteFolder}
                          onClick={() => smoothNavigate(`/dashboard/folder/${folder.id}`)}
                          isSelected={selectedFolderIds.has(folder.id)}
                          onSelect={handleSelectFolder}
                          selectionMode={selectedFolderIds.size > 0}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
        </main>
      </div>

      {/* Move Modal for Paste */}
      {showPasteModal && (
        <MoveModal
          isOpen={showPasteModal}
          onClose={() => setShowPasteModal(false)}
          onMove={async (destinationFolderId) => {
            try {
              setLoading(true);
              await pasteItems(destinationFolderId);
              setShowPasteModal(false);
              setSelectedFolderIds(new Set());
              showSuccess("Items pasted successfully");
              await fetchImportantFolders();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Failed to paste items";
              showError(message);
            } finally {
              setLoading(false);
            }
          }}
          folders={[]}
          token={token || ""}
          currentFolderId={null}
          title="Select Destination"
          buttonText="Paste Here"
        />
      )}
    </div>
    </Suspense>
  );
}
