"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Upload,
  Search, 
  User,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  X,
  Share2,
  Trash2,
  Move,
  Copy,
  Scissors,
  Download,
  Lock,
  Check,
} from "lucide-react";
import FolderListItem from "../../../components/FolderListItem";
import FileListItem from "../../../components/FileListItem";
import VoiceSearchButton from "../../../components/VoiceSearchButton";
import Breadcrumb from "../../../components/Breadcrumb";
import ActionToolbar from "../../../components/ActionToolbar";
import MoveModal from "../../../components/MoveModal";
import FileManagerSidebar from "../../../components/FileManagerSidebar";
import ProfileDropdown from "../../../components/ProfileDropdown";
import LeaveConfirmModal from "../../../components/LeaveConfirmModal";
import { useLeaveConfirmation } from "../../../hooks/useLeaveConfirmation";
import { useSmoothNavigation } from "../../../hooks/useSmoothNavigation";
import { addRecentItem, addRecentItemAndNotify } from "../../../utils/recentItems";
import ArcActionButton from "../../../components/ArcActionButton";
import { BRAND_NAME } from "../../../config/brand";
import { fuzzySearch, SearchableItem } from "../../../utils/fuzzySearch";
import { API_BASE } from "../../../utils/authClient";

type DOMFile = globalThis.File & { webkitRelativePath?: string };

interface Folder extends SearchableItem {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  folderColor?: string;
  isLocked?: boolean;
  isImportant?: boolean;
  subfolders?: Folder[];
  files?: AppFile[];
  parent?: {
    id: number;
    name: string;
  };
  parentChain?: Array<{
    id: number;
    name: string;
  }>;
}

interface AppFile extends SearchableItem {
  id: number;
  name: string;
  url: string;
  size: number;
  mimetype: string;
  createdAt: string;
  folderId: number | null;
}

const DEFAULT_CATEGORIES = ["Work", "Personal", "Documents", "Media", "Important"];

