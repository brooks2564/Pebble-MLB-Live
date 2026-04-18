// Patch pebble-clay dist.zip to support 'flint' (Pebble 2 Duo).
// Flint is hardware-identical to diorite — we add it as a copy.
// The Pebble SDK extracts dist.zip at build time, so we must patch the zip itself.
var cp   = require('child_process');
var path = require('path');
var fs   = require('fs');
var os   = require('os');

var distZip = path.join(__dirname, '..', 'node_modules', 'pebble-clay', 'dist.zip');

if (!fs.existsSync(distZip)) {
  console.log('pebble-clay dist.zip not found — skipping flint patch');
  process.exit(0);
}

// Check if already patched
var listing = cp.execSync('unzip -l "' + distZip + '"').toString();
if (listing.indexOf('flint') !== -1) {
  console.log('pebble-clay: flint already in dist.zip');
  process.exit(0);
}

var tmpDir = path.join(os.tmpdir(), 'clay-flint-' + process.pid);
try {
  cp.execSync('mkdir -p "' + tmpDir + '"');
  cp.execSync('unzip -q "' + distZip + '" -d "' + tmpDir + '"');

  var incDiorite = path.join(tmpDir, 'include', 'pebble-clay', 'diorite');
  var incFlint   = path.join(tmpDir, 'include', 'pebble-clay', 'flint');
  var binDiorite = path.join(tmpDir, 'binaries', 'diorite');
  var binFlint   = path.join(tmpDir, 'binaries', 'flint');

  if (!fs.existsSync(incFlint))  cp.execSync('cp -r "' + incDiorite + '" "' + incFlint + '"');
  if (!fs.existsSync(binFlint))  cp.execSync('cp -r "' + binDiorite + '" "' + binFlint + '"');

  // Repack into original zip path
  cp.execSync('cd "' + tmpDir + '" && zip -qr "' + distZip + '" .');
  console.log('pebble-clay: patched dist.zip with flint platform support');
} catch (e) {
  console.error('pebble-clay flint patch failed: ' + e.message);
  process.exit(1);
} finally {
  try { cp.execSync('rm -rf "' + tmpDir + '"'); } catch (e) {}
}
