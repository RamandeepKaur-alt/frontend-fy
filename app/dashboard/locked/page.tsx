"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  User,
  FolderOpen,
  ArrowLeft,
  Lock,
  X,
  Eye,
  EyeOff,
  Upload,
  FileText,
} from "lucide-react";
import FolderListItem from "../../components/FolderListItem";
import FileListItem from "../../components/FileListItem";
import { buildFolderPath } from "../../utils/folderPath";
import VoiceSearchButton from "../../components/VoiceSearchButton";
import ActionToolbar from "../../components/ActionToolbar";
import MoveModal from "../../components/MoveModal";
import FileManagerSidebar from "../../components/FileManagerSidebar";
import ProfileDropdown from "../../components/ProfileDropdown";
import LeaveConfirmModal from "../../components/LeaveConfirmModal";
import { useLeaveConfirmation } from "../../hooks/useLeaveConfirmation";
import { fuzzySearch, SearchableItem } from "../../utils/fuzzySearch";
import { useClipboard } from "../../contexts/ClipboardContext";
import { useClipboardActions } from "../../hooks/useClipboardActions";
import { useToast } from "../../contexts/ToastContext";
import { BRAND_NAME } from "../../config/brand";
import { API_BASE } from "../../utils/authClient";

interface Folder extends SearchableItem {
  id: number;
  name: string;
  createdAt: string;
  folderColor?: string;
  isLocked?: boolean;
  isImportant?: boolean;
  parentId?: number | null;
  parentChain?: Array<{ id: number; name: string }>;
}

interface LockedFile {
  id: number;
  name: string;
  url: string;
  createdAt: string;
  size: number;
  mimetype: string;
}