export default function FolderDetailPage() {
  const router = useRouter();
  const smoothNavigate = useSmoothNavigation();
  const params = useParams();
  const { leaveOpen, onStay, onLeave } = useLeaveConfirmation({ leaveTo: "/dashboard" });
  const folderId = params?.id ? Number(params.id) : null;
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const [userName, setUserName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<AppFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateSubfolderModal, setShowCreateSubfolderModal] = useState(false);
  const [subfolderName, setSubfolderName] = useState("");
  const [subfolderColor, setSubfolderColor] = useState("blue");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<AppFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFolder, setUploadingFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [clipboard, setClipboard] = useState<{ type: 'cut' | 'copy', items: Array<{ type: 'folder' | 'file', id: number, name: string }> } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingFolderId, setPendingFolderId] = useState<number | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedItemTypes, setSelectedItemTypes] = useState<Map<number, 'folder' | 'file'>>(new Map());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
        console.error("Failed to parse user:", err);
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  // Load custom categories to check if current folder is a category
  useEffect(() => {
    const stored = localStorage.getItem("fynora_custom_categories");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomCategories(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        setCustomCategories([]);
      }
    }
  }, []);

  useEffect(() => {
    if (token && folderId) {
      fetchFolder();
    }
  }, [token, folderId]);

  // Handle sidebar "New" button click - open create subfolder modal directly in this folder
  useEffect(() => {
    const handleNewClick = () => {
      if (token && folderId) {
        setShowCreateSubfolderModal(true);
        setSubfolderName("");
        setSubfolderColor("blue");
        setError("");
      }
    };

    window.addEventListener('sidebar-new-clicked', handleNewClick);

    return () => {
      window.removeEventListener('sidebar-new-clicked', handleNewClick);
    };
  }, [token, folderId]);

  // Handle sidebar category clicks - navigate to category folder
  useEffect(() => {
    if (!token) return;

    const getOrCreateCategoryFolder = async (categoryName: string): Promise<number | null> => {
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
            console.error(`Failed to list folders when resolving category '${categoryName}' (folder view):`, res.status, errorData);
          }
        } catch (err) {
          console.error(`Error fetching folders when resolving category '${categoryName}' (folder view):`, err);
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
            console.error(`Failed to create category folder '${categoryName}' (folder view):`, createRes.status, createData);
            return null;
          }

          if (createData && createData.folder && createData.folder.id) {
            return createData.folder.id as number;
          }
        } catch (err) {
          console.error(`Error creating category folder '${categoryName}' (folder view):`, err);
        }
      } catch (err) {
        console.error(`Failed to get or create category folder ${categoryName} (folder view):`, err);
      }

      return null;
    };

    const handleCategoryClick = async (event: CustomEvent<{ category: string }>) => {
      const category = event.detail.category;

      try {
        // Find or create the category folder
        const categoryFolderId = await getOrCreateCategoryFolder(category);
        
        if (categoryFolderId) {
          // Navigate to category folder and update URL with category parameter
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

    window.addEventListener('sidebar-category-clicked', handleCategoryClick as unknown as EventListener);

    return () => {
      window.removeEventListener('sidebar-category-clicked', handleCategoryClick as unknown as EventListener);
    };
  }, [token, smoothNavigate]);

  const fetchFolder = async (password?: string) => {
    if (!token || !folderId) return;

    setLoading(true);
    try {
      // Add current folder to recent items when it's loaded
      // This ensures folders opened from categories are tracked
      // Check if we have a stored password for this folder
      const storedPassword = password || sessionStorage.getItem(`folder_password_${folderId}`);
      const url = storedPassword 
        ? `${API_BASE}/api/folders/${folderId}?password=${encodeURIComponent(storedPassword)}`
        : `${API_BASE}/api/folders/${folderId}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentFolder(data.folder);
        
        // Track folder view when page loads
        if (data.folder) {
          addRecentItem(data.folder.id, 'folder', data.folder.name);
          // Dispatch event to notify dashboard to refresh
          window.dispatchEvent(new CustomEvent('folder-opened', { detail: { folderId: data.folder.id } }));
          window.dispatchEvent(new CustomEvent('recent-items-updated'));
        }
        
        // Subfolders are already filtered on backend, but double-check
        const unlockedSubfolders = (data.folder.subfolders || []).filter((f: Folder) => !f.isLocked);
        setSubfolders(unlockedSubfolders);
        setFiles(data.folder.files || []);
        setError("");
      } else if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      } else if (res.status === 403) {
        // Folder is locked, show password modal
        const data = await res.json();
        if (data.isLocked) {
          setShowPasswordModal(true);
          setPendingFolderId(Number(folderId));
          setPasswordInput("");
          setPasswordError("");
          setError("This folder is locked. Please enter the password you used to lock it.");
        } else {
          setError("Unauthorized access");
        }
      } else if (res.status === 404) {
        setError("Folder not found");
      }
    } catch (err) {
      console.error("Failed to fetch folder:", err);
      setError("Failed to load folder");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !folderId) return;

    if (!subfolderName.trim()) {
      setError("Subfolder name is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/folders/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name: subfolderName.trim(),
          folderColor: subfolderColor,
          parentId: folderId
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create subfolder");
        setCreating(false);
        return;
      }

      // Optimistic update - add new folder to the list immediately
      const newSubfolder: Folder = {
        id: data.folder.id,
        name: data.folder.name,
        parentId: data.folder.parentId,
        createdAt: data.folder.createdAt,
        folderColor: data.folder.folderColor,
        isLocked: data.folder.isLocked || false,
        isImportant: data.folder.isImportant || false,
      };
      setSubfolders(prev => [newSubfolder, ...prev]);

      // Add to recent items
      addRecentItem(data.folder.id, 'folder', data.folder.name);
      
      // Dispatch event to notify dashboard to refresh Recent section
      window.dispatchEvent(new CustomEvent('folder-created', { detail: { folderId: data.folder.id } }));
      window.dispatchEvent(new CustomEvent('recent-items-updated'));

      // Reset form and close modal
      setSubfolderName("");
      setSubfolderColor("blue");
      setShowCreateSubfolderModal(false);
      setCreating(false);
      setError("");

      // Refresh folder data to ensure everything is in sync
      await fetchFolder();
    } catch (err) {
      setError("Network error. Please try again.");
      setCreating(false);
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
        setSubfolders(prev =>
          prev.map(f => f.id === id ? { ...f, name: data.folder.name } : f)
        );
        
        // Update recent items with new name and mark as recently modified
        addRecentItem(id, 'folder', data.folder.name);
        // Dispatch event to notify dashboard to refresh Recent section
        window.dispatchEvent(new CustomEvent('folder-modified', { detail: { folderId: id } }));
        window.dispatchEvent(new CustomEvent('recent-items-updated'));
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
      const res = await fetch(`${API_BASE}/api/folders/lock/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubfolders(prev =>
          prev.map(f => f.id === id ? { ...f, isLocked: true } : f)
        );
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to lock folder");
      }
    } catch (err: unknown) {
      console.error("Failed to lock folder:", err);
      throw err;
    }
  };

  const handleUnlock = async (id: number, password: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/folders/unlock/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubfolders(prev =>
          prev.map(f => f.id === id ? { ...f, isLocked: false } : f)
        );
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Incorrect password");
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
        setSubfolders(prev =>
          prev.map(f => f.id === id ? { ...f, isImportant: data.folder.isImportant } : f)
        );
      } else {
        throw new Error("Failed to toggle important");
      }
    } catch (err) {
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
        setSubfolders(prev => prev.filter(f => f.id !== id));
      } else {
        throw new Error("Failed to delete folder");
      }
    } catch (err) {
      console.error("Failed to delete folder:", err);
      throw err;
    }
  };

  const handleFolderClick = async (subfolderId: number) => {
    // Check if the folder is locked
    const folder = subfolders.find(f => f.id === subfolderId);
    if (folder?.isLocked) {
      // Show password modal
      setPendingFolderId(subfolderId);
      setShowPasswordModal(true);
      setPasswordInput("");
      setPasswordError("");
      return;
    }
    
    // Track folder view
    if (folder) {
      addRecentItem(folder.id, 'folder', folder.name);
      // Dispatch events to notify dashboard to refresh
      window.dispatchEvent(new CustomEvent('folder-opened', { detail: { folderId: folder.id } }));
      window.dispatchEvent(new CustomEvent('recent-items-updated'));
    }
    
    router.push(`/dashboard/folder/${subfolderId}`);
  };

  const handleUnlockAndOpen = async () => {
    if (!token || !passwordInput.trim()) {
      setPasswordError("Please enter a password");
      return;
    }

    const folderIdToAccess = pendingFolderId || folderId;
    if (!folderIdToAccess) return;

    try {
      // Verify password by trying to access the folder with password
      const res = await fetch(`${API_BASE}/api/folders/${folderIdToAccess}?password=${encodeURIComponent(passwordInput)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        // Password correct - fetch folder data
        const data = await res.json();
        
        // Close password modal
        setShowPasswordModal(false);
        setPasswordInput("");
        setPasswordError("");
        setError("");
        
        // If we were trying to open a different folder, navigate to it
        if (pendingFolderId && pendingFolderId !== folderId) {
          // Store password in sessionStorage for this folder access
          sessionStorage.setItem(`folder_password_${pendingFolderId}`, passwordInput);
          router.push(`/dashboard/folder/${pendingFolderId}`);
        } else {
          // We're already in this folder, just update the data
          setCurrentFolder(data.folder);
          const unlockedSubfolders = (data.folder.subfolders || []).filter((f: Folder) => !f.isLocked);
          setSubfolders(unlockedSubfolders);
          setFiles(data.folder.files || []);
        }
      } else {
        const data = await res.json();
        if (res.status === 401) {
          setPasswordError("Incorrect password. Please try again.");
        } else {
          setPasswordError(data.error || "Failed to access folder");
        }
      }
    } catch (err) {
      console.error("Failed to access folder:", err);
      setPasswordError("Failed to access folder. Please try again.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      // If folderId exists, upload to that folder, otherwise upload to root
      if (folderId) {
        formData.append("folderId", folderId.toString());
      } else {
        formData.append("folderId", "");
      }

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
        return;
      }

      // Optimistic update
      const newFile: AppFile = {
        id: data.file.id,
        name: data.file.name,
        url: data.file.url,
        size: data.file.size,
        mimetype: data.file.mimetype,
        createdAt: data.file.createdAt,
        folderId: data.file.folderId,
      };
      setFiles(prev => [newFile, ...prev]);
      
      // Add to recent items and notify Recents listeners
      addRecentItemAndNotify(data.file.id, 'file', data.file.name);
      
      setUploading(false);
      setError(""); // Clear any previous errors
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setUploading(false);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token || !e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    setUploadingFolder(true);
    setError("");
    setUploadProgress({ current: 0, total: files.length });

    try {
      interface File extends globalThis.File {}

      type DOMFile = File & { webkitRelativePath?: string };

      // Map stores DOM files only
      const fileMap: Map<string, DOMFile[]> = new Map();
      const folderPaths = new Set<string>();

      files.forEach((f) => {
        const file = f as DOMFile;
        const fullPath = file.webkitRelativePath || file.name;
        const pathParts = fullPath.split('/');

        if (pathParts.length > 1) {
          const folderPath = pathParts.slice(0, -1).join('/');
          folderPaths.add(folderPath);

          if (!fileMap.has(folderPath)) fileMap.set(folderPath, []);

          fileMap.get(folderPath)!.push(file as DOMFile);
        } else {
          if (!fileMap.has('')) fileMap.set('', []);

          fileMap.get('')!.push(file as DOMFile);
        }
      });

      // Create folders first, then upload files
      const folderIdMap = new Map<string, number>();
      
      // Sort folder paths by depth (shallow to deep)
      const sortedPaths = Array.from(folderPaths).sort((a, b) => {
        const depthA = a.split('/').length;
        const depthB = b.split('/').length;
        return depthA - depthB;
      });

      // Create all folders
      for (const folderPath of sortedPaths) {
        const pathParts = folderPath.split('/');
        const folderName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join('/');
        
        let parentId = folderId || null;
        if (parentPath && folderIdMap.has(parentPath)) {
          parentId = folderIdMap.get(parentPath)!;
        }

        // Create folder
        const folderRes = await fetch(`${API_BASE}/api/folders/create`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: folderName,
            folderColor: "blue",
            parentId: parentId,
          }),
        });

        if (folderRes.ok) {
          const folderData = await folderRes.json();
          folderIdMap.set(folderPath, folderData.folder.id);
          
          // Add to recent items and notify Recents listeners
          addRecentItemAndNotify(folderData.folder.id, 'folder', folderData.folder.name);
          
          // Add to subfolders list if it's a direct child
          if (!parentPath || parentPath === '') {
            setSubfolders(prev => [folderData.folder, ...prev]);
          }
        }
      }

      // Upload all files
      let uploadedCount = 0;
      for (const [folderPath, folderFiles] of fileMap.entries()) {
        let targetFolderId = folderId || null;
        if (folderPath && folderIdMap.has(folderPath)) {
          targetFolderId = folderIdMap.get(folderPath)!;
        }

        for (const file of folderFiles) {
          const formData = new FormData();
          formData.append("file", file);
          if (targetFolderId) {
            formData.append("folderId", targetFolderId.toString());
          } else {
            formData.append("folderId", "");
          }

          const res = await fetch(`${API_BASE}/api/files/upload`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            uploadedCount++;
            setUploadProgress({ current: uploadedCount, total: files.length });

            // Add file to list if it's in the current folder
            if (targetFolderId === folderId || (!targetFolderId && !folderId)) {
              const newFile: AppFile = {
                id: data.file.id,
                name: data.file.name,
                url: data.file.url,
                size: data.file.size,
                mimetype: data.file.mimetype,
                createdAt: data.file.createdAt,
                folderId: data.file.folderId,
              };
              setFiles(prev => [newFile, ...prev]);
              // Add to recent items and notify Recents listeners
              addRecentItemAndNotify(data.file.id, 'file', data.file.name);
            }
          }
        }
      }

      // Refresh folder data to show all new folders and files
      if (folderId) {
        fetchFolder();
      }

      setUploadingFolder(false);
      setError("");
      
      // Reset folder input
      if (folderInputRef.current) {
        folderInputRef.current.value = "";
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setUploadingFolder(false);
    }
  };

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
    
    // Track file view
    addRecentItem(file.id, 'file', file.name);
    
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

  // Clean up blob URL when modal closes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
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

  // Define ItemEntry type for sorting
  type ItemEntry = {
    type: 'folder' | 'file';
    data: Folder | AppFile;
  };

  // Sort function
  const sortItems = (items: ItemEntry[]) =>
    [...items].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = String(a.data.name).localeCompare(String(b.data.name));
      } else if (sortBy === 'date') {
        const dateA = Date.parse(a.data.createdAt);
        const dateB = Date.parse(b.data.createdAt);
        comparison = dateA - dateB;
      } else if (sortBy === 'size') {
        const sizeA = a.type === 'file' ? (a.data as AppFile).size : 0;
        const sizeB = b.type === 'file' ? (b.data as AppFile).size : 0;
        comparison = sizeA - sizeB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Filter subfolders and files using shared fuzzy search utility
  const filteredSubfolders = debouncedSearchQuery
    ? fuzzySearch<Folder>(subfolders, debouncedSearchQuery)
    : subfolders;
  const filteredFiles = debouncedSearchQuery
    ? fuzzySearch<AppFile>(files, debouncedSearchQuery)
    : files;

  // Combine folders and files into a single sorted list
  const allItems: ItemEntry[] = sortItems([
    ...filteredSubfolders.map(f => ({ type: 'folder' as const, data: f })),
    ...filteredFiles.map(f => ({ type: 'file' as const, data: f })),
  ]);

  const handleSelectAll = () => {
    const allIds = new Set<number>();
    const allTypes = new Map<number, 'folder' | 'file'>();
    
    filteredSubfolders.forEach(f => {
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
      fetchFolder();
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
      fetchFolder();
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
      
      // Prompt for password once for all folders
      const password = prompt("Enter password to unlock selected folders:");
      if (!password) return;
      
      for (const folderId of folderIds) {
        try {
          await handleUnlock(folderId, password);
        } catch (err) {
          console.error(`Failed to unlock folder ${folderId}:`, err);
          // Continue with next folder even if one fails
        }
      }
      
      handleDeselectAll();
      fetchFolder();
    } catch (err) {
      console.error("Failed to unlock folders:", err);
      setError("Failed to unlock some folders. Please try again.");
    }
  };

  const handleBulkToggleImportant = async () => {
    if (selectedItems.size === 0) return;
    if (!token) return;

    try {
      const folderIds = Array.from(selectedItems).filter(id => selectedItemTypes.get(id) === 'folder');
      
      for (const folderId of folderIds) {
        await handleToggleImportant(folderId);
      }
      
      fetchFolder();
    } catch (err) {
      console.error("Failed to toggle important:", err);
      setError("Failed to mark some folders as important. Please try again.");
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
      
      // Dispatch events to notify dashboard to refresh Recent section
      window.dispatchEvent(new CustomEvent('folder-modified'));
      window.dispatchEvent(new CustomEvent('recent-items-updated'));
      
      // Refresh data
      fetchFolder();
      handleDeselectAll();
    } catch (err: unknown) {
      console.error("Failed to move items:", err);
      const message = err instanceof Error ? err.message : "Failed to move some items. Please try again.";
      setError(message);
      throw err;
    }
  };

  // Keyboard shortcuts for cut/copy/paste and selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+V for paste (handled by onPaste event, but we can show visual feedback)
      if (e.ctrlKey && e.key === 'v' && !clipboard) {
        // Show message that nothing is in clipboard
        return;
      }
      // Ctrl+A or Cmd+A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
      // Escape to deselect all
      if (e.key === 'Escape' && selectedItems.size > 0) {
        handleDeselectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clipboard, selectedItems.size]);

  // Add non-standard folder upload attributes at runtime to avoid TSX/JSX unknown-attribute errors
  useEffect(() => {
    const el = folderInputRef.current;
    if (el) {
      try {
        el.setAttribute('webkitdirectory', '');
        el.setAttribute('directory', '');
      } catch {
        // ignore in environments/browsers that don't support these attributes
      }
    }
  }, [folderInputRef]);

  if (!userName || loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error && !currentFolder) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-[#9bc4a8] text-white rounded-lg hover:bg-[#8ab39a] transition-colors text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
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
            {/* Back to Dashboard Button */}
            <button
              onClick={() => smoothNavigate("/dashboard")}
              className="p-1.5 hover:bg-gray-50 rounded-lg transition-all duration-200 ease-in-out flex-shrink-0 click-scale"
              style={{ color: '#64748B' }}
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <FolderOpen className="w-5 h-5 flex-shrink-0" style={{ color: '#64748B' }} />
            <h1 className="text-xl font-semibold tracking-tight flex-shrink-0" style={{ color: '#0F172A' }}>
              {BRAND_NAME}
            </h1>
            
            {/* Breadcrumb Navigation - Inline with Fynora */}
            {currentFolder && (
              <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <Breadcrumb 
                    items={currentFolder.parentChain || []} 
                    currentFolderName={currentFolder.name}
                  />
                </div>
              </div>
            )}
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

          <div className="flex items-center gap-3">
            <ProfileDropdown userName={userName || ""} />
          </div>
        </div>
      </nav>

      <div className="flex flex-1">
        {/* File Manager Sidebar - Always show category sidebar on all pages */}
        <FileManagerSidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#FFFFFF' }} tabIndex={0}>
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading || uploadingFolder}
            aria-label="Upload file"
            aria-hidden="true"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            onChange={handleFolderUpload}
            className="hidden"
            disabled={uploading || uploadingFolder}
            aria-label="Upload folder"
            aria-hidden="true"
            {...({ webkitdirectory: "" , directory: "" } as any)}
          />
          {/* Upload Progress */}
          {uploadingFolder && (
            <div className="sticky top-0 z-20 px-4 py-2 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-blue-700 font-medium">
                  {uploadProgress.current} / {uploadProgress.total} files
                </span>
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="px-8 pt-4 pb-3 action-toolbar">
            <ActionToolbar
              onCut={() => {
                if (selectedItems.size === 0) {
                  setError("Please select items to cut");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                // Store selected items in clipboard for cut
                const items: Array<{ type: 'folder' | 'file', id: number, name: string }> = [];
                selectedItems.forEach(id => {
                  const type = selectedItemTypes.get(id);
                  if (type === 'folder') {
                    const folder = subfolders.find(f => f.id === id);
                    if (folder) items.push({ type: 'folder', id, name: folder.name });
                  } else {
                    const file = files.find(f => f.id === id);
                    if (file) items.push({ type: 'file', id, name: file.name });
                  }
                });
                if (items.length > 0) {
                  setClipboard({ type: 'cut', items });
                  handleDeselectAll();
                }
              }}
              onCopy={() => {
                if (selectedItems.size === 0) {
                  setError("Please select items to copy");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                // Store selected items in clipboard for copy
                const items: Array<{ type: 'folder' | 'file', id: number, name: string }> = [];
                selectedItems.forEach(id => {
                  const type = selectedItemTypes.get(id);
                  if (type === 'folder') {
                    const folder = subfolders.find(f => f.id === id);
                    if (folder) items.push({ type: 'folder', id, name: folder.name });
                  } else {
                    const file = files.find(f => f.id === id);
                    if (file) items.push({ type: 'file', id, name: file.name });
                  }
                });
                if (items.length > 0) {
                  setClipboard({ type: 'copy', items });
                }
              }}
              onPaste={async () => {
                if (!clipboard || clipboard.items.length === 0) {
                  setError("No items in clipboard to paste");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                if (!token) {
                  setError("Authentication required");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                
                setLoading(true);
                setError("");
                
                try {
                  for (const item of clipboard.items) {
                    if (item.type === 'folder') {
                      if (clipboard.type === 'cut') {
                        // For cut: Move the folder to the new location
                        const moveRes = await fetch(`${API_BASE}/api/folders/${item.id}/move`, {
                          method: "PUT",
                          headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ parentId: folderId || null }),
                        });
                        
                        if (!moveRes.ok) {
                          const errorData = await moveRes.json().catch(() => ({}));
                          throw new Error(errorData.error || "Failed to move folder");
                        }
                      } else {
                        // For copy: Create a copy of the folder
                        const res = await fetch(`${API_BASE}/api/folders/${item.id}`, {
                          headers: {
                            "Authorization": `Bearer ${token}`,
                          },
                        });
                        
                        if (!res.ok) {
                          throw new Error(`Failed to fetch folder: ${res.statusText}`);
                        }
                        
                        const folderData = await res.json();
                        
                        const createRes = await fetch(`${API_BASE}/api/folders/create`, {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            name: folderData.folder.name + " (Copy)",
                            folderColor: folderData.folder.folderColor || "blue",
                            parentId: folderId || null,
                          }),
                        });
                        
                        if (!createRes.ok) {
                          const errorData = await createRes.json().catch(() => ({}));
                          throw new Error(errorData.error || "Failed to create folder copy");
                        }
                      }
                    } else if (item.type === 'file') {
                      if (clipboard.type === 'cut') {
                        // For cut: Move the file to the new location
                        const moveRes = await fetch(`${API_BASE}/api/files/${item.id}/move`, {
                          method: "PUT",
                          headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ folderId: folderId || null }),
                        });
                        
                        if (!moveRes.ok) {
                          const errorData = await moveRes.json().catch(() => ({}));
                          throw new Error(errorData.error || "Failed to move file");
                        }
                      } else {
                        setError("File copying is not yet implemented");
                        setTimeout(() => setError(""), 3000);
                      }
                    }
                  }
                  
                  // Clear clipboard after paste
                  if (clipboard.type === 'cut') {
                    setClipboard(null);
                  }
                  
                  // Refresh folder data
                  if (folderId) {
                    await fetchFolder();
                  }
                  
                  setLoading(false);
                } catch (err: unknown) {
                  console.error("Failed to paste:", err);
                  const message = err instanceof Error ? err.message : "Failed to paste items. Please try again.";
                  setError(message);
                  setLoading(false);
                  setTimeout(() => setError(""), 5000);
                }
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
                  const folder = subfolders.find(f => f.id === selectedId);
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
                      handleDeselectAll();
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : "Failed to rename folder. Please try again.";
                      setError(message);
                      setLoading(false);
                      setTimeout(() => setError(""), 5000);
                    }
                  } else if (newName === folder.name) {
                    return;
                  }
                } else {
                  setError("File renaming is not yet implemented");
                  setTimeout(() => setError(""), 3000);
                }
              }}
              onShare={() => {
                if (selectedItems.size === 0) {
                  setError("Please select items to share/move");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                setShowMoveModal(true);
              }}
              onDelete={handleBulkDelete}
              onSort={(order: 'name' | 'date' | 'size', direction: 'asc' | 'desc') => {
                setSortBy(order);
                setSortOrder(direction);
              }}
              sortOrder={sortBy}
              sortDirection={sortOrder}
              disabled={{
                cut: selectedItems.size === 0,
                copy: selectedItems.size === 0,
                paste: !clipboard || clipboard.items.length === 0,
                rename: selectedItems.size !== 1,
                share: selectedItems.size === 0,
                delete: selectedItems.size === 0,
                sort: false
              }}
            />
          </div>


          {/* Main Content - with paste and drag-drop support */}
          <div
            onPaste={async (e) => {
              // Handle paste from file system
              e.preventDefault();
              const items = e.clipboardData.items;
              
              if (!token) return;
              
              const filesToUpload: File[] = [];
              
              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                  const file = item.getAsFile();
                  if (file) {
                    filesToUpload.push(file);
                  }
                }
              }
              
              if (filesToUpload.length > 0) {
                setUploading(true);
                setError("");
                
                try {
                  for (const file of filesToUpload) {
                    const formData = new FormData();
                    formData.append("file", file);
                    if (folderId) {
                      formData.append("folderId", folderId.toString());
                    } else {
                      formData.append("folderId", "");
                    }

                    const res = await fetch(`${API_BASE}/api/files/upload`, {
                      method: "POST",
                      credentials: "include",
                      headers: {
                        "Authorization": `Bearer ${token}`,
                      },
                      body: formData,
                    });

                    if (res.ok) {
                      const data = await res.json();
                      const newFile: AppFile = {
                        id: data.file.id,
                        name: data.file.name,
                        url: data.file.url,
                        size: data.file.size,
                        mimetype: data.file.mimetype,
                        createdAt: data.file.createdAt,
                        folderId: data.file.folderId,
                      };
                      setFiles(prev => [newFile, ...prev]);
                      // Add to recent items
                      addRecentItem(data.file.id, 'file', data.file.name);
                    }
                  }
                  
                  setUploading(false);
                  if (folderId) {
                    fetchFolder();
                  }
                } catch (err) {
                  setError("Failed to paste files. Please try again.");
                  setUploading(false);
                }
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={async (e) => {
            // Handle drag and drop from file system
            e.preventDefault();
            e.stopPropagation();

            if (!token) return;

            const droppedFiles = Array.from(e.dataTransfer.files);

            if (droppedFiles.length > 0) {
              setUploading(true);
              setError("");

              try {
                for (const file of droppedFiles) {
                  const formData = new FormData();
                  formData.append("file", file);
                  if (folderId) {
                    formData.append("folderId", folderId.toString());
                  } else {
                    formData.append("folderId", "");
                  }

                  const res = await fetch(`${API_BASE}/api/files/upload`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                      "Authorization": `Bearer ${token}`,
                    },
                    body: formData,
                  });

                  if (res.ok) {
                    const data = await res.json();
                    const newFile: AppFile = {
                      id: data.file.id,
                      name: data.file.name,
                      url: data.file.url,
                      size: data.file.size,
                      mimetype: data.file.mimetype,
                      createdAt: data.file.createdAt,
                      folderId: data.file.folderId,
                    };
                    setFiles(prev => [newFile, ...prev]);
                    // Add to recent items
                    addRecentItem(data.file.id, 'file', data.file.name);
                  }
                }

                setUploading(false);
                if (folderId) {
                  fetchFolder();
                }
              } catch (err) {
                console.error("Failed to upload files via drag-and-drop:", err);
                setError("Failed to upload files. Please try again.");
                setUploading(false);
              }
            }
          }}
            className="flex-1"
          >
            {/* Error Message */}
          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* Voice Error Message */}
          {voiceError && (
            <div className="mx-4 mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {voiceError}
            </div>
          )}

          {/* Folders and Files List - match dashboard padding for consistent date column */}
          <div className="px-8 pb-8 pt-6 w-full">
            {allItems.length === 0 ? (
              <div className="py-6" />
            ) : (
              <div className="flex flex-col gap-1">
                {allItems.map((item) => {
                  if (item.type === "folder") {
                    const folderData = item.data as Folder;
                    const folderColorHex = getColorHex(folderData.folderColor || "blue");
                    // Parent path only: category/root -> ... -> current folder
                    const basePathParts = [
                      ...(currentFolder?.parentChain?.map((p: { id: number; name: string }) => p.name) || []),
                      currentFolder?.name,
                    ].filter(Boolean) as string[];
                    const locationText = basePathParts.join(" / ");
                    return (
                      <div key={`folder-${item.data.id}`} className="transition-colors hover:bg-gray-50/50">
                        <FolderListItem
                          folder={folderData}
                          folderColorHex={folderColorHex}
                          locationText={locationText}
                          onRename={handleRenameFolder}
                          onLock={handleLock}
                          onUnlock={async (id: number) => {
                            const password = prompt("Enter password to unlock this folder:");
                            if (password) {
                              try {
                                await handleUnlock(id, password);
                                fetchFolder();
                              } catch (err) {
                                console.error("Failed to unlock folder:", err);
                                setError("Failed to unlock folder. Incorrect password?");
                                setTimeout(() => setError(""), 5000);
                              }
                            }
                          }}
                          onToggleImportant={handleToggleImportant}
                          onDelete={handleDeleteFolder}
                          onClick={() => handleFolderClick(item.data.id)}
                          isSelected={selectedItems.has(item.data.id)}
                          onSelect={(id, selected) => handleSelectItem(id, 'folder', selected)}
                          selectionMode={true}
                        />
                      </div>
                    );
                  } else {
                    const fileData = item.data as AppFile;
                    return (
                      <div key={`file-${item.data.id}`} className="transition-colors hover:bg-gray-50/50">
                        <FileListItem
                          file={fileData}
                          onDelete={handleDeleteFile}
                          onDownload={(file) => handleDownloadFile(file as AppFile)}
                          onPreview={(file) => handlePreviewFile(file as AppFile)}
                          onLock={async () => {
                          await fetchFolder();
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
            )}
          </div>
          </div>
        </main>
      </div>

      {/* New Folder Modal (matches Dashboard New UI) */}
      {showCreateSubfolderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white/95 rounded-lg shadow-md w-full max-w-[350px] border border-slate-200/80"
            style={{ padding: "14px 16px 12px 16px" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-subfolder-title"
          >
            <h2
              id="new-subfolder-title"
              className="text-lg sm:text-xl font-semibold tracking-tight mb-4"
              style={{ color: "#0F172A" }}
            >
              New Folder
            </h2>

            {error && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubfolder} className="flex flex-col gap-3.5"></form>
              <div className="flex gap-3.5">
                {/* Left column: vertical color selector */}
                <div className="flex flex-col items-center" style={{ width: "120px" }}>
                  <label className="block text-[11px] font-medium text-gray-500 mb-3 self-start">
                    Color
                  </label>
                  <div className="flex flex-col gap-2.5 w-full">
                    {colorOptions.map((color) => {
                      const isActive = subfolderColor === color.value;
                      return (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSubfolderColor(color.value)}
                          className="flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 rounded-md"
                          aria-label={color.name}
                          aria-pressed={isActive}
                          title={`Select ${color.name} color`}
                        >
                          <span
                            className={`flex items-center justify-center transition-all duration-150 ${
                              isActive
                                ? "border border-slate-300 bg-slate-50"
                                : "border border-slate-200 bg-white"
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
                      value={subfolderName}
                      onChange={(e) => setSubfolderName(e.target.value)}
                      placeholder=""
                      className="w-full max-w-[210px] rounded-lg px-3 py-1.5 text-sm text-gray-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 bg-white/80"
                      disabled={creating}
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
                    setShowCreateSubfolderModal(false);
                    setSubfolderName("");
                    setSubfolderColor("blue");
                    setError("");
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 rounded-lg border border-slate-200 bg-white hover:bg-gray-50 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                   type="submit"
                   disabled={creating}
                   className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
               {creating ? "Creating..." : "Create"}
               </button>
            </div>
         </div>
      </div>
    )}

      {/* File Preview Modal - Full Screen */}
      {showPreviewModal && selectedFile && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col preview-modal">
          <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
            <h2 className="text-lg font-semibold">{selectedFile.name}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadFile(selectedFile)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (previewUrl) {
                    window.URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                  setShowPreviewModal(false);
                  setSelectedFile(null);
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close modal"
                title="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-800">
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

      {/* Password Modal for Locked Folders */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Folder is Locked</h2>
                <p className="text-xs text-gray-500 mt-1">Enter the password you used to lock this folder</p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                  setPasswordError("");
                  setPendingFolderId(null);
                  // If we're in a locked folder and cancel, go back
                  if (currentFolder?.isLocked && !pendingFolderId) {
                    router.push("/dashboard");
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                                                                     setPasswordError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passwordInput.trim()) {
                    handleUnlockAndOpen();
                  }
                }}
                placeholder="Enter the folder password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#9bc4a8]"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-2">{passwordError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                  setPasswordError("");
                  setPendingFolderId(null);
                  // If we're in a locked folder and cancel, go back
                  if (currentFolder?.isLocked && !pendingFolderId) {
                    router.push("/dashboard");
                  }
                }}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockAndOpen}
                className="flex-1 bg-[#9bc4a8] text-white font-medium py-2 rounded-lg hover:bg-[#8ab39a] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!passwordInput.trim()}
              >
                Open Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      <MoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleBulkMove}
        folders={subfolders}
        token={token}
        currentFolderId={folderId}
      />

      {/* Arc Action Button - Top Right (same behavior as dashboard) */}
      <ArcActionButton
        onMagicLens={() => smoothNavigate("/dashboard/magic-lens")}
        onLocked={() => smoothNavigate("/dashboard/locked")}
        onUpload={() => fileInputRef.current?.click()}
        onFavorites={() => smoothNavigate("/dashboard/important")}
      />
    </div>
  );
}
