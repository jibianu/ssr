/**
 * SSR Stability Checker
 * 
 * Scans codebase for common SSR stability issues:
 * - Direct window/document access without platform checks
 * - Inline scripts in HTML templates
 * - Unhandled promises
 * - Missing subscription cleanup
 * 
 * Usage:
 *   pnpm run check:stability
 *   npx ts-node scripts/check-ssr-stability.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Issue {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium';
  type: 'window-access' | 'document-access' | 'inline-script' | 'unhandled-promise' | 'missing-cleanup';
  message: string;
  suggestion: string;
}

const issues: Issue[] = [];
const scannedFiles: string[] = [];

/**
 * Recursively scan directory for TypeScript and HTML files
 */
function scanDirectory(dir: string, extensions: string[] = ['.ts', '.html']): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      // Skip node_modules, dist, and hidden directories
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') {
        continue;
      }
      
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...scanDirectory(fullPath, extensions));
      } else if (stat.isFile()) {
        const ext = entry.substring(entry.lastIndexOf('.'));
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return files;
}

/**
 * Check TypeScript file for SSR issues
 */
function checkTypeScriptFile(filePath: string, content: string): void {
  const lines = content.split('\n');
  const fileName = filePath.split(/[/\\]/).pop() || '';
  
  // Skip test files
  if (fileName.includes('.spec.') || fileName.includes('.test.')) {
    return;
  }
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    
    // Check for direct window access without isBrowser check
    if (/window\.(sessionStorage|localStorage|innerWidth|innerHeight|location|scroll)/.test(trimmed)) {
      // Check if previous lines have platform check
      const context = lines.slice(Math.max(0, index - 10), index + 1).join('\n');
      if (!/isPlatformBrowser|isBrowser|PLATFORM_ID/.test(context)) {
        issues.push({
          file: filePath,
          line: lineNum,
          severity: 'critical',
          type: 'window-access',
          message: `Direct window access without platform check: ${trimmed.substring(0, 80)}`,
          suggestion: 'Use isPlatformBrowser() check or move to afterNextRender()'
        });
      }
    }
    
    // Check for direct document access
    if (/document\.(getElementById|querySelector|createElement|cookie)/.test(trimmed)) {
      const context = lines.slice(Math.max(0, index - 10), index + 1).join('\n');
      if (!/isPlatformBrowser|isBrowser|PLATFORM_ID|DOCUMENT.*Inject/.test(context)) {
        issues.push({
          file: filePath,
          line: lineNum,
          severity: 'critical',
          type: 'document-access',
          message: `Direct document access without platform check: ${trimmed.substring(0, 80)}`,
          suggestion: 'Use @Inject(DOCUMENT) or isPlatformBrowser() check'
        });
      }
    }
    
    // Check for unhandled promises (basic check)
    if (/\.then\(/.test(trimmed) && !/\.catch\(/.test(content.substring(content.indexOf(trimmed)))) {
      // Check if there's a catch in the next 5 lines
      const nextLines = lines.slice(index, Math.min(lines.length, index + 5)).join('\n');
      if (!/\.catch\(|try\s*\{/.test(nextLines)) {
        issues.push({
          file: filePath,
          line: lineNum,
          severity: 'medium',
          type: 'unhandled-promise',
          message: `Promise without catch handler: ${trimmed.substring(0, 80)}`,
          suggestion: 'Add .catch() handler or wrap in try-catch'
        });
      }
    }
    
    // Check for subscribe without OnDestroy
    if (/\.subscribe\(/.test(trimmed)) {
      // Check if component has OnDestroy
      const componentContent = content.substring(0, content.indexOf(trimmed));
      if (!/implements.*OnDestroy|extends.*BaseComponent/.test(componentContent)) {
        // Check if using async pipe (will be in template)
        if (!/async\s*pipe|items\$/.test(content)) {
          issues.push({
            file: filePath,
            line: lineNum,
            severity: 'high',
            type: 'missing-cleanup',
            message: `Subscription without OnDestroy or async pipe: ${trimmed.substring(0, 80)}`,
            suggestion: 'Add OnDestroy lifecycle hook or use async pipe'
          });
        }
      }
    }
  });
}

/**
 * Check HTML file for inline scripts
 */
function checkHtmlFile(filePath: string, content: string): void {
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for inline event handlers with window/document
    if (/on(load|submit|click)=["'][^"']*window\./.test(line) || 
        /on(load|submit|click)=["'][^"']*document\./.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        severity: 'high',
        type: 'inline-script',
        message: `Inline script using window/document: ${line.substring(0, 100)}`,
        suggestion: 'Move logic to TypeScript component and use Angular event bindings'
      });
    }
  });
}

/**
 * Main scanning function
 */
function scanCodebase(srcDir: string = 'src/app'): void {
  console.log('🔍 Scanning codebase for SSR stability issues...\n');
  
  const tsFiles = scanDirectory(srcDir, ['.ts']);
  const htmlFiles = scanDirectory(srcDir, ['.html']);
  
  console.log(`📁 Found ${tsFiles.length} TypeScript files`);
  console.log(`📁 Found ${htmlFiles.length} HTML template files\n`);
  
  // Scan TypeScript files
  tsFiles.forEach(file => {
    try {
      const content = readFileSync(file, 'utf-8');
      scannedFiles.push(file);
      checkTypeScriptFile(file, content);
    } catch (error) {
      console.warn(`⚠️  Could not read ${file}`);
    }
  });
  
  // Scan HTML files
  htmlFiles.forEach(file => {
    try {
      const content = readFileSync(file, 'utf-8');
      scannedFiles.push(file);
      checkHtmlFile(file, content);
    } catch (error) {
      console.warn(`⚠️  Could not read ${file}`);
    }
  });
}

/**
 * Print results
 */
function printResults(): void {
  console.log('='.repeat(80));
  console.log('SSR STABILITY CHECK RESULTS');
  console.log('='.repeat(80));
  console.log(`\n📊 Scanned ${scannedFiles.length} files`);
  console.log(`🔴 Found ${issues.length} potential issues\n`);
  
  if (issues.length === 0) {
    console.log('✅ No SSR stability issues found!');
    return;
  }
  
  // Group by severity
  const critical = issues.filter(i => i.severity === 'critical');
  const high = issues.filter(i => i.severity === 'high');
  const medium = issues.filter(i => i.severity === 'medium');
  
  if (critical.length > 0) {
    console.log(`\n🔴 CRITICAL (${critical.length}):`);
    critical.forEach(issue => {
      console.log(`\n  ${issue.file}:${issue.line}`);
      console.log(`  Type: ${issue.type}`);
      console.log(`  ${issue.message}`);
      console.log(`  💡 Fix: ${issue.suggestion}`);
    });
  }
  
  if (high.length > 0) {
    console.log(`\n🟡 HIGH (${high.length}):`);
    high.forEach(issue => {
      console.log(`\n  ${issue.file}:${issue.line}`);
      console.log(`  Type: ${issue.type}`);
      console.log(`  ${issue.message}`);
      console.log(`  💡 Fix: ${issue.suggestion}`);
    });
  }
  
  if (medium.length > 0) {
    console.log(`\n🟠 MEDIUM (${medium.length}):`);
    medium.slice(0, 10).forEach(issue => { // Limit output
      console.log(`\n  ${issue.file}:${issue.line}`);
      console.log(`  Type: ${issue.type}`);
      console.log(`  ${issue.message}`);
      console.log(`  💡 Fix: ${issue.suggestion}`);
    });
    if (medium.length > 10) {
      console.log(`\n  ... and ${medium.length - 10} more medium priority issues`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n⚠️  Total Issues: ${issues.length}`);
  console.log(`   - Critical: ${critical.length}`);
  console.log(`   - High: ${high.length}`);
  console.log(`   - Medium: ${medium.length}`);
  console.log('\n');
}

// Run scan
try {
  scanCodebase();
  printResults();
  
  // Exit with error code if critical issues found
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  process.exit(criticalCount > 0 ? 1 : 0);
} catch (error) {
  console.error('❌ Error running stability check:', error);
  process.exit(1);
}

