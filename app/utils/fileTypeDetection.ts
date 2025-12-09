/**
 * File type detection utility
 * Detects file type from extension and MIME type
 */

export type FileType = 
  | "image" 
  | "document" 
  | "media" 
  | "code" 
  | "archive" 
  | "unknown";

export interface FileTypeInfo {
  type: FileType;
  category: string;
  icon: string;
  canPreview: boolean;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Detect file type from extension and MIME type
 */
export function detectFileType(
  filename: string,
  mimetype?: string
): FileTypeInfo {
  const extension = getFileExtension(filename);
  const mime = mimetype?.toLowerCase() || "";

  // Image files
  const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"];
  const imageMimes = ["image/"];

  if (
    imageExtensions.includes(extension) ||
    imageMimes.some((m) => mime.startsWith(m))
  ) {
    return {
      type: "image",
      category: "Image",
      icon: "image",
      canPreview: true,
    };
  }

  // Document files
  const documentExtensions = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "rtf",
    "odt",
    "ods",
  ];
  const documentMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument",
    "text/",
  ];

  if (
    documentExtensions.includes(extension) ||
    documentMimes.some((m) => mime.startsWith(m))
  ) {
    // PDFs, text files, and Word docs can be previewed
    const previewableExtensions = ["pdf", "txt", "docx", "doc", "rtf", "odt"];
    const canPreview = previewableExtensions.includes(extension) || 
                       mime === "application/pdf" ||
                       mime.startsWith("text/") ||
                       mime.includes("wordprocessingml") ||
                       mime === "application/msword";
    
    return {
      type: "document",
      category: "Document",
      icon: "file-text",
      canPreview: canPreview,
    };
  }

  // Media files
  const mediaExtensions = ["mp3", "mp4", "avi", "mov", "wmv", "flv", "wav", "ogg", "webm"];
  const mediaMimes = ["audio/", "video/"];

  if (
    mediaExtensions.includes(extension) ||
    mediaMimes.some((m) => mime.startsWith(m))
  ) {
    return {
      type: "media",
      category: "Media",
      icon: "video",
      canPreview: true,
    };
  }

  // Code files
  const codeExtensions = [
    "js",
    "ts",
    "jsx",
    "tsx",
    "json",
    "html",
    "css",
    "scss",
    "py",
    "java",
    "cpp",
    "c",
    "php",
    "rb",
    "go",
    "rs",
    "swift",
    "kt",
    "xml",
    "yaml",
    "yml",
    "md",
    "sh",
    "sql",
  ];
  const codeMimes = [
    "text/javascript",
    "application/json",
    "text/html",
    "text/css",
    "text/x-",
  ];

  if (
    codeExtensions.includes(extension) ||
    codeMimes.some((m) => mime.includes(m))
  ) {
    return {
      type: "code",
      category: "Code",
      icon: "code",
      canPreview: true,
    };
  }

  // Archive files
  const archiveExtensions = ["zip", "rar", "7z", "tar", "gz", "bz2"];
  const archiveMimes = ["application/zip", "application/x-rar", "application/x-7z"];

  if (
    archiveExtensions.includes(extension) ||
    archiveMimes.some((m) => mime.includes(m))
  ) {
    return {
      type: "archive",
      category: "Archive",
      icon: "archive",
      canPreview: false,
    };
  }

  // Unknown/Generic
  return {
    type: "unknown",
    category: "File",
    icon: "file",
    canPreview: false,
  };
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
