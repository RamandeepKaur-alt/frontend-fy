"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Search, 
  User,
  FolderOpen,
  Folder,
  Lock,
  Star,
  Settings,
  LogOut,
  ChevronDown,
  X,
  Download,
  ArrowLeft,
  Clock,
  Check,
} from "lucide-react";
import FolderListItem from "../components/FolderListItem";
import FileListItem from "../components/FileListItem";
import VoiceSearchButton from "../components/VoiceSearchButton";
import ActionToolbar from "../components/ActionToolbar";
import MoveModal from "../components/MoveModal";
import FileManagerSidebar from "../components/FileManagerSidebar";
import CategorySelectionModal from "../components/CategorySelectionModal";
import CommandBar from "../components/CommandBar";
import ArcActionButton from "../components/ArcActionButton";
import LeaveConfirmModal from "../components/LeaveConfirmModal";
import { useLeaveConfirmation } from "../hooks/useLeaveConfirmation";
import { BRAND_NAME } from "../config/brand";
import { fuzzySearch, SearchableItem } from "../utils/fuzzySearch";
import { useClipboard } from "../contexts/ClipboardContext";
import { useClipboardActions } from "../hooks/useClipboardActions";
import { useToast } from "../contexts/ToastContext";
import { useSmoothNavigation } from "../hooks/useSmoothNavigation";
import { getRecentItemIds, addRecentItem, addRecentItemAndNotify, getRecentItems, removeRecentItem } from "../utils/recentItems";
import { buildFolderPath } from "../utils/folderPath";
import { getEnabledCategories } from "../utils/categoryManagement";
import { API_BASE } from "../utils/authClient";

// (removed unused AnyFile to avoid linter/TS warnings)
interface Folder extends SearchableItem {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  folderColor?: string;
  isLocked?: boolean;
  isImportant?: boolean;
  parentChain?: Array<{ id: number; name: string }>;
}

interface AppFile extends SearchableItem {
  id: number;
  name: string;
  url: string;
  size: number;
  mimetype: string;
  createdAt: string;
  folderId?: number | null;
}

