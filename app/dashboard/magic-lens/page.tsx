"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Sparkles, Loader2, X, Check, File as FileIcon, Download, ArrowLeft } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { API_BASE } from "../../utils/authClient";

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  fileType: string;
  confidence: number;
}

export default function MagicLensPage() {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null);
      setError("");
      
      // Create preview URL
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !token) {
      setError("Please select a file and ensure you're logged in");
      return;
    }

    setAnalyzing(true);
    setError("");

    try {
      // Upload file directly to Magic Lens for analysis (temporary, won't save to main folder)
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Analyze file directly - this endpoint doesn't save to database
      const analyzeRes = await fetch(`${API_BASE}/api/magic-lens/analyze-upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          // Don't set Content-Type - let browser set it for FormData
        },
        body: formData,
      });

      if (!analyzeRes.ok) {
        let errorMessage = "Failed to analyze file";
        try {
          const errorData = await analyzeRes.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Analysis failed: ${analyzeRes.status} ${analyzeRes.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const analysisData = await analyzeRes.json();
      setAnalysisResult(analysisData.analysis);
      
    } catch (err: any) {
      console.error("Magic Lens error:", err);
      
      // More specific error messages
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        setError(`Cannot connect to server. Please make sure the backend server is reachable at ${API_BASE}`);
      } else if (err.message.includes("401") || err.message.includes("Unauthorized")) {
        setError("Authentication failed. Please log in again.");
      } else {
        setError(err.message || "Failed to analyze file. Please try again.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAsPDF = async (summary: string, fileName: string) => {
    if (!token) {
      showInfo("Please log in to save files to Fynora");
      return;
    }

    try {
      // Extract text content from HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = summary;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';

      // Create HTML content that can be printed as PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${fileName} - Summary</title>
            <meta charset="UTF-8">
            <style>
              @media print {
                @page { margin: 1cm; }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
              }
              h2 {
                font-size: 18px;
                font-weight: 700;
                color: #111827;
                margin-top: 24px;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e5e7eb;
              }
              p, div {
                color: #4b5563;
                font-size: 14px;
                margin-bottom: 12px;
              }
            </style>
          </head>
          <body>
            ${summary}
          </body>
        </html>
      `;

      // Create HTML file (will be saved as .html, user can print to PDF)
      const blob = new Blob([htmlContent], { type: 'text/html' });
      // Use global File constructor (not the lucide-react File icon)
      const fileObj = new globalThis.File([blob], `${fileName.replace(/\.[^/.]+$/, '')}_summary.html`, { type: 'text/html' });

      // Upload to Fynora
      const formData = new FormData();
      formData.append("file", fileObj);
      formData.append("folderId", "");

      const uploadRes = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (uploadRes.ok) {
        showSuccess("Summary saved to your Fynora account! You can open it and print to PDF if needed.");
      } else {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload file");
      }
    } catch (error: any) {
      console.error("Error saving file:", error);
      showError(`Failed to save file: ${error.message || "Please try again."}`);
    }
  };

  const handleSaveAsText = async (summary: string, fileName: string) => {
    if (!token) {
      showInfo("Please log in to save files to Fynora");
      return;
    }

    try {
      // Extract text content from HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = summary;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';

      // Create text file - use global File constructor (not the lucide-react File icon)
      const blob = new Blob([textContent], { type: 'text/plain' });
      const fileObj = new globalThis.File([blob], `${fileName.replace(/\.[^/.]+$/, '')}_summary.txt`, { type: 'text/plain' });

      // Upload to Fynora
      const formData = new FormData();
      formData.append("file", fileObj);
      formData.append("folderId", "");

      const uploadRes = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (uploadRes.ok) {
        showSuccess("Summary saved as text file to your Fynora account!");
      } else {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload text file");
      }
    } catch (error: any) {
      console.error("Error saving text file:", error);
      showError(`Failed to save text file: ${error.message || "Please try again."}`);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCloseSummary = () => {
    setAnalysisResult(null);
  };

  // Clean summary HTML - remove extra elements and style professionally
  const cleanSummaryHTML = (html: string) => {
    if (typeof window === 'undefined') return html;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove elements with common metadata/powered-by classes or text
    const allElements = Array.from(tempDiv.querySelectorAll('*'));
    allElements.forEach(el => {
      const text = el.textContent || '';
      const className = el.className || '';
      if (
        text.includes('Powered by') ||
        text.includes('Model:') ||
        text.includes('Metadata') ||
        className.includes('powered-by') ||
        className.includes('model-info') ||
        className.includes('metadata')
      ) {
        el.remove();
      }
    });
    
    // Replace green colors with blue in inline styles and attributes
    const htmlString = tempDiv.innerHTML;
    const cleaned = htmlString
      .replace(/#9bc4a8/gi, '#2563EB')
      .replace(/#7ab39a/gi, '#1D4ED8')
      .replace(/rgb\(155,\s*196,\s*168\)/gi, 'rgb(37, 99, 235)')
      .replace(/rgba\(155,\s*196,\s*168[^)]*\)/gi, 'rgba(37, 99, 235, 0.1)');
    
    return cleaned;
  };

  return (
    <div className="min-h-screen flex flex-col page-transition" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Fixed Navbar - Matching Dashboard */}
      <nav 
        className="px-6 py-4 transition-shadow duration-200 fixed top-0 left-0 right-0 z-40" 
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderBottom: '1px solid #E2E8F0', 
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' 
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5" style={{ color: '#64748B' }} />
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#0F172A' }}>
              Magic Lens
            </h1>
          </div>
        </div>
      </nav>

      <div className="flex flex-1" style={{ marginTop: '73px' }}>
        {/* Main Content - Full Width */}
        <main className="flex-1 overflow-y-auto max-w-5xl mx-auto px-8 py-8" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Error Message */}
        {error && !analysisResult && (
          <div className="mb-6 p-4 rounded-lg text-sm border" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#DC2626' }}></div>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Combined Upload Section - Hidden when summary is shown */}
        {!analysisResult && (
        <div className="rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all duration-300 mb-8" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          {/* Header Section */}
          <div className="flex items-start gap-3 mb-6 pb-4 border-b" style={{ borderColor: '#E2E8F0' }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(37, 99, 235, 0.06)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#2563EB' }} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1" style={{ color: '#0F172A', fontSize: 18 }}>AI-powered file analysis</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#64748B', fontSize: 14 }}>
                Upload any document and get an instant smart summary.
              </p>
            </div>
          </div>

          {/* Upload Section */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: 'rgba(37, 99, 235, 0.06)' }}>
                <Upload className="w-4 h-4" style={{ color: '#2563EB' }} />
              </div>
              <h3 className="text-sm font-medium" style={{ color: '#0F172A', fontSize: 14 }}>Upload file</h3>
            </div>
          
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group"
              style={{ 
                borderColor: '#E2E8F0',
                backgroundColor: '#F9FAFB',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="flex flex-col items-center">
                <div className="p-3 rounded-xl mb-3 group-hover:scale-105 transition-transform duration-300" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)' }}>
                  <Upload className="w-8 h-8" style={{ color: '#2563EB' }} />
                </div>
                <p className="mb-1 text-sm font-medium" style={{ color: '#0F172A', fontSize: 14 }}>Click to upload or drag and drop</p>
                <p className="text-xs" style={{ color: '#64748B', fontSize: 12 }}>Images, PDFs, documents, bills, receipts</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {/* File Preview */}
              <div className="flex items-start gap-3 rounded-xl border hover:shadow-md transition-all duration-200" style={{ backgroundColor: '#F9FAFB', borderColor: '#E2E8F0', padding: '16px 18px' }}>
                <div className="p-2 rounded-md" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)' }}>
                  <FileIcon className="w-6 h-6" style={{ color: '#2563EB' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0F172A', fontSize: 14 }}>{selectedFile.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B', fontSize: 12 }}>
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={handleClear}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 click-scale"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <X className="w-4 h-4" style={{ color: '#64748B' }} />
                </button>
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <div className="border rounded-xl p-3 shadow-inner overflow-hidden" style={{ backgroundColor: '#F9FAFB', borderColor: '#E2E8F0' }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed click-scale"
                style={{ backgroundColor: '#2563EB', color: '#FFFFFF', maxWidth: 'fit-content' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }
                }}
                onFocus={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.outline = '2px solid #2563EB';
                    e.currentTarget.style.outlineOffset = '2px';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.2)';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing with Magic Lens...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze with Magic Lens</span>
                  </>
                )}
              </button>
            </div>
          )}
          </div>
        </div>
        )}

        {/* Summary Modal */}
        {analysisResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop" style={{ transition: 'opacity 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out' }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col modal-content" style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)' }}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCloseSummary}
                    className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-100"
                    style={{ color: '#64748B' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                      e.currentTarget.style.color = '#2563EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#64748B';
                    }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>AI Summary</h2>
                </div>
              </div>

              {/* Summary Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div 
                  id="summary-content"
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: cleanSummaryHTML(analysisResult.summary) }}
                  style={{
                    color: '#475569'
                  }}
                />
                <style jsx global>{`
                  #summary-content h1,
                  #summary-content h2,
                  #summary-content h3,
                  #summary-content h4,
                  #summary-content h5,
                  #summary-content h6 {
                    font-size: 16px;
                    font-weight: 600;
                    color: #0F172A;
                    margin-top: 24px;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #E2E8F0;
                  }
                  #summary-content h1:first-child,
                  #summary-content h2:first-child,
                  #summary-content h3:first-child {
                    margin-top: 0;
                  }
                  #summary-content p,
                  #summary-content div {
                    color: #475569;
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 12px;
                  }
                  #summary-content * {
                    color: inherit;
                  }
                  #summary-content [style*="green"],
                  #summary-content [style*="#9bc4a8"],
                  #summary-content [style*="#7ab39a"] {
                    color: #2563EB !important;
                    background-color: rgba(37, 99, 235, 0.1) !important;
                    border-color: #2563EB !important;
                  }
                `}</style>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: '#E2E8F0' }}>
                <button
                  onClick={() => handleSaveAsPDF(analysisResult.summary, selectedFile?.name || 'document')}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
                  style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }}
                >
                  <Download className="w-4 h-4" />
                  Save as PDF
                </button>
                <button
                  onClick={() => handleSaveAsText(analysisResult.summary, selectedFile?.name || 'document')}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#2563EB' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                >
                  <Download className="w-4 h-4" />
                  Save as Text
                </button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

