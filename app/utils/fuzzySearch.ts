import Fuse from "fuse.js";

export interface SearchableItem {
  name: string;
  parentId?: number | null;
  [key: string]: unknown;
}

/**
 * Check if all words in query are present in the item name (fuzzy matching)
 */
function allWordsMatch(queryWords: string[], itemName: string): boolean {
  const itemNameLower = itemName.toLowerCase();
  
  for (const word of queryWords) {
    // Check if word exists in item name (exact word match or starts with)
    const wordLower = word.toLowerCase();
    const wordsInItem = itemNameLower.split(/\s+/);
    
    // Check for exact word match
    const hasExactWord = wordsInItem.some(itemWord => itemWord === wordLower);
    
    // Check if any word in item starts with the query word (for partial matches)
    const hasPartialWord = wordsInItem.some(itemWord => itemWord.startsWith(wordLower));
    
    // Check if query word is contained in any item word (for fuzzy matching)
    const hasFuzzyWord = wordsInItem.some(itemWord => 
      itemWord.includes(wordLower) || wordLower.includes(itemWord)
    );
    
    // For short words (2-3 chars), require exact or starts-with match
    if (wordLower.length <= 3) {
      if (!hasExactWord && !hasPartialWord) {
        return false;
      }
    } else {
      // For longer words, allow fuzzy matching but still require meaningful match
      if (!hasExactWord && !hasPartialWord && !hasFuzzyWord) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Calculate word similarity score (0-1, higher = more similar)
 */
function calculateWordSimilarity(query: string, itemName: string): number {
  const queryLower = query.toLowerCase().trim();
  const itemLower = itemName.toLowerCase().trim();
  
  // Exact match
  if (itemLower === queryLower) return 1.0;
  
  // Starts with
  if (itemLower.startsWith(queryLower)) return 0.9;
  
  // Contains
  if (itemLower.includes(queryLower)) return 0.7;
  
  // Word-by-word matching for multi-word queries
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const itemWords = itemLower.split(/\s+/).filter(w => w.length > 0);
  
  if (queryWords.length > 1) {
    // Multi-word query - check if all words match
    let matchedWords = 0;
    for (const queryWord of queryWords) {
      const hasMatch = itemWords.some(itemWord => 
        itemWord === queryWord || 
        itemWord.startsWith(queryWord) ||
        (queryWord.length > 3 && itemWord.includes(queryWord))
      );
      if (hasMatch) matchedWords++;
    }
    
    // All words must match for multi-word queries
    if (matchedWords === queryWords.length) {
      return 0.6 + (matchedWords / queryWords.length) * 0.3;
    }
    return 0; // Not all words matched
  }
  
  // Single word - use character similarity
  return 0;
}

/**
 * Fuzzy search configuration optimized for folder names
 * Prioritizes exact matches and handles typos/misspellings
 */
function getFuseOptions<T extends SearchableItem>(query: string) {
  const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0);
  const isMultiWord = queryWords.length > 1;
  
  return {
    keys: ["name"],
    threshold: isMultiWord ? 0.3 : 0.4, // Stricter for multi-word queries
    distance: 50, // Reduced distance for better precision
    minMatchCharLength: 2,
    includeScore: true,
    ignoreLocation: false, // Consider location for better relevance
    findAllMatches: true,
    shouldSort: true,
    // Weight exact matches more heavily
    getFn: (obj: T, _path: string | string[]) => {
      return obj.name;
    },
  };
}

/**
 * Perform fuzzy search on a list of items
 * @param items - Array of items to search through
 * @param query - Search query string
 * @returns Array of items sorted by relevance (exact matches first)
 */
export function fuzzySearch<T extends SearchableItem>(
  items: T[],
  query: string
): T[] {
  if (!query || !query.trim()) {
    return items;
  }

  const trimmedQuery = query.trim();
  const trimmedQueryLower = trimmedQuery.toLowerCase();
  const queryWords = trimmedQueryLower.split(/\s+/).filter(w => w.length > 0);
  const isMultiWord = queryWords.length > 1;

  // If query is very short, use simple matching
  if (trimmedQuery.length < 2) {
    return items.filter((item) =>
      item.name.toLowerCase().includes(trimmedQueryLower)
    );
  }

  // For multi-word queries, first filter by word matching
  let candidateItems = items;
  if (isMultiWord) {
    // Pre-filter: all words must be present in some form
    candidateItems = items.filter((item) => allWordsMatch(queryWords, item.name));
    
    // If no candidates after word filtering, return empty
    if (candidateItems.length === 0) {
      return [];
    }
  }

  // Create Fuse instance with query-specific options
  const fuseOptions = getFuseOptions<T>(trimmedQuery);
  const fuse = new Fuse<T>(candidateItems, fuseOptions);

  // Perform search
  const results = fuse.search(trimmedQuery);

  // Separate matches by quality
  const exactMatches: T[] = [];
  const startsWithMatches: T[] = [];
  const containsMatches: T[] = [];
  const fuzzyMatches: Array<{ item: T; score: number; similarity: number }> = [];

  results.forEach((result) => {
    const item = result.item;
    const score = result.score || 1;
    const itemNameLower = item.name.toLowerCase();

    // Calculate word similarity
    const wordSimilarity = calculateWordSimilarity(trimmedQuery, item.name);

    // Exact match (case-insensitive) - highest priority
    if (itemNameLower === trimmedQueryLower) {
      exactMatches.push(item);
    }
    // Starts with query - high priority
    else if (itemNameLower.startsWith(trimmedQueryLower)) {
      startsWithMatches.push(item);
    }
    // Contains query - medium priority
    else if (itemNameLower.includes(trimmedQueryLower)) {
      containsMatches.push(item);
    }
    // Fuzzy match - only include if score is good AND word similarity is reasonable
    else if (score !== undefined && score < 0.5 && wordSimilarity > 0) {
      // For multi-word, require all words to match (already filtered above)
      // For single-word, allow fuzzy matching with good score
      if (!isMultiWord || wordSimilarity >= 0.6) {
        fuzzyMatches.push({ item, score, similarity: wordSimilarity });
      }
    }
  });

  // Sort fuzzy matches by score and similarity (lower score + higher similarity = better)
  fuzzyMatches.sort((a, b) => {
    const scoreDiff = (a.score || 1) - (b.score || 1);
    if (Math.abs(scoreDiff) > 0.1) {
      return scoreDiff;
    }
    return (b.similarity || 0) - (a.similarity || 0);
  });

  // Combine: exact matches first, then starts-with, then contains, then fuzzy (sorted)
  return [
    ...exactMatches,
    ...startsWithMatches,
    ...containsMatches,
    ...fuzzyMatches.map((fm) => fm.item),
  ];
}

/**
 * Filter items by parentId and apply fuzzy search
 * @param items - Array of items
 * @param query - Search query
 * @param parentId - Optional parent ID to filter by (null for root folders)
 * @returns Filtered and fuzzy-searched items
 */
export function fuzzySearchFolders<T extends SearchableItem>(
  items: T[],
  query: string,
  parentId: number | null = null
): T[] {
  // First filter by parentId
  const filteredByParent = items.filter(
    (item) => (item.parentId ?? null) === parentId
  );

  // Then apply fuzzy search
  return fuzzySearch(filteredByParent, query);
}

