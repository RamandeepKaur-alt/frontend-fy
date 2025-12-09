"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Scissors, 
  Copy, 
  FileText, 
  Share2,
  Type, 
  Trash2, 
  ArrowUpDown,
  ChevronDown
} from "lucide-react";

interface ActionToolbarProps {
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onShare?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onSort?: (order: 'name' | 'date' | 'size', direction: 'asc' | 'desc') => void;
  sortOrder?: 'name' | 'date' | 'size';
  sortDirection?: 'asc' | 'desc';
  disabled?: {
    cut?: boolean;
    copy?: boolean;
    paste?: boolean;
    share?: boolean;
    rename?: boolean;
    delete?: boolean;
    sort?: boolean;
  };
}

function SortDropdown({ 
  onSortChange, 
  sortOrder: externalSortOrder, 
  sortDirection: externalSortDirection 
}: { 
  onSortChange: (order: 'name' | 'date' | 'size', direction: 'asc' | 'desc') => void;
  sortOrder?: 'name' | 'date' | 'size';
  sortDirection?: 'asc' | 'desc';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'name' | 'date' | 'size'>(externalSortOrder || 'date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(externalSortDirection || 'desc');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with external props
  useEffect(() => {
    if (externalSortOrder || externalSortDirection) {
      // Defer updates to avoid synchronous setState in effect body
      Promise.resolve().then(() => {
        if (externalSortOrder) setSortOrder(externalSortOrder);
        if (externalSortDirection) setSortDirection(externalSortDirection);
      });
    }
  }, [externalSortOrder, externalSortDirection]);

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

  const handleSort = (order: 'name' | 'date' | 'size') => {
    const newDirection = sortOrder === order && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortOrder(order);
    setSortDirection(newDirection);
    onSortChange(order, newDirection);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2.5 py-1 hover:bg-gray-50 rounded transition-all duration-200 ease-in-out text-gray-700 text-xs font-medium click-scale"
        title="Sort"
      >
        <ArrowUpDown className="w-3.5 h-3.5 transition-transform duration-200" />
        <span>Sort</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px] dropdown-menu">
          <button
            onClick={() => handleSort('name')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between transition-all duration-200 ease-in-out"
          >
            <span>Name</span>
            {sortOrder === 'name' && (
              <span className="text-xs text-gray-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          <button
            onClick={() => handleSort('date')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between transition-all duration-200 ease-in-out"
          >
            <span>Date</span>
            {sortOrder === 'date' && (
              <span className="text-xs text-gray-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          <button
            onClick={() => handleSort('size')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between transition-all duration-200 ease-in-out"
          >
            <span>Size</span>
            {sortOrder === 'size' && (
              <span className="text-xs text-gray-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ActionToolbar({
  onCut,
  onCopy,
  onPaste,
  onShare,
  onRename,
  onDelete,
  onSort,
  sortOrder,
  sortDirection,
  disabled = {}
}: ActionToolbarProps) {
  return (
    <div className="flex items-center gap-2">
        {/* Action Buttons */}
        {onCut && (
          <button
            onClick={onCut}
            disabled={disabled.cut}
            className="w-[32px] h-[32px] flex items-center justify-center hover:bg-gray-50 rounded transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed click-scale"
            title="Cut (Ctrl+X)"
          >
            <Scissors className="w-3.5 h-3.5 text-gray-600 transition-transform duration-200" />
          </button>
        )}

        {onCopy && (
          <button
            onClick={onCopy}
            disabled={disabled.copy}
            className="w-[32px] h-[32px] flex items-center justify-center hover:bg-gray-50 rounded transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed click-scale"
            title="Copy (Ctrl+C)"
          >
            <Copy className="w-3.5 h-3.5 text-gray-600 transition-transform duration-200" />
          </button>
        )}

        {onPaste && (
          <button
            onClick={onPaste}
            disabled={disabled.paste}
            className="w-[32px] h-[32px] flex items-center justify-center hover:bg-gray-50 rounded transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed click-scale"
            title="Paste (Ctrl+V)"
          >
            <FileText className="w-3.5 h-3.5 text-gray-600 transition-transform duration-200" />
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            disabled={disabled.share}
            className="w-[32px] h-[32px] flex items-center justify-center hover:bg-gray-50 rounded transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed click-scale"
            title="Share/Move"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-600 transition-transform duration-200" />
          </button>
        )}

        {onRename && (
          <button
            onClick={onRename}
            disabled={disabled.rename}
            className="w-[32px] h-[32px] flex items-center justify-center hover:bg-gray-50 rounded transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed click-scale"
            title="Rename"
          >
            <Type className="w-3.5 h-3.5 text-gray-600 transition-transform duration-200" />
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            disabled={disabled.delete}
            className="w-[32px] h-[32px] flex items-center justify-center hover:bg-gray-50 rounded transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed click-scale"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-600 transition-transform duration-200" />
          </button>
        )}

      {/* Sort Dropdown - After Delete */}
      {onSort && (
        <SortDropdown 
          onSortChange={onSort} 
          sortOrder={sortOrder}
          sortDirection={sortDirection}
        />
      )}
    </div>
  );
}