export default function LockedFoldersPage() {
  const router = useRouter();
  const { leaveOpen, onStay, onLeave } = useLeaveConfirmation({ leaveTo: "/dashboard" });
  const [userName, setUserName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreatePasswordModal, setShowCreatePasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [createPasswordInput, setCreatePasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activePasswordField, setActivePasswordField] = useState<"create" | "confirm" | "enter" | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasLockPassword, setHasLockPassword] = useState<boolean | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<number>>(new Set());
  const [lockedFiles, setLockedFiles] = useState<LockedFile[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleUnlockFile = async (id: number) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/files/unlock/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        setLockedFiles(prev => prev.filter(f => f.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to unlock file");
      }
    } catch (err: any) {
      console.error("Failed to unlock file:", err);
      showError(err.message || "Failed to unlock file. Please try again.");
    }
  };

  const handleLockedFileClick = async (file: LockedFile) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/files/${file.id}/download`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to open locked file");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      // Open in a new tab for inline view/download
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked - fall back to triggering a download
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Failed to open locked file:", err);
      showError("Failed to open locked file. Please try again.");
    }
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
      // Always check for locked folders and password requirement
      // Don't use session storage to bypass password - always require password
      checkLockedFoldersAndPassword();
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
            console.error(`Failed to list folders when resolving category '${categoryName}' (locked view):`, res.status, errorData);
          }
        } catch (err) {
          console.error(`Error fetching folders when resolving category '${categoryName}' (locked view):`, err);
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
            console.error(`Failed to create category folder '${categoryName}' (locked view):`, createRes.status, createData);
            return null;
          }

          if (createData && createData.folder && createData.folder.id) {
            return createData.folder.id as number;
          }
        } catch (err) {
          console.error(`Error creating category folder '${categoryName}' (locked view):`, err);
        }
      } catch (err) {
        console.error(`Failed to get or create category folder ${categoryName} (locked view):`, err);
      }

      return null;
    };

    const handleCategoryClick = async (event: CustomEvent<{ category: string }>) => {
      const category = event.detail.category;

      try {
        const categoryFolderId = await getOrCreateCategoryFolder(category);
        
        if (categoryFolderId) {
          router.push(`/dashboard/folder/${categoryFolderId}?category=${encodeURIComponent(category)}`);
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

    window.addEventListener('sidebar-category-clicked', wrappedHandler);

    return () => {
      window.removeEventListener('sidebar-category-clicked', wrappedHandler);
    };
  }, [token, router, showError]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Locked uploads are treated as specially flagged files
      formData.append("folderId", ""); // Keep out of normal folders; locked flag controls visibility
      formData.append("locked", "true");

      const res = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        showSuccess("File uploaded successfully!");
        // Refresh locked folders & files so the new item appears in this view only
        if (isAuthenticated) {
          await fetchLockedFolders();
          await fetchLockedFiles();
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload file");
      }
    } catch (err: any) {
      console.error("Failed to upload file:", err);
      showError(err.message || "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle sidebar upload click
  useEffect(() => {
    const handleUploadClick = () => {
      fileInputRef.current?.click();
    };

    window.addEventListener('sidebar-upload-clicked', handleUploadClick);

    return () => {
      window.removeEventListener('sidebar-upload-clicked', handleUploadClick);
    };
  }, []);

      const checkLockedFoldersAndPassword = async () => {
    if (!token) return;

    try {
      // Check if user has lock password set
      const lockPasswordRes = await fetch(`${API_BASE}/api/auth/users/check-lock-password`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let userHasLockPassword = false;
      if (lockPasswordRes.ok) {
        const lockPasswordData = await lockPasswordRes.json();
        userHasLockPassword = lockPasswordData.hasLockPassword;
        setHasLockPassword(userHasLockPassword);
      }

      // Check if there are any locked folders
      const foldersRes = await fetch(`${API_BASE}/api/folders/locked`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let hasLockedFolders = false;
      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        hasLockedFolders = (foldersData.folders?.length || 0) > 0;
      }

      // Always show password modal - either create or verify
      // Clear any existing session auth to force password entry
      sessionStorage.removeItem('locked_folders_authenticated');
      setIsAuthenticated(false);
      
      if (!userHasLockPassword) {
        // No lock password set - always show create password modal
        setShowCreatePasswordModal(true);
      } else {
        // Lock password exists - show verify password modal
        setShowPasswordModal(true);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to check lock password:", err);
      setLoading(false);
    }
  };

  const fetchLockedFiles = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/files/locked`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const files: LockedFile[] = data.files || [];
        // Newest first so recently uploaded locked files appear at the top
        files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLockedFiles(files);
      }
    } catch (err) {
      console.error("Failed to fetch locked files:", err);
    }
  };

  const fetchLockedFolders = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/folders/locked`, {
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
        sessionStorage.removeItem('locked_folders_authenticated');
        setIsAuthenticated(false);
        router.push("/login");
      } else {
        console.error("Failed to fetch locked folders:", res.status);
      }
    } catch (err) {
      console.error("Failed to fetch locked folders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!token || !passwordInput.trim()) {
      setPasswordError("Please enter your lock password");
      return;
    }

    try {
      // Verify user's lock password
      const res = await fetch(`${API_BASE}/api/auth/users/verify-lock-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });

      if (res.ok) {
        // Password correct - store authentication in session
        sessionStorage.setItem('locked_folders_authenticated', 'true');
        setIsAuthenticated(true);
        setShowPasswordModal(false);
        setPasswordInput("");
        setPasswordError("");
        // Fetch folders after authentication
        await fetchLockedFolders();
        await fetchLockedFiles();
      } else {
        const data = await res.json();
        if (res.status === 401) {
          setPasswordError("Incorrect lock password. Please try again.");
        } else {
          setPasswordError(data.error || "Failed to verify password. Please try again.");
        }
      }
    } catch (err) {
      console.error("Failed to verify password:", err);
      setPasswordError("Failed to verify password. Please try again.");
    }
  };

  const handleCreatePasswordSubmit = async () => {
    if (!token || !createPasswordInput.trim()) {
      setPasswordError("Please enter a lock password");
      return;
    }

    if (createPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (createPasswordInput.trim().length < 4) {
      setPasswordError("Password must be at least 4 characters");
      return;
    }

    try {
      // Set user's lock password
      const res = await fetch(`${API_BASE}/api/auth/users/set-lock-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: createPasswordInput.trim() }),
      });

      if (res.ok) {
        // Lock password set - store authentication in session
        sessionStorage.setItem('locked_folders_authenticated', 'true');
        setHasLockPassword(true);
        setIsAuthenticated(true);
        setShowCreatePasswordModal(false);
        setCreatePasswordInput("");
        setConfirmPasswordInput("");
        setPasswordError("");
        // Fetch folders after authentication
        await fetchLockedFolders();
        await fetchLockedFiles();
      } else {
        const data = await res.json();
        setPasswordError(data.error || "Failed to set lock password. Please try again.");
      }
    } catch (err) {
      console.error("Failed to set lock password:", err);
      setPasswordError("Failed to set lock password. Please try again.");
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
      } else {
        throw new Error("Failed to rename folder");
      }
    } catch (err) {
      console.error("Failed to rename folder:", err);
      throw err;
    }
  };

  const handleUnlock = async (id: number, password?: string) => {
    if (!token) return;

    try {
      // If user is authenticated in locked folders session, skip password check
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
        setFolders(prev => prev.filter(f => f.id !== id));
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to unlock folder");
      }
    } catch (err: any) {
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
        setFolders(prev => prev.filter(f => f.id !== id));
        setSelectedFolderIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } else {
        throw new Error("Failed to delete folder");
      }
    } catch (err) {
      console.error("Failed to delete folder:", err);
      throw err;
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
    if (!hasItems() || !token) return;
    // Show MoveModal to select destination
    setShowPasteModal(true);
  };

  const handlePasteToDestination = async (targetFolderId: number | null) => {
    if (!hasItems() || !token) return;
    
    try {
      await pasteItems(targetFolderId, async () => {
        // Refresh folders after paste
        await fetchLockedFolders();
        setShowPasteModal(false);
      });
    } catch (err: any) {
      console.error("Failed to paste:", err);
      showError(err.message || "Failed to paste items. Please try again.");
    }
  };

  const handleShare = async () => {
    if (selectedFolderIds.size === 0 || !token) return;
    
    try {
      // Use global share function
      const shareData = await shareItems(selectedFolderIds, selectedItemTypes, token);
      
      // Copy share link to clipboard
      if (shareData?.shareLink) {
        await navigator.clipboard.writeText(shareData.shareLink);
        showSuccess("Share link copied to clipboard!");
      }
      
      // Deselect after sharing
      setSelectedFolderIds(new Set());
    } catch (err: any) {
      console.error("Failed to share folders:", err);
      showError(err.message || "Failed to share folders. Please try again.");
    }
  };

  const handleMove = async (targetFolderId: number | null) => {
    if (!token || selectedFolderIds.size === 0) return;
    
    try {
      for (const id of selectedFolderIds) {
        const res = await fetch(`${API_BASE}/api/folders/${id}/move`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ parentId: targetFolderId }),
        });
        if (res.ok) {
          // Remove from locked folders list if moved
          setFolders(prev => prev.filter(f => f.id !== id));
        }
      }
      setSelectedFolderIds(new Set());
      setShowMoveModal(false);
    } catch (err) {
      console.error("Failed to move folders:", err);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (selectedFolderIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedFolderIds.size} folder(s)?`)) {
      return;
    }
    
    try {
      await deleteItems(selectedFolderIds, selectedItemTypes, token);
      // Refresh folders after deletion
      await fetchLockedFolders();
      setSelectedFolderIds(new Set());
    } catch (err: any) {
      console.error("Failed to delete:", err);
      showError(err.message || "Failed to delete folders. Please try again.");
    }
  };

  // Use fuzzy search for locked folders
  const filteredFolders = fuzzySearch(folders, debouncedSearchQuery);

  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
        <p className="text-sm" style={{ color: '#64748B' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col page-transition" style={{ backgroundColor: '#FAFAFA' }}>
      <LeaveConfirmModal open={leaveOpen} onStay={onStay} onLeave={onLeave} />
      {/* Modern Navbar - Matching Dashboard / Important with global brand */}
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
            <button
              onClick={() => router.push("/dashboard")}
              className="mr-0.5 flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
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
            <ProfileDropdown userName={userName} />
          </div>
        </div>
      </nav>

      <div className="flex flex-1" style={{ borderRight: 'none' }}>
        {/* File Manager Sidebar */}
        <FileManagerSidebar showUploadInsteadOfNew={true} />
        
        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
          multiple
        />
        
        <main className="flex-1 overflow-y-auto flex flex-col" style={{ backgroundColor: '#FFFFFF', borderLeft: 'none' }}>
        <div className="flex-1 overflow-y-auto">
        {/* Show loading state when fetching */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-sm" style={{ color: '#64748B' }}>Loading locked folders...</p>
          </div>
        ) : isAuthenticated && !showPasswordModal && !showCreatePasswordModal ? (
          /* Secure Zone Content Area - Matches Dashboard */
          <div className="min-h-full">
            {/* Sticky Action Toolbar - same style as dashboard */}
            <div
              className="px-8 pt-3 pb-2 action-toolbar sticky top-0 z-30 bg-white border-b border-slate-200/40"
            >
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
            <div className="px-8 pb-8 pt-6">
              {/* Section title aligned with sidebar, matching dashboard style */}
              <div className="mb-4">
                <h2 className="text-sm font-medium tracking-wide text-slate-500 uppercase">
                  Locked Folders
                </h2>
              </div>
              {/* Voice Error Message */}
              {voiceError && (
                <div className="mb-4 p-3 rounded-lg text-sm border" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}>
                  {voiceError}
                </div>
              )}

              {/* Locked Folders & Files - Clean, minimal layout (full-width like dashboard) */}
              <div className="w-full space-y-6 list-container">
                {/* Locked Folders Empty / List */}
                {filteredFolders.length === 0 && lockedFiles.length === 0 ? (
                  <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                    <div className="text-center">
                      <div className="p-4 rounded-full inline-block mb-4" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)' }}>
                        <Lock className="w-10 h-10" style={{ color: '#2563EB' }} />
                      </div>
                      <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>No locked folders yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {filteredFolders.map((folder) => {
                      const folderColorHex = getColorHex(folder.folderColor || "blue");
                      const locationText = buildFolderPath(folder);
                      return (
                        <div key={folder.id} className="transition-colors duration-200 ease-in-out hover:bg-gray-50/50">
                          <FolderListItem
                            folder={folder}
                            folderColorHex={folderColorHex}
                            locationText={locationText}
                            lockedView
                            onUnlock={handleUnlock}
                            onClick={() => router.push(`/dashboard/folder/${folder.id}`)}
                            isSelected={selectedFolderIds.has(folder.id)}
                            onSelect={handleSelectFolder}
                            selectionMode={selectedFolderIds.size > 0}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Locked Files List - use shared FileListItem row layout */}
                {lockedFiles.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    {lockedFiles.map((file) => (
                      <div key={file.id} className="transition-colors duration-200 ease-in-out hover:bg-gray-50/50">
                        <FileListItem
                          file={file}
                          onDownload={() => handleLockedFileClick(file)}
                          lockedView
                          onLock={async () => handleUnlockFile(file.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
        </div>
      </main>
      </div>

      {/* Password Modal for Accessing Locked Folders */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop" style={{ transition: 'opacity 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out' }}>
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm modal-content">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1" style={{ color: '#0F172A' }}>Locked Folders</h2>
              <p className="text-sm" style={{ color: '#64748B' }}>Enter password to continue</p>
            </div>
            
            <div className="mb-6">
              <div className="relative password-input-wrapper">
                <input
                  type={showAccessPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && passwordInput.trim()) {
                      handlePasswordSubmit();
                    }
                  }}
                  onFocus={() => setActivePasswordField("enter")}
                  onBlur={(e) => {
                    const next = e.relatedTarget as HTMLElement | null;
                    if (!next || !e.currentTarget.parentElement?.contains(next)) {
                      setActivePasswordField(prev => (prev === "enter" ? null : prev));
                    }
                  }}
                  placeholder="Password"
                  className="w-full border rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200 ease-in-out"
                  style={{ 
                    borderColor: '#E2E8F0',
                    color: '#0F172A',
                  }}
                  autoFocus
                />
                {activePasswordField === "enter" && (
                  <button
                    type="button"
                    className="password-toggle-button absolute inset-y-0 right-3 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowAccessPassword(prev => !prev)}
                    onFocus={() => setActivePasswordField("enter")}
                    onBlur={(e) => {
                      const next = e.relatedTarget as HTMLElement | null;
                      if (!next || !e.currentTarget.parentElement?.contains(next)) {
                        setActivePasswordField(prev => (prev === "enter" ? null : prev));
                      }
                    }}
                    aria-label={showAccessPassword ? "Hide password" : "Show password"}
                  >
                    {showAccessPassword ? (
                      <EyeOff className="w-4 h-4 transition-opacity duration-150" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4 transition-opacity duration-150" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
              {passwordError && (
                <p className="text-xs mt-2" style={{ color: '#DC2626' }}>{passwordError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  router.push("/dashboard");
                }}
                className="flex-1 font-medium py-2.5 rounded-lg transition-all duration-200 ease-in-out text-sm click-scale"
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 font-medium py-2.5 rounded-lg transition-all duration-200 ease-in-out text-sm disabled:opacity-50 disabled:cursor-not-allowed click-scale"
                style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
                disabled={!passwordInput.trim()}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }
                }}
                onFocus={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.outline = '2px solid #2563EB';
                    e.currentTarget.style.outlineOffset = '2px';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.2)';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lock Password Modal */}
      {showCreatePasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop" style={{ transition: 'opacity 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out' }}>
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm modal-content">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1" style={{ color: '#0F172A' }}>Set Password</h2>
              <p className="text-sm" style={{ color: '#64748B' }}>Create a password for your locked folders</p>
            </div>
            
            <div className="mb-6 space-y-4">
              <div className="relative password-input-wrapper">
                <input
                  type={showCreatePassword ? "text" : "password"}
                  value={createPasswordInput}
                  onChange={(e) => {
                    setCreatePasswordInput(e.target.value);
                    setPasswordError("");
                  }}
                  onFocus={() => setActivePasswordField("create")}
                  onBlur={(e) => {
                    const next = e.relatedTarget as HTMLElement | null;
                    if (!next || !e.currentTarget.parentElement?.contains(next)) {
                      setActivePasswordField((prev) => (prev === "create" ? null : prev));
                    }
                  }}
                  placeholder="New password"
                  className="w-full border rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200 ease-in-out"
                  style={{ 
                    borderColor: '#E2E8F0',
                    color: '#0F172A',
                  }}
                  autoFocus
                />
                {activePasswordField === "create" && (
                  <button
                    type="button"
                    className="password-toggle-button absolute inset-y-0 right-3 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowCreatePassword((prev) => !prev)}
                    onFocus={() => setActivePasswordField("create")}
                    onBlur={(e) => {
                      const next = e.relatedTarget as HTMLElement | null;
                      if (!next || !e.currentTarget.parentElement?.contains(next)) {
                        setActivePasswordField((prev) => (prev === "create" ? null : prev));
                      }
                    }}
                    aria-label={showCreatePassword ? "Hide password" : "Show password"}
                  >
                    {showCreatePassword ? (
                      <EyeOff className="w-4 h-4 transition-opacity duration-150" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4 transition-opacity duration-150" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>

              <div className="relative password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPasswordInput}
                  onChange={(e) => {
                    setConfirmPasswordInput(e.target.value);
                    setPasswordError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createPasswordInput.trim() && confirmPasswordInput.trim()) {
                      handleCreatePasswordSubmit();
                    }
                  }}
                  onFocus={() => setActivePasswordField("confirm")}
                  onBlur={(e) => {
                    const next = e.relatedTarget as HTMLElement | null;
                    if (!next || !e.currentTarget.parentElement?.contains(next)) {
                      setActivePasswordField((prev) => (prev === "confirm" ? null : prev));
                    }
                  }}
                  placeholder="Confirm password"
                  className="w-full border rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200 ease-in-out"
                  style={{ 
                    borderColor: '#E2E8F0',
                    color: '#0F172A',
                  }}
                />
                {activePasswordField === "confirm" && (
                  <button
                    type="button"
                    className="password-toggle-button absolute inset-y-0 right-3 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    onFocus={() => setActivePasswordField("confirm")}
                    onBlur={(e) => {
                      const next = e.relatedTarget as HTMLElement | null;
                      if (!next || !e.currentTarget.parentElement?.contains(next)) {
                        setActivePasswordField((prev) => (prev === "confirm" ? null : prev));
                      }
                    }}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 transition-opacity duration-150" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4 transition-opacity duration-150" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
              {passwordError && (
                <p className="text-xs" style={{ color: '#DC2626' }}>{passwordError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  router.push("/dashboard");
                }}
                className="flex-1 font-medium py-2.5 rounded-lg transition-all duration-200 ease-in-out text-sm click-scale"
                style={{ backgroundColor: '#F1F5F9', color: '#475569' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E2E8F0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #2563EB';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePasswordSubmit}
                className="flex-1 font-medium py-2.5 rounded-lg transition-all duration-200 ease-in-out text-sm disabled:opacity-50 disabled:cursor-not-allowed click-scale"
                style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
                disabled={!createPasswordInput.trim() || !confirmPasswordInput.trim()}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }
                }}
                onFocus={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.outline = '2px solid #2563EB';
                    e.currentTarget.style.outlineOffset = '2px';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.2)';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal for Share */}
      {showMoveModal && token && (
        <MoveModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          onMove={handleMove}
          folders={[]}
          token={token}
        />
      )}

      {/* Paste Modal */}
      {showPasteModal && token && (
        <MoveModal
          isOpen={showPasteModal}
          onClose={() => setShowPasteModal(false)}
          onMove={handlePasteToDestination}
          folders={[]}
          token={token}
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
                // Refresh folders list
                await fetchLockedFolders();
                return data.folder.id;
              } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to create folder");
              }
            } catch (err: any) {
              console.error("Failed to create new folder:", err);
              showError(err.message || "Failed to create new folder. Please try again.");
              return null;
            }
          }}
        />
      )}
    </div>
  );
}