// Profile Dropdown Component
function ProfileDropdown({ userName }: { userName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("locked_folders_authenticated");
    window.location.href = "/";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="w-6 h-6 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-700">{userName}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={() => {
              setIsOpen(false);
              // Navigate to profile page if exists
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              // Navigate to settings page if exists
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const smoothNavigate = useSmoothNavigation();
  const searchParams = useSearchParams();
  const { leaveOpen, onStay, onLeave } = useLeaveConfirmation({ leaveTo: "/" });
  const [userName, setUserName] = useState<string | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("blue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<AppFile[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]); // All folders for Recent section
  const [recentFilesData, setRecentFilesData] = useState<AppFile[]>([]); // All recent files (from anywhere)
  const [recentItemIds, setRecentItemIds] = useState<{ folders: Set<number>, files: Set<number> }>(() => getRecentItemIds());
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedItemTypes, setSelectedItemTypes] = useState<Map<number, 'folder' | 'file'>>(new Map());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  
  // Global clipboard system
  const { clipboard, hasItems } = useClipboard();
  const { cutItems, copyItems, pasteItems, deleteItems, shareItems } = useClipboardActions();
  const { showSuccess, showError } = useToast();
  const [sortOrder, setSortOrder] = useState<'name' | 'date' | 'size'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [voiceError, setVoiceError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<AppFile | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"folder" | "upload">("folder");
  const [pendingFolderData, setPendingFolderData] = useState<{ name: string; color: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<globalThis.File | null>(null);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [isToolbarStuck, setIsToolbarStuck] = useState(false);
  const toolbarSentinelRef = useRef<HTMLDivElement | null>(null);

  const colorOptions = [
    { name: "Blue", value: "blue", hex: "#3B82F6" },
    { name: "Teal", value: "teal", hex: "#059669" },
    { name: "Yellow", value: "yellow", hex: "#F59E0B" },
    { name: "Orange", value: "orange", hex: "#F97316" },
  ];

  const getColorHex = (colorName: string) => {
    const color = colorOptions.find(c => c.value === colorName);
    return color?.hex || "#3B82F6";
  };

  const getButtonTextColor = (hex: string) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.65 ? '#111827' : '#FFFFFF';
  };

  // Close New Folder modal with Escape
  useEffect(() => {
    if (!showCreateFolderModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCreateFolderModal(false);
        setFolderName("");
        setFolderColor("blue");
        setError("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showCreateFolderModal]);

  // Persist last-used folder color in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('fynora_last_folder_color');
    if (stored && colorOptions.some(c => c.value === stored)) {
      setFolderColor(stored as typeof colorOptions[number]['value']);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (folderColor) {
      localStorage.setItem('fynora_last_folder_color', folderColor);
    }
  }, [folderColor]);

  // Detect when the action toolbar enters its sticky state
  useEffect(() => {
    const sentinel = toolbarSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the sentinel scrolls out of view at the top, the toolbar is stuck
        setIsToolbarStuck(entry.intersectionRatio === 0);
      },
      {
        root: null,
        threshold: [0, 1],
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    const openNewFromQuery = searchParams.get("openNew") === "1";

    if (storedUser && storedUser !== "undefined") {
      try {
        const parsed = JSON.parse(storedUser);
        setUserName(parsed.name || "");
        
        if (storedToken) {
          setToken(storedToken);
          
          // If requested via URL, open the New Folder UI automatically
          if (openNewFromQuery) {
            setShowCreateFolderModal(true);
          }
        } else {
          router.push("/login");
          return;
        }
        
        const isNewSignup = searchParams.get("newSignup") === "true" || 
                           localStorage.getItem("justSignedUp") === "true";
        
        if (isNewSignup) {
          setShowWelcomePopup(true);
          localStorage.removeItem("justSignedUp");
          
          setTimeout(() => {
            setShowWelcomePopup(false);
          }, 4000);
        }
      } catch (err) {
        console.error("Failed to parse user:", err);
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [searchParams, router]);

  // Fetch all folders (not just root) for Recent section
  // Use useCallback to ensure stable reference and avoid closure issues
  // MUST be defined before useEffects that use it
  const fetchAllFolders = useCallback(async () => {
    if (!token) return;

    try {
      const recentItemIdsLocal = getRecentItemIds();
      const folderIds = Array.from(recentItemIdsLocal.folders);
      
      if (folderIds.length === 0) {
        setAllFolders([]);
        setRecentItemIds({ folders: new Set(), files: new Set() });
        return;
      }

      // Fetch each folder individually
      const folderPromises = folderIds.map(async (folderId) => {
        try {
          const res = await fetch(`${API_BASE}/api/folders/${folderId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (res.ok) {
            const data = await res.json();
            return data.folder;
          }
          // If folder not found (deleted), remove from recent items
          if (res.status === 404) {
            removeRecentItem(folderId, 'folder');
            return null;
          }
          return null;
        } catch (err) {
          console.error(`Failed to fetch folder ${folderId}:`, err);
          return null;
        }
      });

      const fetchedFolders = await Promise.all(folderPromises);
      const validFolders = fetchedFolders.filter(f => f !== null) as Folder[];
      
      // Update recent items with current folder names (in case they were renamed)
      const recentItems = getRecentItems();
      let hasUpdates = false;
      validFolders.forEach(folder => {
        const recentItem = recentItems.find(item => item.id === folder.id && item.type === 'folder');
        if (recentItem && recentItem.name !== folder.name) {
          addRecentItem(folder.id, 'folder', folder.name);
          hasUpdates = true;
        }
      });
      
      if (hasUpdates) {
        window.dispatchEvent(new CustomEvent('recent-items-updated'));
      }
      
      setAllFolders(validFolders);
      const newIds = getRecentItemIds();
      setRecentItemIds(newIds);
    } catch (err) {
      console.error("Failed to fetch all folders:", err);
    }
  }, [token]);

  // Fetch recent files from backend so uploads/modifications from any folder appear (Google Drive-style)
  const fetchRecentFiles = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/files/recent`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRecentFilesData((data.files || []) as AppFile[]);
      } else if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("locked_folders_authenticated");
        router.push("/login");
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch recent files:", res.status, errorData);
      }
    } catch (err) {
      console.error("Failed to fetch recent files:", err);
    }
  }, [token, router]);

  useEffect(() => {
    if (token) {
      fetchFolders();
      fetchFiles();
      fetchAllFolders(); // Fetch all folders for Recent section
      fetchRecentFiles(); // Fetch all recent files (by ID) for Recent section
    }
  }, [token, fetchAllFolders, fetchRecentFiles]);
  
  // Refresh Recent section when navigating back to dashboard
  useEffect(() => {
    if (token && typeof window !== 'undefined') {
      const handleFocus = () => {
        setTimeout(() => {
          fetchAllFolders();
        }, 300);
      };
      
      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [token, fetchAllFolders]);

  // Refresh all folders and recent files when recent items change
  useEffect(() => {
    if (!token) return;
    
    const checkRecentItems = () => {
      fetchAllFolders();
      fetchRecentFiles();
    };
    
    // Check immediately on mount
    checkRecentItems();
    
    // Listen for custom events when folder operations occur
    const handleFolderOpened = () => {
      setTimeout(checkRecentItems, 150);
    };
    
    const handleFolderCreated = () => {
      setTimeout(checkRecentItems, 150);
    };
    
    const handleFolderModified = () => {
      setTimeout(checkRecentItems, 150);
    };
    
    const handleRecentItemsUpdated = () => {
      setTimeout(checkRecentItems, 150);
    };
    
    // Listen for page visibility changes (when user returns to dashboard)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(checkRecentItems, 200);
      }
    };
    
    window.addEventListener('folder-opened', handleFolderOpened as EventListener);
    window.addEventListener('folder-created', handleFolderCreated as EventListener);
    window.addEventListener('folder-modified', handleFolderModified as EventListener);
    window.addEventListener('recent-items-updated', handleRecentItemsUpdated);
    window.addEventListener('storage', checkRecentItems);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', checkRecentItems);
      window.removeEventListener('folder-opened', handleFolderOpened as EventListener);
      window.removeEventListener('folder-created', handleFolderCreated as EventListener);
      window.removeEventListener('folder-modified', handleFolderModified as EventListener);
      window.removeEventListener('recent-items-updated', handleRecentItemsUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, fetchAllFolders]);

  // Handle sidebar events
  useEffect(() => {
    const handleNewClick = () => {
      // Show create folder modal first, then location selection will happen after
      setShowCreateFolderModal(true);
    };

    const handleUploadClick = () => {
      fileInputRef.current?.click();
    };

    window.addEventListener('sidebar-new-clicked', handleNewClick);
    window.addEventListener('sidebar-upload-clicked', handleUploadClick);

    return () => {
      window.removeEventListener('sidebar-new-clicked', handleNewClick);
      window.removeEventListener('sidebar-upload-clicked', handleUploadClick);
    };
  }, []);

  // Handle location navigation separately to avoid dependency array issues
  useEffect(() => {
    if (!token) return;

    const handleCategoryClick = async (e: Event) => {
      const event = e as CustomEvent<{ category: string }>;;
      const category = event?.detail?.category;
      if (!category) return;

      try {
        const categoryFolderId = await getOrCreateCategoryFolder(category);
        if (categoryFolderId) {
          smoothNavigate(`/dashboard/folder/${categoryFolderId}?category=${encodeURIComponent(category)}`);
        } else {
          setError(`Failed to access ${category}. Please try again.`);
          setTimeout(() => setError(""), 5000);
        }
      } catch (err) {
        console.error(`Failed to navigate to ${category}:`, err);
        setError(`Failed to access ${category}. Please try again.`);
        setTimeout(() => setError(""), 5000);
      }
    };

    window.addEventListener('sidebar-category-clicked', handleCategoryClick);
    return () => window.removeEventListener('sidebar-category-clicked', handleCategoryClick);
  }, [token, smoothNavigate]);

  const fetchFolders = async () => {
    if (!token) return;

    try {
      // Fetch root folders (parentId=null)
      const res = await fetch(`${API_BASE}/api/folders?parentId=`, {
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
        sessionStorage.removeItem("locked_folders_authenticated");
        router.push("/login");
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch folders:", res.status, errorData);
      }
    } catch (err) {
      console.error("Failed to fetch folders:", err);
    }
  };

  const fetchFiles = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/files/root`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch files:", res.status, errorData);
      }
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  // Get or create a category folder (robust against backend list failures)
  const getOrCreateCategoryFolder = async (categoryName: string): Promise<number | null> => {
    if (!token) return null;

    // Map category names to colors
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
          console.error(`Failed to list folders when resolving category '${categoryName}':`, res.status, errorData);
        }
      } catch (err) {
        console.error(`Error fetching folders when resolving category '${categoryName}':`, err);
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
          console.error(`Failed to create category folder '${categoryName}':`, createRes.status, createData);
          return null;
        }

        if (createData && createData.folder && createData.folder.id) {
          return createData.folder.id as number;
        }
      } catch (err) {
        console.error(`Error creating category folder '${categoryName}':`, err);
      }
    } catch (err) {
      console.error(`Failed to get or create category folder ${categoryName}:`, err);
    }

    return null;
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication required. Please login again.");
      router.push("/login");
      return;
    }

    if (!folderName.trim()) {
      setError("Folder name is required");
      return;
    }

    // Store folder data and show category selection modal
    setPendingFolderData({ name: folderName.trim(), color: folderColor });
    setShowCreateFolderModal(false);
    setCategoryModalMode("folder");
    setShowCategoryModal(true);
  };

  const handleCategorySelected = async (categoryName: string) => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      // Get or create the category folder
      const categoryFolderId = await getOrCreateCategoryFolder(categoryName);
      
      if (categoryFolderId === null) {
        setError(`Failed to access ${categoryName} category. Please try again.`);
        setLoading(false);
        return;
      }

      if (categoryModalMode === "folder" && pendingFolderData) {
        // Create folder in the selected category
        const res = await fetch(`${API_BASE}/api/folders/create`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: pendingFolderData.name,
            folderColor: pendingFolderData.color,
            parentId: categoryFolderId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            setError("Session expired. Please login again.");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setTimeout(() => router.push("/login"), 2000);
          } else {
            setError(data.error || "Failed to create folder");
          }
          setLoading(false);
          setPendingFolderData(null);
          return;
        }

        // Add to recent items
        if (data.folder) {
          addRecentItem(data.folder.id, 'folder', data.folder.name);
          
          // Dispatch events to trigger Recent section refresh
          window.dispatchEvent(new CustomEvent('folder-created', { detail: { folderId: data.folder.id } }));
          window.dispatchEvent(new CustomEvent('recent-items-updated'));
          
          // Refresh the Recent section
          setTimeout(() => {
            fetchAllFolders();
          }, 300);
        }
        
        // Refresh folders to show the new folder in the category
        await fetchFolders();
        
        setFolderName("");
        setFolderColor("blue");
        setPendingFolderData(null);
        setLoading(false);
        showSuccess(`Folder created in ${categoryName}!`);
      } else if (categoryModalMode === "upload" && pendingFile) {
        // Upload file to the selected category
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("folderId", categoryFolderId.toString());

        const res = await fetch(`${API_BASE}/api/files/upload`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to upload file");
          setUploading(false);
          setPendingFile(null);
          return;
        }

        // Add to recent items and notify Recents listeners
        if (data.file) {
          addRecentItemAndNotify(data.file.id, 'file', data.file.name);
        }
        
        // Refresh files to show the new file in the category
        await fetchFiles();
        
        setUploading(false);
        setPendingFile(null);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        showSuccess(`File uploaded to ${categoryName}!`);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
      setPendingFolderData(null);
      setPendingFile(null);
    }
  };

  const handleRenameFolder = async (id: number, newName: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/folders/${id}/rename`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok) {
        const data = await res.json();
        setFolders(prev =>
          prev.map(f => f.id === id ? { ...f, name: data.folder.name } : f)
        );
        
        // Update recent items with new name and mark as recently modified
        addRecentItem(id, 'folder', data.folder.name);
        // Dispatch event to trigger Recent section refresh
        window.dispatchEvent(new CustomEvent('folder-modified', { detail: { folderId: id } }));
        window.dispatchEvent(new CustomEvent('recent-items-updated'));
        
        // Refresh Recent section to show updated folder
        await fetchAllFolders();
      } else {
        throw new Error("Failed to rename folder");
      }
    } catch (err) {
      console.error("Failed to rename folder:", err);
      throw err;
    }
  };

  const handleLock = async (id: number, password: string) => {
    if (!token) return;

    try {
      // Lock folder without requiring password
      const res = await fetch(`${API_BASE}/api/folders/lock/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        await res.json();
        // Remove folder from main list (it will appear in locked folders)
        setFolders(prev => prev.filter(f => f.id !== id));
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to lock folder");
      }
    } catch (err: unknown) {
      console.error("Failed to lock folder:", err);
      throw err;
    }
  };

  const handleUnlock = async (id: number, password?: string) => {
    if (!token) return;

    try {
      // Check if user is authenticated in locked folders session
      const skipPasswordCheck = sessionStorage.getItem('locked_folders_authenticated') === 'true';
      
      const res = await fetch(`${API_BASE}/api/folders/unlock/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          password: password || "",
          skipPasswordCheck 
        }),
      });

      if (res.ok) {
        await res.json();
        // Fetch folders again to get the unlocked folder back in the list
        fetchFolders();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to unlock folder");
      }
    } catch (err: unknown) {
      console.error("Failed to unlock folder:", err);
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
        setFolders(prev =>
          prev.map(f => f.id === id ? { ...f, isImportant: data.folder.isImportant } : f)
        );
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
        // Remove from recent items
        removeRecentItem(id, 'folder');
      } else {
        throw new Error("Failed to delete folder");
      }
    } catch (err: unknown) {
      console.error("Failed to delete folder:", err);
      throw err;
    }
  };

  // Process voice commands
  const processVoiceCommand = (text: string): string => {
    const lowerText = text.toLowerCase().trim();
    
    // Voice commands
    if (lowerText.includes("show important") || lowerText.includes("important folders")) {
      smoothNavigate("/dashboard/important");
      return "";
    }
    
    if (lowerText.includes("show locked") || lowerText.includes("locked folders")) {
      smoothNavigate("/dashboard/locked");
      return "";
    }
    
    if (lowerText.includes("go back") || lowerText.includes("back")) {
      smoothNavigate("/dashboard");
      return "";
    }
    
    // Extract folder name from "open folder X" or "search X"
    const openMatch = lowerText.match(/(?:open|show|find|search)\s+(?:folder\s+)?(.+)/);
    if (openMatch && openMatch[1]) {
      return openMatch[1].trim();
    }
    
    // Return the text as-is for normal search
    return text;
  };

  // Update recent item IDs when localStorage changes
  useEffect(() => {
    const updateRecentItemIds = () => {
      const newIds = getRecentItemIds();
      setRecentItemIds(newIds);
      // Also trigger fetchAllFolders to refresh the list
      if (token) {
        setTimeout(() => {
          fetchAllFolders();
          fetchRecentFiles();
        }, 100);
      }
    };
    
    // Update immediately
    updateRecentItemIds();
    
    // Listen for recent items updates
    const handleRecentUpdate = () => {
      updateRecentItemIds();
    };
    
    const handleLocalStorageUpdate = () => {
      updateRecentItemIds();
    };
    
    window.addEventListener('recent-items-updated', handleRecentUpdate);
    window.addEventListener('localStorage-recent-items-updated', handleLocalStorageUpdate as EventListener);
    window.addEventListener('storage', handleRecentUpdate);
    
    return () => {
      window.removeEventListener('recent-items-updated', handleRecentUpdate);
      window.removeEventListener('localStorage-recent-items-updated', handleLocalStorageUpdate as EventListener);
      window.removeEventListener('storage', handleRecentUpdate);
    };
  }, [token, fetchAllFolders]);
  
  // Filter folders:
  // 1. Use allFolders (includes folders from anywhere, not just root)
  // 2. Exclude locked folders
  // 3. Exclude all category folders (enabled categories from category management)
  // 4. Only show folders that are in recent items
  const enabledCategories = getEnabledCategories();
  const unlockedFolders = allFolders.filter(f => !f.isLocked);
  const nonCategoryFolders = unlockedFolders.filter(f => !enabledCategories.includes(f.name));
  const recentFolders = nonCategoryFolders.filter(f => recentItemIds.folders.has(f.id));
  
  // Filter files:
  // Use recentFilesData so uploads in any folder appear, then ensure they are in recent items
  const recentFiles = recentFilesData.filter(f => recentItemIds.files.has(f.id));
  
  // Apply fuzzy search to recent items (don't filter by parentId - show all recent folders)
  const filteredFolders = fuzzySearch(recentFolders, debouncedSearchQuery);
  const filteredFiles = fuzzySearch(recentFiles, debouncedSearchQuery);
  
  // Sort function - sort by most recently viewed first (by default)
  const sortItems = (items: Array<{ type: 'folder' | 'file', data: any }>) => {
    return [...items].sort((a, b) => {
      // Get recent items with timestamps to check viewing order
      const recentItems = getRecentItems();
      
      // Find the recent item entries for both items
      const aRecent = recentItems.find(item => item.id === a.data.id && item.type === a.type);
      const bRecent = recentItems.find(item => item.id === b.data.id && item.type === b.type);
      
      // If both are recent, sort by most recent first (higher viewedAt = more recent)
      if (aRecent && bRecent) {
        return bRecent.viewedAt - aRecent.viewedAt; // Higher timestamp = more recent
      }
      
      // If only one is recent, prioritize it
      if (aRecent) return -1;
      if (bRecent) return 1;
      
      // If neither is recent (shouldn't happen in Recent section), fall back to other sort criteria
      let comparison = 0;
      
      if (sortOrder === 'name') {
        comparison = a.data.name.localeCompare(b.data.name);
      } else if (sortOrder === 'date') {
        const dateA = new Date(a.data.createdAt).getTime();
        const dateB = new Date(b.data.createdAt).getTime();
        comparison = dateA - dateB;
      } else if (sortOrder === 'size') {
        // For folders, use 0 or a default size
        const sizeA = a.type === 'file' ? a.data.size : 0;
        const sizeB = b.type === 'file' ? b.data.size : 0;
        comparison = sizeA - sizeB;
      }
      
      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Combine folders and files for display (folders first, then files)
  const unsortedItems = [
    ...filteredFolders.map(f => ({ type: "folder" as const, data: f })),
    ...filteredFiles.map(f => ({ type: "file" as const, data: f }))
  ];
  
  // Apply sorting
  const allItems = sortItems(unsortedItems);

  const handleDeleteFile = async (id: number) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/files/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== id));
        // Remove from recent items
        removeRecentItem(id, 'file');
      } else {
        throw new Error("Failed to delete file");
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
      throw err;
    }
  };

  const handleDownloadFile = async (file: AppFile) => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/files/${file.id}/download`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to download file");
      }

      // Get the blob from the response
      const blob = await res.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download file:", err);
      setError("Failed to download file. Please try again.");
    }
  };

  const handlePreviewFile = async (file: AppFile) => {
    if (!token) return;
    
    // Track file view
    addRecentItem(file.id, 'file', file.name);
    
    setSelectedFile(file);
    setShowPreviewModal(true);
    setPreviewUrl(null); // Reset preview URL
    
    try {
      // Fetch file with authentication
      const res = await fetch(`${API_BASE}/api/files/${file.id}/download`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load file");
      }

      // Get the blob from the response
      const blob = await res.blob();
      
      // For Word documents (.docx), convert to HTML using mammoth
      if (file.name.endsWith('.docx') || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const mammoth = (await import('mammoth')).default;
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const htmlContent = result.value;
          
          // Create a blob URL from the HTML
          const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
          const url = window.URL.createObjectURL(htmlBlob);
          setPreviewUrl(url);
        } catch (mammothError) {
          console.error("Failed to convert Word document:", mammothError);
          // Fallback to download message
          setPreviewUrl('word-fallback');
        }
      } else {
        // For other files, create a blob URL for preview
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      console.error("Failed to load file for preview:", err);
      setError("Failed to load file for preview. Please try again.");
    }
  };

  const closePreviewModal = () => {
    if (previewUrl && previewUrl !== "word-fallback") {
      try {
        window.URL.revokeObjectURL(previewUrl);
      } catch (revokeError) {
        console.warn("Failed to revoke preview URL:", revokeError);
      }
    }
    setPreviewUrl(null);
    setShowPreviewModal(false);
    setSelectedFile(null);
  };

  // Clean up blob URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== "word-fallback") {
        try {
          window.URL.revokeObjectURL(previewUrl);
        } catch (revokeError) {
          console.warn("Failed to revoke preview URL:", revokeError);
        }
      }
    };
  }, [previewUrl]);

  // Handle selection - allow multiple selections
  const handleSelectItem = (id: number, type: 'folder' | 'file', selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
        setSelectedItemTypes(prevMap => new Map(prevMap).set(id, type));
        setSelectionMode(true);
      } else {
        newSet.delete(id);
        setSelectedItemTypes(prevMap => {
          const newMap = new Map(prevMap);
          newMap.delete(id);
          return newMap;
        });
        if (newSet.size === 0) {
          setSelectionMode(false);
        }
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set<number>();
    const allTypes = new Map<number, 'folder' | 'file'>();
    
    filteredFolders.forEach(f => {
      allIds.add(f.id);
      allTypes.set(f.id, 'folder');
    });
    filteredFiles.forEach(f => {
      allIds.add(f.id);
      allTypes.set(f.id, 'file');
    });
    
    setSelectedItems(allIds);
    setSelectedItemTypes(allTypes);
    setSelectionMode(true);
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
    setSelectedItemTypes(new Map());
    setSelectionMode(false);
  };

  // Deselect when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't deselect if clicking on action buttons or toolbar
      const target = e.target as HTMLElement;
      if (target.closest('.action-toolbar') || target.closest('button')) {
        return;
      }
      
      // Deselect if clicking outside folder items
      if (!target.closest('[data-folder-item]') && !target.closest('[data-file-item]')) {
        handleDeselectAll();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+K or Ctrl+K for command bar
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandBar(true);
        return;
      }
      // Escape to close command bar or deselect
      if (e.key === 'Escape') {
        if (showCommandBar) {
          setShowCommandBar(false);
          return;
        }
        if (selectedItems.size > 0) {
          handleDeselectAll();
          return;
        }
      }
      // Ctrl+A or Cmd+A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !showCommandBar) {
        e.preventDefault();
        handleSelectAll();
      }
      // Ctrl+X or Cmd+X to cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedItems.size > 0 && !showCommandBar) {
        e.preventDefault();
        cutItems(selectedItems, selectedItemTypes, folders, files);
        handleDeselectAll();
      }
      // Ctrl+C or Cmd+C to copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedItems.size > 0 && !showCommandBar) {
        e.preventDefault();
        copyItems(selectedItems, selectedItemTypes, folders, files);
      }
      // Ctrl+V or Cmd+V to paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && hasItems() && !showCommandBar) {
        e.preventDefault();
        // Show paste modal to select destination
        setShowPasteModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems.size, hasItems, token, folders, files, cutItems, copyItems, showCommandBar]);

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedItems.size} item(s)?`;
    if (!confirm(confirmMessage)) return;

    if (!token) return;

    try {
      for (const id of selectedItems) {
        const type = selectedItemTypes.get(id);
        if (type === 'folder') {
          await handleDeleteFolder(id);
        } else {
          await handleDeleteFile(id);
        }
      }
      handleDeselectAll();
    } catch (err) {
      console.error("Failed to delete items:", err);
      setError("Failed to delete some items. Please try again.");
    }
  };

  const handleBulkDownload = async () => {
    if (selectedItems.size === 0) return;
    if (!token) return;

    try {
      const fileIds = Array.from(selectedItems).filter(id => selectedItemTypes.get(id) === 'file');
      
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (file) {
          handleDownloadFile(file);
        }
      }
    } catch (err) {
      console.error("Failed to download files:", err);
      setError("Failed to download some files. Please try again.");
    }
  };

  const handleBulkLock = async () => {
    if (selectedItems.size === 0) return;
    if (!token) return;

    try {
      const folderIds = Array.from(selectedItems).filter(id => selectedItemTypes.get(id) === 'folder');
      
      for (const folderId of folderIds) {
        await handleLock(folderId, "");
      }
      
      handleDeselectAll();
    } catch (err) {
      console.error("Failed to lock folders:", err);
      setError("Failed to lock some folders. Please try again.");
    }
  };

  const handleBulkUnlock = async () => {
    if (selectedItems.size === 0) return;
    if (!token) return;

    try {
      const folderIds = Array.from(selectedItems).filter(id => selectedItemTypes.get(id) === 'folder');
      const isAuthenticated = sessionStorage.getItem('locked_folders_authenticated') === 'true';
      
      for (const folderId of folderIds) {
        if (isAuthenticated) {
          await handleUnlock(folderId);
        }
      }
      
      handleDeselectAll();
    } catch (err) {
      console.error("Failed to unlock folders:", err);
      setError("Failed to unlock some folders. Please try again.");
    }
  };

  const handleBulkMove = async (targetFolderId: number | null) => {
    if (selectedItems.size === 0 || !token) return;

    try {
      for (const id of selectedItems) {
        const type = selectedItemTypes.get(id);
        if (type === 'folder') {
          const res = await fetch(`${API_BASE}/api/folders/${id}/move`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ parentId: targetFolderId }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to move folder");
          }
          
          // Get folder data to update recent items
          const folderData = await res.json();
          if (folderData.folder) {
            // Update recent items to mark folder as recently modified
            addRecentItem(id, 'folder', folderData.folder.name);
          }
        } else {
          const res = await fetch(`${API_BASE}/api/files/${id}/move`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ folderId: targetFolderId }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to move file");
          }
        }
      }
      
      // Dispatch events to refresh Recent section
      window.dispatchEvent(new CustomEvent('folder-modified'));
      window.dispatchEvent(new CustomEvent('recent-items-updated'));
      
      // Refresh data
      await fetchFolders();
      await fetchFiles();
      await fetchAllFolders(); // Refresh Recent section
      handleDeselectAll();
    } catch (err: unknown) {
      console.error("Failed to move items:", err);
      const message = err instanceof Error ? err.message : "Failed to move some items. Please try again.";
      setError(message);
      throw err;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Store file and show category selection modal
    setPendingFile(file);
    setCategoryModalMode("upload");
    setShowCategoryModal(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBulkToggleImportant = async () => {
    if (selectedItems.size === 0 || !token) return;

    for (const id of Array.from(selectedItems)) {
      const type = selectedItemTypes.get(id);
      if (type === 'folder') {
        await handleToggleImportant(id);
      }
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen flex flex-col page-transition" style={{ backgroundColor: '#FAFAFA' }}>
      <LeaveConfirmModal open={leaveOpen} onStay={onStay} onLeave={onLeave} />
      {/* Modern Navbar - Fixed Header */}
      <nav
        className="fixed top-0 left-0 right-0 z-[1000] px-6 py-4"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6" style={{ color: '#64748B' }} />
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{
                color: '#0F172A',
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
              }}
            >
              <span style={{ fontSize: '1.15em', fontWeight: 700 }}>F</span>ynora
            </h1>
          </div>

          {/* Center: Search (hydration-suppressed to avoid extension-injected attrs issues) */}
          <div className="flex items-center justify-center flex-1">
            <div suppressHydrationWarning>
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
                  onFocus={() => setVoiceError("")}
                  className="w-full pl-9 pr-10 py-2 bg-white border rounded-full focus:outline-none focus:border-[#2563EB] text-sm transition-all duration-200 hover:shadow-sm focus:shadow-md focus:ring-2 focus:ring-[#2563EB]/20"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
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
          </div>

          {/* Right: Profile */}
          <div className="flex items-center gap-3">
            <ProfileDropdown userName={userName || ""} />
          </div>
        </div>
      </nav>

      {/* Content wrapper with proper spacing for fixed header */}
      <div className="flex" style={{ marginTop: '73px', height: 'calc(100vh - 73px)', position: 'relative' }}>
        {/* File Manager Sidebar - Fixed */}
        <div className="fixed left-0 top-[73px] bottom-0 z-50" style={{ width: '230px' }}>
          <FileManagerSidebar />
        </div>
        
        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />

        {/* Main Content Area - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white min-w-0 custom-scrollbar" style={{ marginLeft: '230px', height: 'calc(100vh - 73px)' }}>
          {/* Sentinel to detect when toolbar becomes sticky */}
          <div ref={toolbarSentinelRef} className="h-0" aria-hidden="true" />

          {/* Action Toolbar - Sticky within files section */}
          <div
            className="px-8 pt-3 pb-2 action-toolbar sticky top-0 z-30 bg-white border-b border-slate-200/40"
          >
            <ActionToolbar
              onCut={() => {
                if (selectedItems.size === 0) {
                  setError("Please select items to cut");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                // Use global clipboard to cut items
                cutItems(selectedItems, selectedItemTypes, folders, files);
                handleDeselectAll();
              }}
              onCopy={() => {
                if (selectedItems.size === 0) {
                  setError("Please select items to copy");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                // Use global clipboard to copy items
                copyItems(selectedItems, selectedItemTypes, folders, files);
              }}
              onPaste={async () => {
                if (!hasItems()) {
                  setError("No items in clipboard to paste");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                // Show MoveModal to select destination
                setShowPasteModal(true);
              }}
            onRename={async () => {
              if (selectedItems.size !== 1) {
                setError("Please select exactly one item to rename");
                setTimeout(() => setError(""), 3000);
                return;
              }
              
              const selectedId = Array.from(selectedItems)[0];
              const type = selectedItemTypes.get(selectedId);
              
              if (type === 'folder') {
                const folder = folders.find(f => f.id === selectedId);
                if (!folder) {
                  setError("Folder not found");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                
                const newName = prompt("Enter new folder name:", folder.name);
                if (newName && newName.trim() && newName !== folder.name) {
                  setLoading(true);
                  setError("");
                  try {
                    await handleRenameFolder(selectedId, newName.trim());
                    setLoading(false);
                    // Deselect after rename
                    handleDeselectAll();
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : "Failed to rename folder. Please try again.";
                    setError(message);
                    setLoading(false);
                    setTimeout(() => setError(""), 5000);
                  }
                } else if (newName === folder.name) {
                  // User didn't change the name
                  return;
                }
              } else {
                setError("File renaming is not yet implemented");
                setTimeout(() => setError(""), 3000);
              }
            }}
            onShare={async () => {
              if (selectedItems.size === 0) {
                showError("Please select items to share");
                return;
              }
              
              try {
                setLoading(true);
                const shareData = await shareItems(selectedItems, selectedItemTypes, token);
                
                // Copy share link to clipboard
                if (shareData?.shareLink) {
                  await navigator.clipboard.writeText(shareData.shareLink);
                  showSuccess("Share link copied to clipboard!");
                }
                
                setLoading(false);
              } catch (err: unknown) {
                console.error("Failed to share:", err);
                const message = err instanceof Error ? err.message : "Failed to share items. Please try again.";
                showError(message);
                setLoading(false);
              }
            }}
            onDelete={async () => {
              if (selectedItems.size === 0) {
                setError("Please select items to delete");
                setTimeout(() => setError(""), 3000);
                return;
              }
              
              if (!confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) {
                return;
              }
              
              try {
                setLoading(true);
                await deleteItems(selectedItems, selectedItemTypes, token);
                
                // Refresh data after deletion
                await fetchFolders();
                await fetchFiles();
                handleDeselectAll();
                
                setLoading(false);
              } catch (err: unknown) {
                console.error("Failed to delete:", err);
                const message = err instanceof Error ? err.message : "Failed to delete items. Please try again.";
                setError(message);
                setLoading(false);
                setTimeout(() => setError(""), 5000);
              }
            }}
            onSort={(order, direction) => {
              setSortOrder(order);
              setSortDirection(direction);
            }}
            sortOrder={sortOrder}
            sortDirection={sortDirection}
            disabled={{
              cut: selectedItems.size === 0,
              copy: selectedItems.size === 0,
              paste: !hasItems(),
              rename: selectedItems.size !== 1,
              share: selectedItems.size === 0,
              delete: selectedItems.size === 0,
              sort: false
            }}
          />
          </div>
          <div
            className={`px-8 pb-8 max-w-full overflow-x-hidden ${isToolbarStuck ? 'mt-3' : 'mt-0'}`}
            style={{ minHeight: 'auto' }}
          >
            {/* Welcome Popup */}
            {showWelcomePopup && (
              <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                <div className="bg-white text-gray-800 px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                  <p className="text-sm font-normal">
                    Welcome to {BRAND_NAME}, {userName}!
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
            {/* Voice Error Message */}
            {voiceError && (
              <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                {voiceError}
              </div>
            )}


            {/* Recent Items Section */}
            <div className="w-full mt-6">
              {allItems.length === 0 ? (
                <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                  <p
                    className="text-sm font-normal text-slate-400"
                    style={{ transform: 'translateX(-24px)' }}
                  >
                    Start organizing your files now.
                  </p>
                </div>
              ) : (
                <>
                  {/* Section Header */}
                  <div className="mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>
                      Recent
                    </h2>
                  </div>

                  <div className="flex flex-col">
                  {allItems.map((item) => {
                    if (item.type === "folder") {
                      const folderColorHex = getColorHex(item.data.folderColor || "blue");
                      
                      return (
                        <div 
                          key={`folder-${item.data.id}`} 
                          className="border-b border-gray-50 last:border-b-0 transition-colors duration-200 ease-in-out hover:bg-gray-50/50"
                          style={{ padding: '2px 0' }}
                        >
                          <FolderListItem
                            folder={item.data}
                            folderColorHex={folderColorHex}
                            locationText={buildFolderPath(item.data)}
                            onRename={handleRenameFolder}
                            onLock={handleLock}
                            onUnlock={handleUnlock}
                            onToggleImportant={handleToggleImportant}
                            onDelete={handleDeleteFolder}
                            onClick={() => {
                              if (!selectionMode) {
                                // Track folder view when clicking from Recent section
                                addRecentItem(item.data.id, 'folder', item.data.name);
                                // Dispatch events to refresh Recent section
                                window.dispatchEvent(new CustomEvent('folder-opened', { detail: { folderId: item.data.id } }));
                                window.dispatchEvent(new CustomEvent('recent-items-updated'));
                                smoothNavigate(`/dashboard/folder/${item.data.id}`);
                              }
                            }}
                            isSelected={selectedItems.has(item.data.id)}
                            onSelect={(id, selected) => handleSelectItem(id, 'folder', selected)}
                            selectionMode={selectionMode || selectedItems.size > 0}
                          />
                        </div>
                      );
                    } else {
                      return (
                        <div 
                          key={`file-${item.data.id}`} 
                          className="border-b border-gray-50 last:border-b-0 transition-colors duration-200 ease-in-out hover:bg-gray-50/50"
                          style={{ padding: '2px 0' }}
                        >
                          <FileListItem
                            file={item.data}
                            onDelete={handleDeleteFile}
                            onDownload={(file) => { void handleDownloadFile(file as AppFile); }}
                            onPreview={(file) => { void handlePreviewFile(file as AppFile); }}
                            onLock={async () => {
                              await fetchFiles();
                            }}
                            isSelected={selectedItems.has(item.data.id)}
                            onSelect={(id, selected) => handleSelectItem(id, 'file', selected)}
                            selectionMode={selectionMode || selectedItems.size > 0}
                            token={token}
                          />
                        </div>
                      );
                    }
                  })}
                </div>
              </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modern Create Folder Modal - 2-column layout */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white/95 rounded-lg shadow-md w-full max-w-[350px] border border-slate-200/80"
            style={{ padding: '14px 16px 12px 16px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-folder-title"
          >
            <h2
              id="new-folder-title"
              className="text-lg sm:text-xl font-semibold tracking-tight mb-4"
              style={{ color: '#0F172A' }}
            >
              New Folder
            </h2>
            
            {error && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateFolder} className="flex flex-col gap-3.5">
              <div className="flex gap-3.5">
                {/* Left column: vertical color selector */}
                <div className="flex flex-col items-center" style={{ width: '120px' }}>
                  <label className="block text-[11px] font-medium text-gray-500 mb-3 self-start">
                    Color
                  </label>
                  <div className="flex flex-col gap-2.5 w-full">
                    {colorOptions.map((color, index) => {
                      const isActive = folderColor === color.value;
                      return (
                        <button
                          key={color.value}
                          type="button"
                          ref={(el) => { colorButtonRefs.current[index] = el; }}
                          onClick={() => setFolderColor(color.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                              e.preventDefault();
                              const next = (index + 1) % colorOptions.length;
                              colorButtonRefs.current[next]?.focus();
                            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                              e.preventDefault();
                              const prev = (index - 1 + colorOptions.length) % colorOptions.length;
                              colorButtonRefs.current[prev]?.focus();
                            }
                          }}
                          className="flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 rounded-md"
                          aria-label={color.name}
                          aria-pressed={isActive}
                        >
                          <span
                            className={`flex items-center justify-center transition-all duration-150 ${
                              isActive
                                ? 'border border-slate-300 bg-slate-50'
                                : 'border border-slate-200 bg-white'
                            }`}
                            style={{ width: 48, height: 28, borderRadius: 6 }}
                          >
                            <span
                              className="flex items-center justify-center"
                              style={{
                                width: 38,
                                height: 18,
                                borderRadius: 6,
                                backgroundColor: color.hex,
                              }}
                            >
                              {isActive && (
                                <Check className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                              )}
                            </span>
                          </span>
                          {/* No visible label under swatches for a minimal look; name is still available to screen readers via aria-label */}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right column: folder name and helper */}
                <div className="flex-1 flex flex-col gap-3 max-w-xs">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder=""
                      className="w-full max-w-[210px] rounded-lg px-3 py-1.5 text-sm text-gray-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 bg-white/80"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Choose a color to visually group similar files and folders.
                  </p>
                </div>
              </div>

              {/* Actions aligned bottom-right */}
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateFolderModal(false);
                    setFolderName("");
                    setFolderColor("blue");
                    setError("");
                  }}
                  className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200"
                  style={{
                    backgroundColor: getColorHex(folderColor),
                    color: getButtonTextColor(getColorHex(folderColor)),
                  }}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>

      {/* File Preview Modal - Full Screen */}
      {showPreviewModal && selectedFile && (
        <div className="fixed inset-0 bg-[#0f1f19]/90 backdrop-blur-sm z-50 flex flex-col preview-modal">
          <div className="flex items-center justify-between px-4 py-3 text-[#1d3b2c] bg-gradient-to-r from-[#dff0e6] via-[#c8e4d4] to-[#a9d1bb] shadow-lg shadow-black/20 border-b border-white/40">
            <div className="flex items-center gap-3">
              <button
                onClick={closePreviewModal}
                title="Back"
                aria-label="Back"
                className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[#1d3b2c]/10 hover:bg-[#1d3b2c]/20 text-[#1d3b2c] transition-all hover:-translate-x-0.5 focus:outline-none focus:ring-2 focus:ring-[#1d3b2c]/40"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-semibold text-[#1d3b2c] truncate max-w-[55vw]">
                {selectedFile.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadFile(selectedFile)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={closePreviewModal}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0f1f19]">
            {!previewUrl ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Loading preview...</p>
              </div>
            ) : selectedFile.mimetype.startsWith("image/") ? (
              <div className="flex items-center justify-center h-full p-4 bg-gray-900">
                <img
                  src={previewUrl}
                  alt={selectedFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            ) : selectedFile.mimetype === "application/pdf" ? (
              <iframe
                src={previewUrl}
                               className="w-full h-full border-0"
                title={selectedFile.name}
              />
            ) : (selectedFile.mimetype === "application/msword" || 
              selectedFile.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              selectedFile.name.endsWith(".doc") || selectedFile.name.endsWith(".docx")) && previewUrl === 'word-fallback' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <p className="text-gray-400 mb-4">
                    This Word document format cannot be previewed. Please download to view in Microsoft Word.
                  </p>
                  <button
                    onClick={() => handleDownloadFile(selectedFile)}
                    className="px-6 py-3 bg-[#9bc4a8] text-white rounded-lg hover:bg-[#8ab39a] transition-colors font-medium"
                  >
                    Download to Open in Word
                  </button>
                </div>
              </div>
            ) : (selectedFile.mimetype === "application/msword" || 
              selectedFile.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              selectedFile.name.endsWith(".docx")) && previewUrl && previewUrl !== 'word-fallback' ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 bg-white"
                title={selectedFile.name}
              />
            ) : selectedFile.name.endsWith(".doc") ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <p className="text-gray-400 mb-4">
                    Older .doc format cannot be previewed. Please download to view in Microsoft Word.
                  </p>
                  <button
                    onClick={() => handleDownloadFile(selectedFile)}
                    className="px-6 py-3 bg-[#9bc4a8] text-white rounded-lg hover:bg-[#8ab39a] transition-colors font-medium"
                  >
                    Download to Open in Word
                  </button>
                </div>
              </div>
            ) : selectedFile.mimetype.startsWith("text/") || 
              selectedFile.mimetype === "application/json" ||
              selectedFile.name.endsWith(".md") ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 bg-white"
                title={selectedFile.name}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-400 mb-4">Preview not available for this file type.</p>
                  <button
                    onClick={() => handleDownloadFile(selectedFile)}
                    className="px-4 py-2 bg-[#9bc4a8] text-white rounded-lg hover:bg-[#8ab39a] transition-colors"
                  >
                    Download File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Move Modal for Share */}
      {showMoveModal && token && (
        <MoveModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          onMove={handleBulkMove}
          folders={folders}
          token={token}
          currentFolderId={null}
        />
      )}

      {/* Paste Modal */}
      {showPasteModal && token && (
        <MoveModal
          isOpen={showPasteModal}
          onClose={() => setShowPasteModal(false)}
          onMove={async (targetFolderId: number | null) => {
            try {
              setLoading(true);
              await pasteItems(targetFolderId, async () => {
                // Refresh data after paste
                await fetchFolders();
                await fetchFiles();
                setShowPasteModal(false);
                setLoading(false);
              });
            } catch (err: any) {
              console.error("Failed to paste:", err);
              setError(err.message || "Failed to paste items. Please try again.");
              setLoading(false);
              setTimeout(() => setError(""), 5000);
            }
          }}
          folders={folders}
          token={token}
          currentFolderId={null}
          title="Paste Items"
          buttonText="Paste"
          showNewFolder={true}
          onCreateNewFolder={async (name: string) => {
            if (!token) return null;
            
            try {
              const res = await fetch(`${API_BASE}/api/folders/create`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: name,
                  folderColor: "blue",
                  parentId: null, // Root folder
                }),
              });

              if (res.ok) {
                const data = await res.json();
                // Add to recent items
                if (data.folder) {
                  addRecentItem(data.folder.id, 'folder', data.folder.name);
                  
                  // Dispatch events to trigger Recent section refresh
                  window.dispatchEvent(new CustomEvent('folder-created', { detail: { folderId: data.folder.id } }));
                  window.dispatchEvent(new CustomEvent('recent-items-updated'));
                  
                  // Refresh the Recent section
                  setTimeout(() => {
                    fetchAllFolders();
                  }, 300);
                }
                // Refresh folders list
                await fetchFolders();
                return data.folder.id;
              } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to create folder");
              }
            } catch (err: any) {
              console.error("Failed to create new folder:", err);
              setError(err.message || "Failed to create new folder. Please try again.");
              setTimeout(() => setError(""), 5000);
              return null;
            }
          }}
        />
      )}

      {/* Category Selection Modal */}
      <CategorySelectionModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setPendingFolderData(null);
          setPendingFile(null);
        }}
        onSelectCategory={handleCategorySelected}
        title={
          categoryModalMode === "folder"
            ? "Where would you like to create this folder?"
            : "Choose a destination for this upload."
        }
        mode={categoryModalMode}
      />


      {/* Arc Action Button - Top Right */}
      <ArcActionButton
        onMagicLens={() => smoothNavigate("/dashboard/magic-lens")}
        onLocked={() => smoothNavigate("/dashboard/locked")}
        onUpload={() => fileInputRef.current?.click()}
        onFavorites={() => smoothNavigate("/dashboard/important")}
      />

      {/* Command Bar */}
      <CommandBar
        isOpen={showCommandBar}
        onClose={() => setShowCommandBar(false)}
        onCreateFolder={() => {
          setShowCommandBar(false);
          setShowCreateFolderModal(true);
        }}
        onUploadFile={() => {
          setShowCommandBar(false);
          fileInputRef.current?.click();
        }}
        onMagicLens={() => {
          setShowCommandBar(false);
          smoothNavigate("/dashboard/magic-lens");
        }}
        onLockFolder={() => {
          setShowCommandBar(false);
          smoothNavigate("/dashboard/locked");
        }}
        onFavorites={() => {
          setShowCommandBar(false);
          smoothNavigate("/dashboard/important");
        }}
        onSearch={(query) => {
          setShowCommandBar(false);
          setSearchQuery(query);
        }}
        onNavigateToCategory={(category) => {
          setShowCommandBar(false);
          const event = new CustomEvent('sidebar-category-clicked', { detail: { category } });
          window.dispatchEvent(event);
        }}
      />
    </div>
  );
}
