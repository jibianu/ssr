/**
 * SSR Performance Monitoring Dashboard
 * 
 * Real-time dashboard for monitoring SSR performance metrics
 * 
 * Usage:
 *   node scripts/monitoring-dashboard.js
 *   MONITOR_URL=http://localhost:4000 node scripts/monitoring-dashboard.js
 */

const http = require('http');

const MONITOR_URL = process.env.MONITOR_URL || 'http://localhost:4000';
const UPDATE_INTERVAL = 5000; // 5 seconds

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function displayDashboard() {
  try {
    const stats = await fetchJSON(`${MONITOR_URL}/performance-stats`);
    const perf = stats.performance;
    const sys = stats.system;
    const timeRangeMinutes = (Date.now() - perf.timeRange.start) / 60000;
    
    // Clear screen (works on most terminals)
    process.stdout.write('\x1Bc');
    
    console.log('═'.repeat(80));
    console.log('🚀 SSR PERFORMANCE MONITORING DASHBOARD'.padEnd(80));
    console.log('═'.repeat(80));
    console.log(`\n📊 Requests (last ${timeRangeMinutes.toFixed(1)} minutes):`);
    console.log(`   Total: ${perf.totalRequests.toLocaleString()}`);
    
    if (perf.totalRequests > 0) {
      const hitRate = (perf.cacheHits / perf.totalRequests * 100);
      console.log(`   Cache Hits: ${perf.cacheHits.toLocaleString()} (${hitRate.toFixed(1)}%)`);
      console.log(`   Cache Misses: ${perf.cacheMisses.toLocaleString()} (${(100 - hitRate).toFixed(1)}%)`);
    } else {
      console.log('   Cache Hits: 0 (0%)');
      console.log('   Cache Misses: 0 (0%)');
    }
    
    console.log(`\n⏱️  Performance Metrics:`);
    console.log(`   Avg Render Time: ${formatDuration(perf.avgRenderTime)}`);
    console.log(`   P95 Render Time: ${formatDuration(perf.p95RenderTime)}`);
    console.log(`   P99 Render Time: ${formatDuration(perf.p99RenderTime)}`);
    console.log(`   Avg Total Time: ${formatDuration(perf.avgTotalTime)}`);
    console.log(`   P95 Total Time: ${formatDuration(perf.p95TotalTime)}`);
    console.log(`   P99 Total Time: ${formatDuration(perf.p99TotalTime)}`);
    
    console.log(`\n💾 Memory Usage:`);
    console.log(`   Avg Memory Delta: ${formatBytes(perf.avgMemoryDelta)}`);
    console.log(`   Max Memory Delta: ${formatBytes(perf.maxMemoryDelta)}`);
    console.log(`   Node Heap: ${formatBytes(sys.nodeMemory.heapUsed)} / ${formatBytes(sys.nodeMemory.heapTotal)}`);
    console.log(`   Node RSS: ${formatBytes(sys.nodeMemory.rss)}`);
    console.log(`   System Memory: ${formatBytes(sys.memory.used)} / ${formatBytes(sys.memory.total)} (${((sys.memory.used / sys.memory.total) * 100).toFixed(1)}% used)`);
    
    console.log(`\n🖥️  System Information:`);
    console.log(`   CPU Cores: ${sys.cpu}`);
    console.log(`   Load Average: ${sys.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
    console.log(`   Uptime: ${formatUptime(sys.uptime)}`);
    
    console.log(`\n🕐 Last Updated: ${new Date(stats.timestamp).toLocaleString()}`);
    console.log('═'.repeat(80));
    console.log('Press Ctrl+C to exit');
    
  } catch (error) {
    console.error('❌ Error fetching performance stats:', error.message);
    console.log('\n⚠️  Make sure SSR server is running:');
    console.log('   pnpm run serve:ssr');
    console.log('\nOr set custom URL:');
    console.log('   MONITOR_URL=http://localhost:4000 node scripts/monitoring-dashboard.js');
  }
}

// Display dashboard immediately
displayDashboard();

// Update every N seconds
setInterval(displayDashboard, UPDATE_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Dashboard stopped');
  process.exit(0);
});

