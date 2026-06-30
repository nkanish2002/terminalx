/**
 * build/search.js — Build search index from content.
 * 
 * Generates search-index.json with {path, title, text} entries for client-side filtering.
 */

const fs = require('fs');
const path = require('path');

/**
 * Build search index from rendered content.
 * @param {object} config - Build configuration
 * @param {object} contentMap - Content map from build
 * @returns {object} Search index array
 */
function buildSearchIndex(config, contentMap) {
  const index = [];
  
  // Iterate through all content entries
  for (const [filePath, content] of Object.entries(contentMap)) {
    // Extract text from html (strip tags)
    const text = content.html
      .replace(/<[^>]*>/g, '')  // Remove HTML tags
      .replace(/&nbsp;/g, ' ')   // Replace non-breaking spaces
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
    
    // Skip empty entries
    if (!text) continue;
    
    // Add to index
    index.push({
      path: filePath,
      title: content.title || path.basename(filePath),
      text: text
    });
  }
  
  return index;
}

module.exports = { buildSearchIndex };
