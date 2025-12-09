"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  ArrowRight,
  Briefcase,
  User,
  FileText,
  Image,
  Star,
  FolderKanban,
  X,
  Edit3,
  Trash2,
  Upload
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import {
  getEnabledCategories,
  getDisabledCategories,
  getCustomCategories,
  disableCategory,
  deleteCustomCategory,
  addCustomCategory,
  renameCategory,
  isDefaultCategory,
  DEFAULT_CATEGORIES as DEFAULT_CATEGORY_NAMES
} from "../utils/categoryManagement";

const DEFAULT_CATEGORIES = [
  { name: "Work", icon: Briefcase },
  { name: "Personal", icon: User },
  { name: "Documents", icon: FileText },
  { name: "Media", icon: Image },
  { name: "Important", icon: Star },
];

interface FileManagerSidebarProps {
  showUploadInsteadOfNew?: boolean;
}

export default function FileManagerSidebar({ showUploadInsteadOfNew = false }: FileManagerSidebarProps = {}) {
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ category: string; x: number; y: number } | null>(null);
  const [renameCategoryName, setRenameCategoryName] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [isCreateButtonHovered, setIsCreateButtonHovered] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Load categories from localStorage
  const loadCategories = () => {
    setCustomCategories(getCustomCategories());
    setDisabledCategories(getDisabledCategories());
  };

  useEffect(() => {
    // Defer to a microtask to avoid synchronous setState in effect body
    Promise.resolve().then(() => {
      loadCategories();
    });
  }, []);

  // Listen for category updates
  useEffect(() => {
    const handleCategoryUpdate = () => {
      loadCategories();
    };

    window.addEventListener('storage', handleCategoryUpdate);
    window.addEventListener('custom-category-created', handleCategoryUpdate);
    window.addEventListener('categories-updated', handleCategoryUpdate);

    return () => {
      window.removeEventListener('storage', handleCategoryUpdate);
      window.removeEventListener('custom-category-created', handleCategoryUpdate);
      window.removeEventListener('categories-updated', handleCategoryUpdate);
    };
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  // Detect active category from URL
  useEffect(() => {
    Promise.resolve().then(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category');
      if (category) {
        setActiveCategory(category);
      } else {
        // If no category in URL, check if current folder name matches a category
        const pathParts = pathname.split('/');
        if (pathParts.length > 0 && pathParts[pathParts.length - 1] !== 'dashboard') {
          // We're in a folder, but we can't determine category from path alone
          // The category should be set via URL parameter when navigating
          setActiveCategory(null);
        }
      }
    });
  }, [pathname]);

  const handleNew = () => {
    const event = new CustomEvent('sidebar-new-clicked');
    window.dispatchEvent(event);
  };

  const handleUpload = () => {
    const event = new CustomEvent('sidebar-upload-clicked');
    window.dispatchEvent(event);
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    const event = new CustomEvent('sidebar-category-clicked', { detail: { category } });
    window.dispatchEvent(event);
  };

  const handleContextMenu = (e: React.MouseEvent, categoryName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ category: categoryName, x: e.clientX, y: e.clientY });
  };

  const handleDeleteCategory = () => {
    if (!contextMenu) return;
    
    const categoryName = contextMenu.category;
    if (confirm(`Remove "${categoryName}" from sidebar? (Items in this category will not be deleted)`)) {
      if (isDefaultCategory(categoryName)) {
        disableCategory(categoryName);
      } else {
        deleteCustomCategory(categoryName);
      }
      setContextMenu(null);
    }
  };

  const handleRenameCategory = () => {
    if (!contextMenu) return;
    
    const categoryName = contextMenu.category;
    setRenameCategoryName(categoryName);
    setRenameInput(categoryName);
    setContextMenu(null);
  };

  const handleRenameSubmit = () => {
    if (!renameCategoryName || !renameInput.trim()) return;
    
    const success = renameCategory(renameCategoryName, renameInput.trim());
    if (success) {
      setRenameCategoryName(null);
      setRenameInput("");
    } else {
      alert("This category name already exists or is invalid!");
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const success = addCustomCategory(newCategoryName.trim());
    if (success) {
      setNewCategoryName("");
      setShowCreateCategory(false);
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } else {
      alert("This category already exists!");
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowCreateCategory(false);
      setNewCategoryName("");
    }
  };

  return (
    <aside 
      className="flex flex-col flex-shrink-0 overflow-hidden h-full"
      style={{ 
        width: '230px',
        minWidth: '230px',
        maxWidth: '230px',
        backgroundColor: '#FAFAFA',
        fontFamily: 'Poppins, sans-serif',
        height: '100%',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 h-full custom-scrollbar">
        <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
          {/* + New Button or Upload Button */}
          <div style={{ paddingTop: '24px', marginBottom: '16px', display: 'flex', justifyContent: 'flex-start' }}>
            {showUploadInsteadOfNew ? (
              <button
                onClick={handleUpload}
                className="flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ 
                  height: '32px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  color: '#2563EB',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}
              >
                <Upload className="w-3.5 h-3.5 transition-all duration-200" style={{ strokeWidth: 2, color: '#2563EB' }} />
                <span style={{ fontSize: '12px' }}>Upload</span>
              </button>
            ) : (
              <button
                onClick={handleNew}
                className="flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ 
                  height: '32px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  color: '#2563EB',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}
              >
                <Plus className="w-3.5 h-3.5 transition-all duration-200" style={{ strokeWidth: 2, color: '#2563EB' }} />
                <span style={{ fontSize: '12px' }}>New</span>
              </button>
            )}
          </div>

          {/* Categories Section */}
          <div style={{ paddingTop: '0px' }}>
            <div className="space-y-0.5">
              {/* Default Categories - Only show enabled ones */}
              {DEFAULT_CATEGORIES
                .filter(category => !disabledCategories.includes(category.name))
                .map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.name;
                  const isRenaming = renameCategoryName === category.name;
                  
                  return (
                    <div key={category.name} className="relative">
                      {isRenaming ? (
                        <div className="p-2 rounded-lg border border-[#2563EB] bg-white">
                          <input
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameSubmit();
                              } else if (e.key === 'Escape') {
                                setRenameCategoryName(null);
                                setRenameInput("");
                              }
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                            autoFocus
                            style={{ fontSize: '13px' }}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={handleRenameSubmit}
                              className="flex-1 px-2 py-1 text-xs rounded transition-all duration-200"
                              style={{ 
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                fontSize: '12px'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setRenameCategoryName(null);
                                setRenameInput("");
                              }}
                              className="px-2 py-1 text-xs rounded transition-all duration-200"
                              style={{ 
                                backgroundColor: '#F3F4F6',
                                color: '#111111',
                                fontSize: '12px'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCategoryClick(category.name)}
                          onContextMenu={(e) => handleContextMenu(e, category.name)}
                          className={`relative w-full flex items-center transition-all duration-300 ease-in-out ${
                            isActive ? 'active' : ''
                          }`}
                          style={{
                            gap: '10px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: isActive 
                              ? 'rgba(37, 99, 235, 0.08)'
                              : 'transparent',
                            color: isActive ? '#2563EB' : '#111111',
                            fontWeight: isActive ? 600 : 500,
                            boxShadow: 'none',
                            transform: 'translateX(0)',
                            justifyContent: 'flex-start',
                            transition: 'all 0.3s ease-in-out',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'rgba(41, 98, 255, 0.06)';
                              e.currentTarget.style.transform = 'translateX(4px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }
                          }}
                        >
                          <Icon 
                            className="flex-shrink-0 transition-all duration-300 ease-in-out" 
                            style={{ 
                              width: '18px',
                              height: '18px',
                              color: isActive ? '#2563EB' : '#333333',
                              filter: 'none',
                              strokeWidth: 1.5
                            }} 
                          />
                          <span 
                            className="flex-1 text-left transition-colors duration-300 ease-in-out"
                            style={{ 
                              fontSize: '13px',
                              fontWeight: isActive ? 600 : 500,
                              color: isActive ? '#2563EB' : '#111111'
                            }}
                          >
                            {category.name}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              
              {/* Custom Categories */}
              {customCategories.map((categoryName) => {
                const isActive = activeCategory === categoryName;
                const isRenaming = renameCategoryName === categoryName;
                
                return (
                  <div key={categoryName} className="relative">
                    {isRenaming ? (
                      <div className="p-2 rounded-lg border border-[#2563EB] bg-white">
                        <input
                          type="text"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameSubmit();
                            } else if (e.key === 'Escape') {
                              setRenameCategoryName(null);
                              setRenameInput("");
                            }
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                          autoFocus
                          style={{ fontSize: '13px' }}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleRenameSubmit}
                            className="flex-1 px-2 py-1 text-xs rounded transition-all duration-200"
                            style={{ 
                              backgroundColor: '#2563EB',
                              color: '#FFFFFF',
                              fontSize: '12px'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setRenameCategoryName(null);
                              setRenameInput("");
                            }}
                            className="px-2 py-1 text-xs rounded transition-all duration-200"
                            style={{ 
                              backgroundColor: '#F3F4F6',
                              color: '#111111',
                              fontSize: '12px'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCategoryClick(categoryName)}
                        onContextMenu={(e) => handleContextMenu(e, categoryName)}
                        className={`relative w-full flex items-center transition-all duration-300 ease-in-out ${
                          isActive ? 'active' : ''
                        }`}
                        style={{
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: isActive 
                            ? 'rgba(37, 99, 235, 0.08)'
                            : 'transparent',
                          color: isActive ? '#2563EB' : '#111111',
                          fontWeight: isActive ? 600 : 500,
                          boxShadow: 'none',
                          transform: 'translateX(0)',
                          justifyContent: 'flex-start',
                          transition: 'all 0.3s ease-in-out',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'rgba(41, 98, 255, 0.06)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }
                        }}
                      >
                        <FolderKanban 
                          className="flex-shrink-0 transition-all duration-300 ease-in-out" 
                          style={{ 
                            width: '18px',
                            height: '18px',
                            color: isActive ? '#2563EB' : '#333333',
                            filter: 'none',
                            strokeWidth: 1.5
                          }} 
                        />
                        <span 
                          className="flex-1 text-left transition-colors duration-300 ease-in-out"
                          style={{ 
                            fontSize: '13px',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? '#2563EB' : '#111111'
                          }}
                        >
                          {categoryName}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Create Your Own Button - Premium Circular Icon with Hover Text */}
              {showCreateCategory && (
                <div 
                  className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[10000]"
                  onClick={handleBackdropClick}
                  style={{ animation: 'fade-in-backdrop 0.2s ease-out' }}
                >
                  <div 
                    className="bg-white rounded-[20px] p-6 w-full max-w-[340px] mx-4 animate-scale-in-category"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08)',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                    }}
                  >
                    <h3 
                      className="text-base font-semibold mb-4"
                      style={{
                        color: '#0F172A',
                        fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                        fontWeight: 600
                      }}
                    >
                      New Category
                    </h3>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          handleCreateCategory();
                        } else if (e.key === 'Escape') {
                          setShowCreateCategory(false);
                          setNewCategoryName("");
                        }
                      }}
                      placeholder="Category name"
                      className="w-full px-4 py-3 text-sm rounded-lg border transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50 mb-5"
                      autoFocus
                      style={{ 
                        fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                        color: '#0F172A',
                        borderColor: '#E2E8F0',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim()}
                        className="flex-1 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ease-in-out font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                          fontWeight: 600,
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          if (newCategoryName.trim()) {
                            e.currentTarget.style.backgroundColor = '#1D4ED8';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (newCategoryName.trim()) {
                            e.currentTarget.style.backgroundColor = '#2563EB';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(37, 99, 235, 0.2)';
                          }
                        }}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateCategory(false);
                          setNewCategoryName("");
                        }}
                        className="flex-1 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ease-in-out font-medium border"
                        style={{ 
                          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                          fontWeight: 500,
                          backgroundColor: '#FFFFFF',
                          color: '#64748B',
                          borderColor: '#E2E8F0'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#CBD5E1';
                          e.currentTarget.style.color = '#475569';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.color = '#64748B';
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!showCreateCategory && (
                <div
                  className="mt-3 flex items-center"
                  style={{ borderTop: 'none', borderBottom: 'none' }}
                >
                  <button
                    onClick={() => setShowCreateCategory(true)}
                    onMouseEnter={() => setIsCreateButtonHovered(true)}
                    onMouseLeave={() => setIsCreateButtonHovered(false)}
                    onFocus={() => setIsCreateButtonHovered(true)}
                    onBlur={() => setIsCreateButtonHovered(false)}
                    className="group relative flex items-center transition-all duration-300 ease-in-out"
                    style={{
                      gap: '10px',
                      padding: '0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Circular Icon */}
                    <div
                      className="flex items-center justify-center rounded-full transition-all duration-300 ease-in-out"
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1.5px solid #E5E7EB',
                        borderBottom: 'none',
                        backgroundColor: isCreateButtonHovered ? '#FFFFFF' : '#FFFFFF',
                        boxShadow: isCreateButtonHovered ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none',
                      }}
                    >
                      <ArrowRight 
                        className="transition-all duration-300 ease-in-out" 
                        style={{ 
                          width: '16px',
                          height: '16px',
                          color: isCreateButtonHovered ? '#2563EB' : '#64748B',
                          strokeWidth: 2
                        }}
                      />
                    </div>
                    {/* Text Label - Only visible on hover/focus with smooth animation */}
                    <span
                      className="text-left whitespace-nowrap"
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#64748B',
                        opacity: isCreateButtonHovered ? 1 : 0,
                        transform: isCreateButtonHovered ? 'translateX(0)' : 'translateX(-8px)',
                        pointerEvents: 'none',
                        transition: 'opacity 0.3s ease, transform 0.3s ease',
                      }}
                    >
                      Create Your Own
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            transform: "translate(-10px, -10px)",
          }}
        >
          <button
            onClick={handleRenameCategory}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors duration-150"
          >
            <Edit3 className="w-4 h-4" style={{ color: '#64748B' }} />
            <span>Rename</span>
          </button>
          <button
            onClick={handleDeleteCategory}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors duration-150"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div 
          className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[10001] animate-slide-down-success"
          style={{
            backgroundColor: '#F0FDF4',
            color: '#166534',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid #BBF7D0',
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          Category created successfully!
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-backdrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in-category {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slide-down-success {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .animate-scale-in-category {
          animation: scale-in-category 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-slide-down-success {
          animation: slide-down-success 0.3s ease-out;
        }

        input::placeholder {
          color: #94A3B8;
          font-weight: 400;
          letter-spacing: 0.01em;
        }
      `}</style>
    </aside>
  );
}
