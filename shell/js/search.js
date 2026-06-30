/**
 * shell/js/search.js — Client-side search command.
 * 
 * Loads search-index.json, scores results, renders with snippets and highlighting.
 * Clicking a result navigates to #/cat/<path>.
 */

const SNIPPET_CHARS = 160;

/**
 * Tokenize a query into individual terms.
 */
function tokenize(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Score a result: title matches get higher weight than text matches.
 */
function scoreResult(item, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  
  const titleLower = item.title.toLowerCase();
  const textLower = item.text.toLowerCase();
  let score = 0;
  
  for (const token of tokens) {
    // Title exact match
    if (titleLower === token) {
      score += 10;
    }
    // Title contains token
    else if (titleLower.includes(token)) {
      score += 5;
    }
    // Text contains token
    if (textLower.includes(token)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Build a snippet of matched-term context around the match.
 */
function buildSnippet(text, query) {
  const tokens = tokenize(query);
  const textLower = text.toLowerCase();
  
  // Find the first matching position
  let bestPos = textLower.indexOf(tokens[0]);
  for (const token of tokens.slice(1)) {
    const pos = textLower.indexOf(token);
    if (pos >= 0 && (bestPos < 0 || pos < bestPos)) {
      bestPos = pos;
    }
  }
  
  if (bestPos < 0) return text.slice(0, SNIPPET_CHARS);
  
  // Center the snippet around the match
  let start = Math.max(0, bestPos - SNIPPET_CHARS / 2);
  let end = Math.min(text.length, start + SNIPPET_CHARS);
  
  if (start > 0) start = text.lastIndexOf(' ', start) + 1;
  if (end < text.length) end = text.indexOf(' ', end);
  if (end < 0) end = text.length;
  
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet = snippet + '…';
  
  // Highlight matched terms
  for (const token of tokens) {
    const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
    snippet = snippet.replace(regex, '<mark class="search-highlight">$1</mark>');
  }
  
  return snippet;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search command implementation.
 * @param {string[]} args - Search query parts
 */
export async function cmdSearch(args) {
  if (!args.length) {
    addOutputLine('usage: search <query>', 'warning');
    return;
  }
  
  const query = args.join(' ').trim();
  
  // Fetch search index
  let searchIndex;
  try {
    const res = await fetch('./search-index.json');
    if (!res.ok) throw new Error('Failed to load search index');
    searchIndex = await res.json();
  } catch (err) {
    addOutputLine(`Error: ${err.message}`, 'error');
    return;
  }
  
  // Score and filter results
  const results = searchIndex
    .map(item => ({ item, score: scoreResult(item, query) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
  
  if (results.length === 0) {
    addOutputLine('No results found', 'info');
    return;
  }
  
  addOutputLine(`Found ${results.length} result(s) for "<span style="color:var(--cyan)">${escapeHtml(query)}</span>":`);
  
  for (const { item, score } of results) {
    const snippet = buildSnippet(item.text, query);
    // Make clickable — clicking runs "cat <path>"
    const line = document.createElement('div');
    line.className = 'output-line search-result';
    line.innerHTML = `<span style="color:var(--cyan);cursor:pointer" data-path="${escapeHtml(item.path)}">${escapeHtml(item.title)}</span> <span style="color:var(--gray)">(${item.path})</span>`;
    line.appendChild(document.createElement('br'));
    line.innerHTML += `<span style="color:var(--dim)">${snippet}</span>`;
    
    // Click to navigate
    line.querySelector('[data-path]').addEventListener('click', (e) => {
      e.stopPropagation();
      executeCommand(`cat ${item.path}`);
    });
    
    // Also make the path clickable
    const pathSpan = line.querySelector('span:last-of-type');
    if (pathSpan) {
      pathSpan.style.cursor = 'pointer';
      pathSpan.addEventListener('click', () => {
        executeCommand(`cat ${item.path}`);
      });
    }
    
    document.getElementById('output').appendChild(line);
    document.getElementById('output').scrollTop = document.getElementById('output').scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
