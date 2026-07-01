/**
 * shell/js/charts.js — Chart.js lazy loader + graph instantiation.
 * 
 * Lazy-loads Chart.js from CDN on first use, then instantiates graphs.
 * Handles canvas reuse (destroying old chart before re-rendering).
 * Waits for Chart.js to be fully loaded before rendering.
 */

// Track whether Chart.js is loaded
let chartJsLoaded = false;

// Track active charts to avoid re-initialization
const activeCharts = new Map();

/**
 * Wait for Chart.js to be fully loaded.
 * @returns {Promise} Resolves when Chart.js is available
 */
function waitForChartJS() {
  return new Promise((resolve) => {
    if (typeof Chart !== 'undefined') {
      resolve();
    } else {
      // Poll for Chart.js to load
      const check = () => {
        if (typeof Chart !== 'undefined') {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    }
  });
}

/**
 * Initialize graph canvases (lazy-load Chart.js once).
 * @param {Array} graphs - Array of graph configs from content
 */
export async function initGraphs(graphs) {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    // Lazy-load Chart.js from CDN
    if (!chartJsLoaded) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = async () => {
        chartJsLoaded = true;
        // Wait for Chart.js to be fully initialized
        await waitForChartJS();
        renderGraphs(graphs);
      };
      script.onerror = () => {
        // Avoid ReferenceError if addOutputLine not available yet
        if (typeof addOutputLine === 'function') {
          addOutputLine('Error: Failed to load Chart.js', 'error');
        }
        // Clean up failed script tag to prevent accumulation
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
      document.head.appendChild(script);
    }
  } else {
    chartJsLoaded = true;
    renderGraphs(graphs);
  }
}

/**
 * Render all graph canvases.
 * @param {Array} graphs - Array of graph configs
 */
async function renderGraphs(graphs) {
  // Wait for Chart.js to be fully available
  await waitForChartJS();
  
  for (const graph of graphs) {
    const canvas = document.querySelector(`[data-graph-id="${graph.id}"]`);
    if (canvas) {
      // Destroy existing chart on this canvas if present
      if (activeCharts.has(canvas)) {
        activeCharts.get(canvas).destroy();
        activeCharts.delete(canvas);
      }
      
      try {
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, graph);
        activeCharts.set(canvas, chart);
      } catch (e) {
        console.error('Failed to create chart:', e);
      }
    }
  }
}
