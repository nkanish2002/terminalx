/**
 * build/graph.js — Extract ```graph``` fences from markdown content.
 * 
 * Strips each graph fence, parses JSON → config, substitutes a plain-text
 * sentinel token (@@GRAPH:<id>@@) where the fence was. Returns cleaned
 * content and array of graph configs.
 */

const EXTRACT_RE = /```graph\n([\s\S]*?)\n```/g;

/**
 * Extract graph fences from content.
 * @param {string} content - Raw markdown text
 * @returns {{ cleanedContent: string, graphs: Array<Object> }}
 */
export function extractGraphs(content) {
  const graphs = [];
  let counter = 0;
  
  const cleaned = content.replace(EXTRACT_RE, (match, jsonStr) => {
    try {
      const graphConfig = JSON.parse(jsonStr);
      const id = `g_${(counter++).toString(16)}`;
      graphs.push({ id, ...graphConfig });
      return `@@GRAPH:${id}@@`;
    } catch (err) {
      console.warn(`Warning: Failed to parse graph JSON: ${err.message}`);
      return match;
    }
  });
  
  return { cleanedContent: cleaned, graphs };
}
