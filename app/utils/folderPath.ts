export interface FolderWithParentChain {
  name: string;
  parentChain?: Array<{ id: number; name: string }>;
}

// Build the *parent* path for a folder, e.g. "Personal / dance" for child folders,
// never including the folder's own name. For top-level folders (no parentChain),
// fall back to the folder's own name so the category label still appears.
export function buildFolderPath(folder: FolderWithParentChain): string {
  const chainNames = folder.parentChain?.map((p) => p.name) ?? [];

  if (!chainNames.length) {
    // Top-level: show the category name itself
    return folder.name;
  }

  // Only parent chain, exclude the folder's own name
  return chainNames.join(" / ");
}
