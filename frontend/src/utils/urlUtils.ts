/**
 * Utility functions for URL handling and validation
 */

/**
 * Validates if a string is a valid URL and optionally adds 'http://' if missing
 * 
 * @param {string | undefined} url - The URL to validate
 * @param {boolean} addHttpIfMissing - Whether to add 'http://' if the protocol is missing
 * @returns {{ isValid: boolean, url: string }} Object containing validation result and processed URL
 */
export const validateUrl = (url: string | undefined, addHttpIfMissing: boolean = true): { isValid: boolean, url: string } => {
  // Return invalid if URL is undefined, null or empty
  if (!url || url.trim() === '') {
    return { isValid: false, url: '' };
  }

  let urlToCheck = url.trim();
  
  // If URL doesn't have a protocol and addHttpIfMissing is true, add http://
  if (addHttpIfMissing && !urlToCheck.match(/^[a-zA-Z]+:\/\//)) {
    urlToCheck = `http://${urlToCheck}`;
  }

  try {
    // Try to create a URL object to validate
    const urlObj = new URL(urlToCheck);
    
    // Check if URL has a valid hostname (at least one dot)
    if (!urlObj.hostname.includes('.')) {
      return { isValid: false, url };
    }
    
    return { isValid: true, url: urlToCheck };
  } catch (e) {
    return { isValid: false, url };
  }
}; 