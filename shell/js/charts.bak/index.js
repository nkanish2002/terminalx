/**
 * shell/js/charts.bak/index.js — Chart.js integration for TerminalX.
 * 
 * Provides graph rendering functionality with sample data.
 */

// Chart.js lazy loader
let chartJsLoaded = false;

/**
 * Load Chart.js from CDN if not already loaded.
 */
async function loadChartJs() {
  if (chartJsLoaded || typeof Chart !== 'undefined') {
    return true;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => {
      chartJsLoaded = true;
      resolve(true);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Chart.js'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Render a graph canvas with sample data.
 * @param {string} canvasId - ID of the canvas element
 * @param {object} config - Chart configuration
 */
export async function renderGraph(canvasId, config) {
  try {
    await loadChartJs();
    
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      throw new Error(`Canvas element not found: ${canvasId}`);
    }
    
    // Generate sample data if not provided
    const data = config.data || generateSampleData(config.type || 'bar');
    
    // Create chart
    new Chart(canvas.getContext('2d'), {
      type: config.type || 'bar',
      data: data,
      options: config.options || {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  } catch (err) {
    addOutputLine(`Graph render error: ${err.message}`, 'error');
  }
}

/**
 * Generate sample data for different chart types.
 */
function generateSampleData(type) {
  const now = new Date();
  
  switch (type) {
    case 'line':
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Activity',
          data: [12, 19, 3, 5, 2, 3, 10],
          borderColor: 'rgb(0, 255, 0)',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          tension: 0.4
        }]
      };
    
    case 'bar':
      return {
        labels: ['A', 'B', 'C', 'D', 'E'],
        datasets: [{
          label: 'Values',
          data: [5, 10, 3, 8, 2],
          backgroundColor: [
            'rgba(0, 255, 0, 0.5)',
            'rgba(0, 255, 0, 0.4)',
            'rgba(0, 255, 0, 0.3)',
            'rgba(0, 255, 0, 0.2)',
            'rgba(0, 255, 0, 0.1)'
          ]
        }]
      };
    
    case 'pie':
      return {
        labels: ['Category 1', 'Category 2', 'Category 3', 'Category 4'],
        datasets: [{
          data: [30, 25, 20, 25],
          backgroundColor: [
            'rgba(0, 255, 0, 0.7)',
            'rgba(0, 255, 0, 0.5)',
            'rgba(0, 255, 0, 0.3)',
            'rgba(0, 255, 0, 0.1)'
          ]
        }]
      };
    
    default:
      return generateSampleData('bar');
  }
}

/**
 * Render all graphs in the document.
 */
export async function renderAllGraphs() {
  const graphCanvases = document.querySelectorAll('[data-graph]');
  
  for (const canvas of graphCanvases) {
    const type = canvas.getAttribute('data-graph') || 'bar';
    await renderGraph(canvas.id, { type });
  }
}
