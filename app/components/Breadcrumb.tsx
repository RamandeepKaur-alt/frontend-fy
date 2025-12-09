"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSmoothNavigation } from "../hooks/useSmoothNavigation";

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  currentFolderName?: string;
}

export default function Breadcrumb({ items, currentFolderName }: BreadcrumbProps) {
  const router = useRouter();
  const smoothNavigate = useSmoothNavigation();

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.id === null) {
      // Navigate to dashboard (root)
      smoothNavigate("/dashboard");
    } else {
      // Navigate to specific folder
      smoothNavigate(`/dashboard/folder/${item.id}`);
    }
  };

  // Build full breadcrumb path (without Home)
  // items contains all parent folders, currentFolderName is the current folder
  const breadcrumbItems: BreadcrumbItem[] = [
    ...items,
    ...(currentFolderName ? [{ id: null, name: currentFolderName }] : [])
  ];

  // If no items, return empty
  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs min-w-0 overflow-hidden">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        // Parent folders are clickable, current folder is not
        const isClickable = !isLast && item.id !== null;

        return (
          <div key={index} className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => isClickable && handleBreadcrumbClick(item)}
              disabled={!isClickable}
              className={`px-1.5 py-0.5 rounded transition-colors truncate max-w-[120px] ${
                isLast
                  ? "text-gray-900 font-medium cursor-default"
                  : isClickable
                  ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                  : "text-gray-400 cursor-default"
              }`}
              title={item.name}
            >
              {item.name}
            </button>
            {!isLast && (
              <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

