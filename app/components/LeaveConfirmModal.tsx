"use client";

import React from "react";

interface LeaveConfirmModalProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export default function LeaveConfirmModal({ open, onStay, onLeave }: LeaveConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={onStay}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-sm w-full mx-4 relative"
        style={{
          animation: "leave-modal-fade-scale 0.22s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-base font-semibold text-slate-900 mb-2">Leave this page?</h2>
          <p className="text-sm text-slate-600">
            Are you sure you want to leave this page?
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4 pt-1 bg-slate-50/80 rounded-b-2xl border-t border-slate-200/80">
          <button
            type="button"
            onClick={onStay}
            className="px-3.5 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Stay Here
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-3.5 py-1.5 text-sm rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes leave-modal-fade-scale {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
