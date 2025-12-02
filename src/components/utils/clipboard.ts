/**
 * Safely copy text to clipboard with fallback support
 * Handles permission errors gracefully
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    console.warn('No text provided to copy');
    return false;
  }

  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err);
      // Fall through to fallback method
    }
  }

  // Fallback method using execCommand
  return fallbackCopyToClipboard(text);
}

/**
 * Fallback clipboard copy method using deprecated execCommand
 * Works in more browser contexts but requires DOM manipulation
 */
function fallbackCopyToClipboard(text: string): boolean {
  try {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it invisible but still accessible
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // Select and copy the text
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}
