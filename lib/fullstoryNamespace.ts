// Ensure FullStory namespace is set to avoid conflicts when FullStory script loads
// FullStory expects window._fs_namespace to be set before their snippet runs.
// We'll set a default if not present.

declare global {
  interface Window { _fs_namespace?: string; }
}

try {
  if (typeof window !== 'undefined') {
    if (!window._fs_namespace) {
      // default namespace used by FullStory is 'FS' often; set a safe default
      window._fs_namespace = 'FS';
    }
  }
} catch (e) {
  // ignore in non-browser environments
}
