"use client";

import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";

export default function ProfileDropdown({ userName }: { userName: string }) {
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
        className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 ease-in-out shadow-sm hover:shadow click-scale"
        style={{ borderColor: '#E2E8F0' }}
      >
        <div className="w-6 h-6 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-medium" style={{ color: '#0F172A' }}>{userName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ease-in-out flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} style={{ color: '#94A3B8' }} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 dropdown-menu" style={{ borderColor: '#E2E8F0' }}>
          <button
            onClick={() => {
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-all duration-200 ease-in-out"
            style={{ color: '#0F172A' }}
          >
            <User className="w-4 h-4" style={{ color: '#64748B' }} />
            Profile
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-all duration-200 ease-in-out"
            style={{ color: '#0F172A' }}
          >
            <Settings className="w-4 h-4" style={{ color: '#64748B' }} />
            Settings
          </button>
          <div className="border-t my-1" style={{ borderColor: '#E2E8F0' }}></div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 transition-all duration-200 ease-in-out"
            style={{ color: '#DC2626' }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}



