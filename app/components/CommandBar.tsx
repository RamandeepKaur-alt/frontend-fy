"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Search, 
  FolderPlus, 
  Upload, 
  Sparkles, 
  Lock, 
  Star,
  ArrowRight,
  Command
} from "lucide-react";

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: () => void;
  onUploadFile: () => void;
  onMagicLens: () => void;
  onLockFolder: () => void;
  onFavorites: () => void;
  onSearch: (query: string) => void;
  onNavigateToCategory: (category: string) => void;
}

const commands = [
  { id: 'create-folder', label: 'Create Folder', icon: FolderPlus, action: 'createFolder', category: 'Actions' },
  { id: 'upload-file', label: 'Upload File', icon: Upload, action: 'uploadFile', category: 'Actions' },
  { id: 'magic-lens', label: 'Magic Lens', icon: Sparkles, action: 'magicLens', category: 'Tools' },
  { id: 'lock-folder', label: 'Lock Folder', icon: Lock, action: 'lockFolder', category: 'Tools' },
  { id: 'favorites', label: 'Favorites', icon: Star, action: 'favorites', category: 'Navigation' },
  { id: 'work', label: 'Jump to Work', icon: ArrowRight, action: 'navigate', category: 'Navigation', categoryName: 'Work' },
  { id: 'personal', label: 'Jump to Personal', icon: ArrowRight, action: 'navigate', category: 'Navigation', categoryName: 'Personal' },
  { id: 'notes', label: 'Jump to Notes', icon: ArrowRight, action: 'navigate', category: 'Navigation', categoryName: 'Notes' },
  { id: 'important', label: 'Jump to Important', icon: ArrowRight, action: 'navigate', category: 'Navigation', categoryName: 'Important' },
  { id: 'projects', label: 'Jump to Projects', icon: ArrowRight, action: 'navigate', category: 'Navigation', categoryName: 'Projects' },
];

export default function CommandBar({
  isOpen,
  onClose,
  onCreateFolder,
  onUploadFile,
  onMagicLens,
  onLockFolder,
  onFavorites,
  onSearch,
  onNavigateToCategory,
}: CommandBarProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = query
    ? commands.filter(cmd => 
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, typeof commands>);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedIndex];
        if (selectedCommand) {
          handleCommandSelect(selectedCommand);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  const handleCommandSelect = (command: typeof commands[0]) => {
    switch (command.action) {
      case 'createFolder':
        onCreateFolder();
        break;
      case 'uploadFile':
        onUploadFile();
        break;
      case 'magicLens':
        onMagicLens();
        break;
      case 'lockFolder':
        onLockFolder();
        break;
      case 'favorites':
        onFavorites();
        break;
      case 'navigate':
        if (command.categoryName) {
          onNavigateToCategory(command.categoryName);
        }
        break;
    }
    onClose();
  };

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl mx-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200/50">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-lg"
          />
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded border border-gray-300">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {category}
              </div>
              {cmds.map((command) => {
                const index = currentIndex++;
                const Icon = command.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={command.id}
                    onClick={() => handleCommandSelect(command)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      transition-all duration-150
                      ${isSelected ? 'bg-[#9bc4a8]/10 border-l-2 border-[#9bc4a8]' : 'hover:bg-gray-50'}
                    `}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#9bc4a8]/20' : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#9bc4a8]' : 'text-gray-600'}`} />
                    </div>
                    <span className={`flex-1 font-medium ${isSelected ? 'text-[#9bc4a8]' : 'text-gray-700'}`}>
                      {command.label}
                    </span>
                    {isSelected && (
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded border border-gray-300">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-400">
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-200/50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">↵</kbd>
              <span>Select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">K</kbd>
            <span>to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}












