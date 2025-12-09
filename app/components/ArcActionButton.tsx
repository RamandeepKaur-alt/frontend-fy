"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Zap, Lock, Upload, Star, Sparkles } from "lucide-react";

interface ArcActionButtonProps {
  onMagicLens: () => void;
  onLocked: () => void;
  onUpload: () => void;
  onFavorites?: () => void;
}

interface ArcAction {
  icon: typeof Sparkles;
  label: string;
  action: () => void;
  color: string;
}

export default function ArcActionButton({
  onMagicLens,
  onLocked,
  onUpload,
  onFavorites,
}: ArcActionButtonProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const actions: ArcAction[] = [
    { icon: Sparkles, label: "Magic Lens", action: onMagicLens, color: "#F59E0B" },
    { icon: Lock, label: "Locked", action: onLocked, color: "#475569" },
    { icon: Upload, label: "Upload", action: onUpload, color: "#2563EB" },
    ...(onFavorites ? [{ icon: Star, label: "Favorites", action: onFavorites, color: "#F59E0B" }] : []),
  ];

  // Calculate arc position for proper visible semicircle with even spacing
  // All buttons appear BELOW the thunder icon, shifted more to the left, in a clear curved semicircle
  const getArcPosition = (index: number, total: number) => {
    // Premium radius for clearly visible semi-circle arc
    const radius = 120;
    
    // Proper semicircle angle range: -30° to +65° (curved arc, shifted more to the left)
    // Starting from -30° (more to the left) to 65° (diagonal down-right)
    // This creates a visible semicircle arc below and to the left of thunder icon
    const startAngle = -30; // Start more to the left
    const endAngle = 65; // End at diagonal down-right (reduced to prevent collision)
    const angleRange = endAngle - startAngle;
    
    // Equal spacing along the curve - divide arc evenly for proper semicircle
    const angleStep = total > 1 ? angleRange / (total - 1) : 0;
    const angle = startAngle + (angleStep * index);
    
    // Convert to radians
    const radians = (angle * Math.PI) / 180;
    const startRadians = (startAngle * Math.PI) / 180;
    
    // Calculate position on the semicircle with proper relative positioning
    // For a left-shifted semicircle: buttons curve from left to right as they go down
    const xOffset = Math.cos(radians) * radius - Math.cos(startRadians) * radius;
    const yOffset = Math.sin(radians) * radius - Math.sin(startRadians) * radius;
    
    // Add premium breathing gap from thunder icon to first button
    const baseVerticalOffset = 65; // Initial gap from thunder icon (increased)
    
    // Add more left shift so buttons appear clearly to the left of thunder icon
    const leftShift = -45; // Shift buttons 45px to the left (increased for better appearance)
    
    // Add extra vertical spacing to prevent collision between buttons
    const extraVerticalSpacing = index * 8; // Small additional spacing to prevent overlap
    
    const verticalOffset = baseVerticalOffset + yOffset + extraVerticalSpacing;
    const horizontalOffset = xOffset + leftShift;
    
    // NO rotation - items stay straight and horizontally aligned
    return { xOffset: horizontalOffset, yOffset: verticalOffset };
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleActionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  // Hide thunder actions on specific sections only
  const shouldHide = pathname && (
    pathname.startsWith("/dashboard/locked") ||
    pathname.startsWith("/dashboard/important") ||
    pathname.startsWith("/dashboard/magic-lens")
  );

  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Backdrop Blur Overlay - Premium Glassmorphic */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300"
          style={{
            backdropFilter: "blur(12px)",
            backgroundColor: "rgba(0, 0, 0, 0.03)",
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Parent Wrapper - Fixed below Header */}
      <div className="fixed z-50" style={{ top: "130px", right: "28px" }}>
        {/* Action Buttons in Visible Downward Semi-Arc */}
        <div 
          ref={menuRef} 
          className="absolute"
          style={{ 
            right: 0,
            top: 0,
            width: "auto",
            height: "auto",
          }}
        >
          {actions.map((item, index) => {
            const Icon = item.icon;
            const { xOffset, yOffset } = getArcPosition(index, actions.length);
            const delay = 80 + (index * 20); // Stagger delay 80-140ms
            
            return (
              <button
                key={item.label}
                onClick={() => handleActionClick(item.action)}
                className="absolute flex items-center gap-2.5 rounded-full px-4 py-2.5 transition-all duration-300"
                style={{
                  // Premium glassmorphic style with pure white background
                  backgroundColor: "#FFFFFF",
                  backdropFilter: "blur(20px)",
                  border: "1px solid #E5E7EB",
                  boxShadow: isOpen 
                    ? "0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)"
                    : "0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)",
                  right: 0, // Always anchored to right (thunder icon center)
                  top: 0, // Start from thunder icon position
                  // Items follow visible smooth downward arc path but remain straight (no rotation)
                  transform: isOpen 
                    ? `translateX(${xOffset}px) translateY(${yOffset}px) scale(1)`
                    : "translateX(100px) translateY(0) scale(0.8)",
                  transformOrigin: "center right", // Spread right-side from thunder icon
                  opacity: isOpen ? 1 : 0,
                  pointerEvents: isOpen ? "auto" : "none",
                  whiteSpace: "nowrap",
                  transition: `transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
                onMouseEnter={(e) => {
                  if (isOpen) {
                    const { xOffset, yOffset } = getArcPosition(index, actions.length);
                    e.currentTarget.style.transform = `translateX(${xOffset}px) translateY(${yOffset}px) scale(1.05)`;
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(37, 99, 235, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)";
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                    e.currentTarget.style.borderColor = "#2563EB";
                    // Update icon color on hover
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = "#2563EB";
                  }
                }}
                onMouseLeave={(e) => {
                  if (isOpen) {
                    const { xOffset, yOffset } = getArcPosition(index, actions.length);
                    e.currentTarget.style.transform = `translateX(${xOffset}px) translateY(${yOffset}px) scale(1)`;
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)";
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    // Reset icon color
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = item.color;
                  }
                }}
              >
                <Icon
                  className="w-4 h-4 transition-all duration-200"
                  style={{
                    color: "#333333", // Default high contrast neutral
                    strokeWidth: 1.5,
                  }}
                />
                <span
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: "#111111" }} // High contrast neutral text
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main FAB Button - Thunder Icon (Premium Gradient, Professional) */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-50"
          style={{
            width: "40px",
            height: "40px",
            // Premium Royal Blue → Violet Gradient
            background: isOpen 
              ? "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)"
              : "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
            backdropFilter: "blur(20px)",
            // Premium shadow with soft glow
            boxShadow: isOpen 
              ? "0 12px 32px rgba(37, 99, 235, 0.4), 0 6px 16px rgba(124, 58, 237, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
              : "0 8px 24px rgba(37, 99, 235, 0.35), 0 4px 12px rgba(124, 58, 237, 0.25), 0 2px 4px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            transform: "none", // FAB does NOT move or rotate
            transition: "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          aria-label="Quick Actions"
          aria-expanded={isOpen}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)";
            e.currentTarget.style.boxShadow = "0 16px 40px rgba(37, 99, 235, 0.5), 0 8px 20px rgba(124, 58, 237, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isOpen 
              ? "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)"
              : "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)";
            e.currentTarget.style.boxShadow = isOpen 
              ? "0 12px 32px rgba(37, 99, 235, 0.4), 0 6px 16px rgba(124, 58, 237, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
              : "0 8px 24px rgba(37, 99, 235, 0.35), 0 4px 12px rgba(124, 58, 237, 0.25), 0 2px 4px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
          }}
        >
          <Zap 
            className="w-4 h-4 text-white transition-all duration-300" 
            style={{ 
              strokeWidth: 2,
              filter: isOpen ? "brightness(1.15) drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))" : "brightness(1)",
            }} 
          />
        </button>
      </div>
    </>
  );
}
