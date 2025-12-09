 "use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Mic, Lock } from "lucide-react";
import LoginModal from "./components/LoginModal";
import { BRAND_NAME } from "./config/brand";

export default function Home() {
  const [isLoginOpen, setLoginOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  // Smoothly reveal sections below the hero when they enter the viewport
  useEffect(() => {
    if (typeof window === "undefined") return;

    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#111827] to-[#0F172A] text-white">
      <LoginModal open={isLoginOpen} onClose={() => setLoginOpen(false)} />

      {/* Navigation Bar */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold bg-gradient-to-r from-[#3EA7C7] to-[#2B6FA6] bg-clip-text text-transparent">
                <span className="inline-block text-[2.1rem] leading-none align-middle">
                  {BRAND_NAME.charAt(0)}
                </span>
                <span className="inline-block align-middle">
                  {BRAND_NAME.slice(1)}
                </span>
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                Features
              </a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                About
              </a>
              <button
                onClick={() => setLoginOpen(true)}
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24 min-h-[calc(100vh-80px)] flex items-center">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Title with Glow Effect */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#3EA7C7]/20 via-[#2B6FA6]/20 to-[#3EA7C7]/20 rounded-2xl blur-2xl opacity-50"></div>
              <h1 className="relative text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-relaxed md:leading-snug">
                <span className="block">
                  Experience a cloud that
                </span>
                <span className="block">
                  <span className="text-[#3EA7C7] font-semibold">feels effortless</span>
                  <span className="punctuation"> —</span>
                </span>
                <span className="block">
                  a smarter way to store<span className="punctuation">,</span>
                </span>
                <span className="block">
                  manage, and protect your files and folders
                  <span className="punctuation">.</span>
                </span>
              </h1>
            </div>

            {/* Subheading */}
            <p className="text-base md:text-lg text-gray-300 leading-relaxed max-w-lg">
              Create<span className="punctuation">,</span> upload and manage your files
              <span className="punctuation"> —</span> all in one place
              <span className="punctuation">.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/signup"
                className="group bg-gradient-to-r from-[#3EA7C7] to-[#2B6FA6] text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl hover:shadow-[#3EA7C7]/30 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* Right Side - Product Mockup */}
          <div className="relative">
            {/* Glow Effect Behind Mockup */}
            <div className="absolute -inset-8 bg-gradient-to-r from-[#3EA7C7]/20 to-[#2B6FA6]/20 rounded-3xl blur-3xl opacity-50"></div>
            
            {/* Mockup Container */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-sm">
              {/* Mockup Header */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 text-center">
                  fynora.app/dashboard
                </div>
              </div>

              {/* Mockup Content - Dashboard Preview */}
              <div className="space-y-3">
                {/* Sidebar Mockup */}
                <div className="flex gap-4">
                  <div className="w-20 space-y-2">
                    <div className="h-8 bg-white/10 rounded-lg"></div>
                    <div className="h-8 bg-[#3EA7C7]/30 rounded-lg border border-[#3EA7C7]/40 shadow-sm"></div>
                    <div className="h-8 bg-white/10 rounded-lg"></div>
                    <div className="h-8 bg-white/10 rounded-lg"></div>
                  </div>
                  
                  {/* Main Content Mockup */}
                  <div className="flex-1 space-y-3">
                    {/* Folder Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-[#3EA7C7]/25 to-[#2B6FA6]/25 border border-[#3EA7C7]/40 rounded-xl p-4 backdrop-blur-sm shadow-sm">
                        <div className="w-10 h-10 bg-[#3EA7C7]/40 rounded-lg mb-2"></div>
                        <div className="h-3 bg-white/20 rounded w-3/4 mb-1"></div>
                        <div className="h-2 bg-white/10 rounded w-1/2"></div>
                      </div>
                      <div className="bg-gradient-to-br from-[#1F4F6B]/20 to-[#1F4F6B]/20 border border-[#1F4F6B]/30 rounded-xl p-4 backdrop-blur-sm">
                        <div className="w-10 h-10 bg-[#1F4F6B]/30 rounded-lg mb-2"></div>
                        <div className="h-3 bg-white/20 rounded w-3/4 mb-1"></div>
                        <div className="h-2 bg-white/10 rounded w-1/2"></div>
                      </div>
                    </div>
                    
                    {/* File List Mockup */}
                    <div className="space-y-2">
                      <div className="h-12 bg-[#f5f5f0]/10 rounded-lg border border-[#3EA7C7]/20 flex items-center gap-3 px-4">
                        <div className="w-8 h-8 bg-[#3EA7C7]/20 rounded"></div>
                        <div className="flex-1">
                          <div className="h-2 bg-white/20 rounded w-1/3 mb-1"></div>
                          <div className="h-1.5 bg-white/10 rounded w-1/4"></div>
                        </div>
                      </div>
                      <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center gap-3 px-4">
                        <div className="w-8 h-8 bg-white/10 rounded"></div>
                        <div className="flex-1">
                          <div className="h-2 bg-white/20 rounded w-1/3 mb-1"></div>
                          <div className="h-1.5 bg-white/10 rounded w-1/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-[#3EA7C7]/30 to-[#2B6FA6]/30 rounded-2xl blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-[#2B6FA6]/20 to-[#3EA7C7]/20 rounded-3xl blur-2xl"></div>
          </div>
        </div>
      </main>

      {/* Features Section with Dashboard Color Touch */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10 landing-section reveal">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
          <p className="text-gray-400 text-lg">Powerful features for modern file management</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-4 md:mt-8">
          {[
            {
              icon: Sparkles,
              title: "Magic Lens - Summarize",
              description:
                "AI-powered file analysis that extracts and summarizes content from images, PDFs, and documents. Get instant insights from your files.",
            },
            {
              icon: Mic,
              title: "Voice Search",
              description:
                "Search your files and folders using natural voice commands. Find what you need faster with hands-free navigation.",
            },
            {
              icon: Lock,
              title: "Lock",
              description:
                "Protect sensitive folders with password locking. Keep your private files secure and accessible only to you.",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:border-[#3EA7C7]/30 group relative overflow-hidden"
            >
              {/* Subtle dashboard color accent */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#3EA7C7]/5 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3EA7C7]/20 to-[#2B6FA6]/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-[#3EA7C7]/10">
                  <feature.icon className="w-6 h-6 text-[#3EA7C7]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10 landing-section reveal">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">About {BRAND_NAME}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-[#3EA7C7] to-[#2B6FA6] mx-auto rounded-full"></div>
          </div>

          <div className="space-y-8 text-gray-300 leading-relaxed">
            <p className="text-lg">
              {BRAND_NAME} is a personal cloud workspace designed to transform how you interact with your files. We believe file management should be intelligent, secure, and effortless.
            </p>

            <p>
              Traditional file managers offer basic organization, but they lack the intelligence and security modern users need. {BRAND_NAME} bridges this gap by combining AI-powered analysis, voice navigation, and robust security features in one beautiful interface.
            </p>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mt-8">
              <h3 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-[#3EA7C7] to-[#2B6FA6] bg-clip-text text-transparent">
                What sets {BRAND_NAME} apart?
              </h3>
              <p className="mb-4">
                Our <span className="text-[#3EA7C7] font-semibold">Magic Lens</span> uses AI to extract and summarize content from any file. <span className="text-[#3EA7C7] font-semibold">Voice Search</span> lets you find files hands-free. And our <span className="text-[#3EA7C7] font-semibold">Lock & Important</span> system ensures your sensitive data stays protected while keeping what matters most easily accessible.
              </p>
            </div>

            <p className="text-lg font-medium">
              We&apos;re building the future of file management—where technology works for you, not against you.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-sm">
          <p>© {currentYear} {BRAND_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
