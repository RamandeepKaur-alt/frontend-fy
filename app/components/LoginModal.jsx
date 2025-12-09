"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FolderOpen } from "lucide-react";
import { loginAndBootstrap } from "../utils/authClient";

export default function LoginModal({ open, onClose }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Reset form and error when modal opens/closes
  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setForm({ email: "", password: "" });
        setError("");
        setShowPassword(false);
      });
    }
  }, [open]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await loginAndBootstrap(form);
    setLoading(false);

    if (!result.ok) {
      setError(result.error || "Login failed");
      return;
    }

    // On success, loginAndBootstrap will navigate to dashboard.
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 flex items-center justify-center z-[9999] modal-backdrop px-4"
        onClick={handleBackdropClick}
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s ease-in-out',
          animation: 'fade-in-backdrop 0.2s ease-out'
        }}
      >
        {/* Premium Modal Card - Compact and Centered */}
        <div 
          className="bg-white rounded-xl w-full max-w-md overflow-hidden modal-content relative"
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
            border: '1px solid #E2E8F0',
            animation: 'scale-in-modal 0.3s ease-out',
            fontFamily: 'var(--font-poppins), Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          {/* Header with Branding */}
          <div className="bg-white/60 backdrop-blur-sm flex-shrink-0" style={{ paddingTop: '24px', paddingBottom: '8px', paddingLeft: '24px', paddingRight: '24px' }}>
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="w-5 h-5" style={{ color: '#64748B' }} />
              <h1 
                className="text-xl font-medium tracking-tight"
                style={{ 
                  color: '#0F172A',
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                  fontWeight: 500,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.06)'
                }}
              >
                <span style={{ fontSize: '1.15em' }}>F</span>ynora
              </h1>
            </div>
            <h2 
              className="text-lg font-medium text-center"
              style={{
                color: '#0F172A',
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                marginTop: '8px',
                marginBottom: '0'
              }}
            >
              Welcome Back
            </h2>
          </div>

          {/* Form Content */}
          <div className="relative p-6" style={{ paddingTop: '8px' }}>
            {error && (
              <div 
                className="mb-5 p-3 rounded-lg text-sm text-center border transition-all duration-300 ease-in-out animate-slide-down"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                  color: '#DC2626',
                  borderColor: 'rgba(239, 68, 68, 0.15)',
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label 
                  className="block text-xs font-medium"
                  style={{
                    color: '#475569',
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                    fontWeight: 500
                  }}
                >
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  className="w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50"
                  style={{
                    color: '#0F172A',
                    borderColor: '#E2E8F0',
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                  }}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label 
                    className="block text-xs font-medium"
                    style={{
                      color: '#475569',
                      fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                      fontWeight: 500
                    }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Implement forgot password functionality
                    }}
                    className="text-xs transition-colors duration-200"
                    style={{
                      color: '#64748B',
                      fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                      fontWeight: 400
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    className="w-full bg-white border rounded-lg px-3.5 py-2.5 pr-10 text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50"
                    style={{
                      color: '#0F172A',
                      borderColor: '#E2E8F0',
                      fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                    }}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none"
                    style={{ cursor: 'pointer' }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`} style={{ fontSize: '16px' }}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-1 bg-[#2563EB] text-white font-semibold py-2.5 rounded-lg transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(37, 99, 235, 0.2)';
                  }
                }}
              >
                <span>
                  {loading ? "Logging in..." : "Login"}
                </span>
              </button>
            </form>

            <div className="mt-5">
              <p 
                className="text-center text-xs"
                style={{
                  color: '#64748B',
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                }}
              >
                Don&apos;t have an account?{" "}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                    window.location.href = '/signup';
                  }}
                  className="font-semibold transition-colors duration-200"
                  style={{
                    color: '#2563EB',
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#1D4ED8'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#2563EB'}
                >
                  Create Account
                </button>
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-4 text-xs w-full text-center transition-colors duration-200"
              style={{
                color: '#94A3B8',
                fontFamily: 'var(--font-poppins), Poppins, sans-serif'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#64748B'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-backdrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in-modal {
          from {
            opacity: 0;
            transform: scale(0.98) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slide-down-error {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slide-down-error 0.3s ease-out;
        }

        input::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }
      `}</style>
    </>
  );

  // Use portal to render modal at document root level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return modalContent;
}
