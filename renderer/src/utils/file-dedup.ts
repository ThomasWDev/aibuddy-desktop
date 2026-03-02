/**
 * KAN-132 FIX: File attachment deduplication utilities.
 * Prevents duplicate file preview cards when the same file is selected multiple times.
 * 
 * Root cause: All file-add paths blindly appended [...prev, newFile] without checking
 * if a file with the same name already existed. Each file got a unique random ID,
 * so even the same file appeared as a separate card.
 */

interface HasName {
  name: string
}

/**
 * Returns true if a file with the same name already exists in the list.
 * Uses case-insensitive comparison for cross-platform compatibility.
 */
export function isDuplicateFile<T extends HasName>(existing: T[], newFileName: string): boolean {
  const normalized = newFileName.toLowerCase()
  return existing.some(f => f.name.toLowerCase() === normalized)
}

/**
 * Appends a file to the list only if no file with the same name already exists.
 * Returns the original array (same reference) if duplicate — React will skip re-render.
 */
export function appendIfNotDuplicate<T extends HasName>(existing: T[], newFile: T): T[] {
  if (isDuplicateFile(existing, newFile.name)) {
    return existing
  }
  return [...existing, newFile]
}
