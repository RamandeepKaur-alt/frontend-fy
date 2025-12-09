"use client";

import { useState, useEffect } from "react";
import { 
  Briefcase, 
  User, 
  FileText,
  Image,
  Star, 
  FolderKanban,
  Plus,
  X,
  Check
} from "lucide-react";

interface CategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
  title: string;
  mode: "folder" | "upload";
}

const DEFAULT_CATEGORIES = [
  { name: "Work", icon: Briefcase, color: "text-blue-500", bgColor: "bg-blue-50" },
  { name: "Personal", icon: User, color: "text-blue-500", bgColor: "bg-blue-50" },
  { name: "Documents", icon: FileText, color: "text-blue-500", bgColor: "bg-blue-50" },
  { name: "Media", icon: Image, color: "text-blue-500", bgColor: "bg-blue-50" },
  { name: "Important", icon: Star, color: "text-blue-500", bgColor: "bg-blue-50" },
];

export default function CategorySelectionModal({
  isOpen,
  onClose,
  onSelectCategory,
  title,
  mode,
}: CategorySelectionModalProps) {
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Load custom categories from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("fynora_custom_categories");
      Promise.resolve().then(() => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setCustomCategories(Array.isArray(parsed) ? parsed : []);
          } catch (err) {
            console.error("Failed to parse custom categories:", err);
            setCustomCategories([]);
          }
        } else {
          setCustomCategories([]);
        }
      });
    }
  }, [isOpen]);

  const handleCategoryClick = (categoryName: string) => {
    onSelectCategory(categoryName);
    onClose();
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const trimmedName = newCategoryName.trim();
    
    // Check if category already exists (default or custom)
    const allCategories = [...DEFAULT_CATEGORIES.map(c => c.name), ...customCategories];
    if (allCategories.includes(trimmedName)) {
      alert("This category already exists!");
      return;
    }

    setIsCreating(true);
    
    // Add to custom categories
    const updated = [...customCategories, trimmedName];
    setCustomCategories(updated);
    
    // Save to localStorage
    localStorage.setItem("fynora_custom_categories", JSON.stringify(updated));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('custom-category-created'));
    
    // Reset and close input
    setNewCategoryName("");
    setShowCreateInput(false);
    setIsCreating(false);
    
    // Auto-select the newly created category
    setTimeout(() => {
      handleCategoryClick(trimmedName);
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreateCategory();
    } else if (e.key === "Escape") {
      setShowCreateInput(false);
      setNewCategoryName("");
    }
  };

  if (!isOpen) return null;

  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map(name => ({
      name,
      icon: FolderKanban, // Default icon for custom categories
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    }))
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showCreateInput) {
          onClose();
        }
      }}
      style={{ transition: 'opacity 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out' }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden modal-content">
        {/* Header */}
        <div className="bg-[#2563EB] text-white px-4 py-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-white/20 rounded transition-colors flex items-center justify-center w-6 h-6"
            aria-label="Close"
            disabled={showCreateInput}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 max-h-[55vh] overflow-y-auto">
          <div className="space-y-1">
            {allCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  disabled={showCreateInput}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded border border-gray-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-all duration-150 ease-in-out group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className={`p-1 rounded ${category.bgColor} group-hover:bg-[#2563EB]/10 transition-colors flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${category.color} group-hover:text-[#2563EB] transition-colors`} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-[#2563EB] transition-colors flex-1 text-left">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Create Custom Category Section */}
          {showCreateInput ? (
            <div className="mt-2.5 p-2.5 rounded border border-dashed border-gray-300 bg-gray-50">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter category name..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB] text-xs"
                  autoFocus
                  disabled={isCreating}
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isCreating}
                  className="p-1 bg-[#2563EB] text-white rounded hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label="Create category"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setShowCreateInput(false);
                    setNewCategoryName("");
                  }}
                  className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors flex items-center justify-center"
                  aria-label="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateInput(true)}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded border border-dashed border-gray-300 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-all text-xs text-gray-600 hover:text-[#2563EB] font-medium"
            >
              <Plus className="w-3 h-3" />
              <span>Create Custom Category</span>
            </button>
          )}

          <button
            onClick={onClose}
            disabled={showCreateInput}
            className="mt-3 w-full py-1.5 text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

