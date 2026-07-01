/**
 * shell/js/charts.js — Chart.js lazy loader + graph renderer.
 *
 * Lazy-loads Chart.js from CDN on first graph render,
 * then creates Chart instances for every canvas in the DOM.
 * Properly awaits Chart.js load before rendering so cmdCat
 * doesn't finish before charts are drawn.
 */

let chartJsReady = false;
const pendingGraphs = [];

/**
 * Ensure Chart.js is loaded, then render any pending graphs.
 * @returns {Promise<void>}
 */
async function ensureChartJs() {
  if (chartJsReady) return;

  if (typeof Chart !== 'undefined') {
    chartJsReady = true;
    return;
  }

  chartJsReady = true; // prevent double-load

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4';
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(script);
  });
}

/**
 * Lazy-load Chart.js, then render all provided graphs.
 * @param {Array} graphs - Array of graph configs from content
 */
export async function initGraphs(graphs) {
  if (!graphs || graphs.length === 0) return;
  pendingGraphs.push(...graphs);
  await ensureChartJs();
  renderAll();
}

/**
 * Render all collected graphs.
 */
function renderAll() {
  const graphs = pendingGraphs;
  pendingGraphs.length = 0;

  for (const graph of graphs) {
    const canvas = document.querySelector(`[data-graph-id="${graph.id}"]`);
    if (!canvas) continue;

    try {
      const ctx = canvas.getContext('2d');

      // Content has labels/datasets at root; Chart.js expects them under data.{}
      const config = {
        type: graph.type || 'line',
        data: {
          labels: graph.labels || [],
          datasets: graph.datasets || []
        },
        options: graph.options || {}
      };

      if (graph.title) {
        config.options.title = { display: true, text: graph.title };
      }

      new Chart(ctx, config);
    } catch (e) {
      console.error('Failed to render graph', graph.id, ':', e);
    }
  }
}
