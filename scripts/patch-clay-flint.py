"""Patch pebble-clay dist.zip to add 'flint' platform support (Pebble 2 Duo).
Flint is hardware-identical to diorite — we copy its entries into the zip.
The Pebble SDK extracts dist.zip at build time, so we patch the zip itself.
"""
import os, sys, shutil, tempfile, zipfile

dist_zip = os.path.join(os.path.dirname(__file__), '..', 'node_modules', 'pebble-clay', 'dist.zip')
dist_zip = os.path.normpath(dist_zip)

if not os.path.exists(dist_zip):
    print('pebble-clay dist.zip not found — skipping flint patch')
    sys.exit(0)

with zipfile.ZipFile(dist_zip, 'r') as z:
    names = z.namelist()

if any('flint' in n for n in names):
    print('pebble-clay: flint already in dist.zip')
    sys.exit(0)

tmpdir = tempfile.mkdtemp(prefix='clay-flint-')
try:
    with zipfile.ZipFile(dist_zip, 'r') as z:
        z.extractall(tmpdir)

    inc_src = os.path.join(tmpdir, 'include', 'pebble-clay', 'diorite')
    inc_dst = os.path.join(tmpdir, 'include', 'pebble-clay', 'flint')
    bin_src = os.path.join(tmpdir, 'binaries', 'diorite')
    bin_dst = os.path.join(tmpdir, 'binaries', 'flint')

    if not os.path.exists(inc_dst):
        shutil.copytree(inc_src, inc_dst)
    if not os.path.exists(bin_dst):
        shutil.copytree(bin_src, bin_dst)

    with zipfile.ZipFile(dist_zip, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(tmpdir):
            for f in files:
                full = os.path.join(root, f)
                arc  = os.path.relpath(full, tmpdir)
                z.write(full, arc)

    print('pebble-clay: patched dist.zip with flint platform support')
finally:
    shutil.rmtree(tmpdir, ignore_errors=True)
