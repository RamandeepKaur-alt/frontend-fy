"use client";

import { useState, useEffect, ChangeEvent, FormEvent, MouseEvent } from "react";
import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import LoginModal from "../components/LoginModal";
import { signupAndOnboard } from "../utils/authClient";

export default function SignupPage() {
  const [isLoginOpen, setLoginOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-dismiss error message after 7 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle Input
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Submit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signupAndOnboard(formData);

    if (!result.ok) {
      setError(result.error || "Something went wrong");
      setLoading(false);

      // If this is a duplicate account case, gently open login modal
      if (result.error === "This account is already registered. Continue to login.") {
        setLoginOpen(true);
      }
      return;
    }

    // On success, signupAndOnboard already navigates to dashboard and stores auth.
    setLoading(false);
  };

  return (
    <main 
      className="min-h-screen relative flex flex-col"
      style={{
        background: '#FAFAFA',
        fontFamily: 'var(--font-poppins), Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        minHeight: '100vh'
      }}
    >
      <LoginModal open={isLoginOpen} onClose={() => setLoginOpen(false)} />
      
      {/* Top Navigation with Logo - Left-Aligned Premium */}
      <div 
        className="relative border-b border-gray-200/40 bg-white/60 backdrop-blur-sm flex-shrink-0"
        style={{
          paddingLeft: '40px',
          paddingRight: '24px',
          paddingTop: '20px',
          paddingBottom: '16px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="flex items-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2.5 group"
          >
            <FolderOpen 
              className="w-6 h-6 flex-shrink-0" 
              style={{ color: '#64748B' }} 
            />
            <h1 
              className="text-2xl font-semibold tracking-tight"
              style={{ 
                color: '#0F172A',
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                lineHeight: '1.2'
              }}
            >
              <span style={{ fontSize: '1.15em' }}>F</span>ynora
            </h1>
          </Link>
        </div>
      </div>

      {/* Main Content - Centered and Responsive */}
      <div className="relative flex-1 flex items-center justify-center px-6 py-8" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="w-full max-w-md">
          {/* Hero Heading Section */}
          <div 
            className="mb-8 text-center signup-heading-animate"
            style={{
              opacity: 0,
              transform: 'translateY(12px)'
            }}
          >
            <h2 
              className="text-3xl font-bold mb-2.5"
              style={{
                color: '#0F172A',
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                fontWeight: 700,
                letterSpacing: '-0.015em',
                lineHeight: '1.2'
              }}
            >
              Create Account
            </h2>
            <p 
              className="text-sm"
              style={{
                color: '#64748B',
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                fontWeight: 400,
                letterSpacing: '0.01em'
              }}
            >
              Start organizing your files today
            </p>
          </div>

          {/* Premium Form Card */}
          <div 
            className="relative bg-white rounded-xl p-7 signup-card-animate"
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E2E8F0',
              opacity: 0,
              transform: 'translateY(16px)'
            }}
          >

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

            <form onSubmit={handleSubmit} className="relative flex flex-col gap-5">
              <div className="space-y-1.5">
                <label 
                  className="block text-xs font-medium"
                  style={{
                    color: '#475569',
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                    fontWeight: 500
                  }}
                >
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  suppressHydrationWarning
                  className="w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50"
                  style={{
                    color: '#0F172A',
                    borderColor: '#E2E8F0',
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                  }}
                />
              </div>

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
                  value={formData.email}
                  onChange={handleChange}
                  required
                  suppressHydrationWarning
                  className="w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50"
                  style={{
                    color: '#0F172A',
                    borderColor: '#E2E8F0',
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                  }}
                />
              </div>

              <div className="space-y-1.5">
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
                <input
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  suppressHydrationWarning
                  className="w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50"
                  style={{
                    color: '#0F172A',
                    borderColor: '#E2E8F0',
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                suppressHydrationWarning
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
                  {loading ? "Creating Account..." : "Create Account"}
                </span>
                {!loading && (
                  <ArrowRight 
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" 
                  />
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t" style={{ borderColor: '#E2E8F0' }}>
              <p 
                className="text-center text-xs"
                style={{
                  color: '#64748B',
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                }}
              >
                Already have an account?{" "}
                <button
                  onClick={() => setLoginOpen(true)}
                  suppressHydrationWarning
                  className="font-semibold transition-colors duration-200"
                  style={{
                    color: '#2563EB',
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#1D4ED8'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#2563EB'}
                >
                  Login
                </button>
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div 
            className="text-center mt-5 signup-link-animate"
            style={{
              opacity: 0,
              transform: 'translateY(12px)'
            }}
          >
            <Link
              href="/"
              className="text-xs transition-colors duration-200 inline-flex items-center gap-1"
              style={{
                color: '#94A3B8',
                fontFamily: 'var(--font-poppins), Poppins, sans-serif'
              }}
              onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = '#64748B';
              }}
              onMouseLeave={(e: MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = '#94A3B8';
              }}
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes signup-fade-slide-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes signup-card-fade-slide {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .signup-heading-animate {
          animation: signup-fade-slide-up 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .signup-card-animate {
          animation: signup-card-fade-slide 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.05s forwards;
        }

        .signup-link-animate {
          animation: signup-fade-slide-up 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        input::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }
      `}</style>
    </main>
  );
}
