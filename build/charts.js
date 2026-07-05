/**
 * build/charts.js — Graph rendering utility.
 * 
 * Generates sample chart data and HTML for documentation.
 */

/**
 * Generate sample graph HTML.
 * @param {string} type - Chart type (bar, line, pie)
 * @param {string} id - Canvas ID
 * @returns {string} HTML for graph
 */
function generateGraphHTML(type, id) {
  return `<div class="graph-container">
  <h4>Sample ${type.charAt(0).toUpperCase() + type.slice(1)} Chart</h4>
  <canvas id="${id}" data-graph="${type}"></canvas>
</div>`;
}

/**
 * Generate documentation for graph commands.
 * @returns {string} Documentation HTML
 */
function generateGraphDocs() {
  return `
<div class="graph-docs">
  <h3>Graph Commands</h3>
  <p>The TerminalX supports various graph types for data visualization:</p>
  
  <h4>Available Chart Types</h4>
  <ul>
    <li><strong>bar</strong> - Bar charts for categorical data</li>
    <li><strong>line</strong> - Line charts for trend visualization</li>
    <li><strong>pie</strong> - Pie charts for proportional data</li>
  </ul>
  
  <h4>Usage</h4>
  <pre><code>
# Render a sample bar chart
cat /docs/graphs/bar.html

# Render a sample line chart
cat /docs/graphs/line.html

# Render a sample pie chart
cat /docs/graphs/pie.html
  </code></pre>
</div>
`;
}

module.exports = {
  generateGraphHTML,
  generateGraphDocs
};
