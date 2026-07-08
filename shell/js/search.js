/**
 * shell/js/search.js — Client-side search command.
 * 
 * Loads search-index.json, scores results by section, renders grouped results
 * with highlighted snippets. Clicking a section opens the file and scrolls to it.
 */

const SNIPPET_CHARS = 160;

/**
 * Tokenize a query into individual terms.
 */
function tokenize(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Score a string against query tokens. Title/heading matches get higher weight.
 */
function scoreText(text, query, isHeading = false) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;

  const lower = text.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (lower === token) {
      score += isHeading ? 15 : 10;
    } else if (lower.includes(token)) {
      score += isHeading ? 8 : 1;
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

  // Find earliest matching position across all tokens
  let bestPos = -1;
  for (const token of tokens) {
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
  if (start > 0) snippet = '\u2026' + snippet;
  if (end < text.length) snippet = snippet + '\u2026';

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
 * Displays results grouped by file, with clickable sections.
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
    addOutputLine('Error: ' + err.message, 'error');
    return;
  }

  // Score each file and its sections
  const fileResults = [];

  for (const item of searchIndex) {
    const tokens = tokenize(query);
    const titleScore = scoreText(item.title, query, true);
    const textScore = scoreText(item.text, query);
    const fileScore = titleScore + textScore;

    // Score individual sections
    const matchedSections = [];
    if (item.sections) {
      for (const section of item.sections) {
        const headingScore = scoreText(section.heading, query, true);
        const sectionTextScore = section.text ? scoreText(section.text, query) : 0;
        const sectionScore = headingScore + sectionTextScore;

        if (sectionScore > 0) {
          matchedSections.push({
            id: section.id,
            heading: section.heading,
            score: sectionScore,
            text: section.text || '',
          });
        }
      }
    }

    // Include file if it has any score (title, text, or sections)
    if (fileScore > 0 || matchedSections.length > 0) {
      fileResults.push({
        path: item.path,
        title: item.title,
        score: Math.max(fileScore, ...matchedSections.map(s => s.score)),
        sections: matchedSections.sort((a, b) => b.score - a.score),
      });
    }
  }

  // Sort files by best score
  fileResults.sort((a, b) => b.score - a.score);

  if (fileResults.length === 0) {
    addOutputLine('No results found', 'info');
    return;
  }

  addOutputLine(
    'Found ' + fileResults.length + ' file(s) for "' +
    '<span style="color:var(--cyan)">' + escapeHtml(query) + '</span>"' + ':'
  );

  const output = document.getElementById('output');

  for (const file of fileResults) {
    // File header row
    const fileRow = document.createElement('div');
    fileRow.className = 'output-line search-result';
    fileRow.style.cursor = 'pointer';

    const fileTitle = document.createElement('span');
    fileTitle.className = 'search-file-title';
    fileTitle.innerHTML = escapeHtml(file.title);
    fileRow.appendChild(fileTitle);

    const filePath = document.createElement('span');
    filePath.className = 'search-file-path';
    filePath.textContent = file.path;
    fileRow.appendChild(filePath);

    // Click file header to open file
    fileRow.addEventListener('click', () => {
      executeCommand('open ' + file.path);
    });

    output.appendChild(fileRow);

    // Section rows
    for (const section of file.sections) {
      const sectionRow = document.createElement('div');
      sectionRow.className = 'output-line search-section';
      sectionRow.style.cursor = 'pointer';

      const sectionHeading = document.createElement('span');
      sectionHeading.className = 'search-section-heading';
      sectionHeading.innerHTML = '# ' + escapeHtml(section.heading);
      sectionRow.appendChild(sectionHeading);

      const snippet = buildSnippet(section.text, query);
      const sectionSnippet = document.createElement('span');
      sectionSnippet.className = 'search-section-snippet';
      sectionSnippet.innerHTML = snippet;
      sectionRow.appendChild(sectionSnippet);

      // Click section to open file at that section
      sectionRow.addEventListener('click', () => {
        executeCommand('open ' + file.path + '@' + section.id);
      });

      output.appendChild(sectionRow);
    }
  }

  // Scroll to show results (respect user scroll intent)
  if (window.getShouldAutoScroll && window.getShouldAutoScroll()) {
    output.scrollTop = output.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
