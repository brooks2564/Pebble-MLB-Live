import os.path
import zipfile
import shutil
import tempfile

top = '.'
out = 'build'

def _copy_diorite_to_flint(base_dir):
    """Copy diorite → flint inside base_dir for both include and binaries subtrees."""
    for sub in ('include/pebble-clay', 'binaries'):
        src = os.path.join(base_dir, sub, 'diorite')
        dst = os.path.join(base_dir, sub, 'flint')
        if os.path.isdir(src) and not os.path.isdir(dst):
            shutil.copytree(src, dst)
            print('pebble-clay flint patch: copied {} -> {}'.format(src, dst))

def _patch_clay_flint_zip(project_root):
    """Patch dist.zip so the re-extracted dist/ will contain flint dirs."""
    dist_zip = os.path.join(project_root, 'node_modules', 'pebble-clay', 'dist.zip')
    print('pebble-clay flint: checking zip at {}'.format(dist_zip))
    if not os.path.exists(dist_zip):
        print('pebble-clay flint: dist.zip not found, skipping')
        return
    with zipfile.ZipFile(dist_zip, 'r') as z:
        names = z.namelist()
    if any('flint' in n for n in names):
        print('pebble-clay flint: zip already patched')
        return
    tmpdir = tempfile.mkdtemp(prefix='clay-flint-')
    try:
        with zipfile.ZipFile(dist_zip, 'r') as z:
            z.extractall(tmpdir)
        _copy_diorite_to_flint(tmpdir)
        with zipfile.ZipFile(dist_zip, 'w', zipfile.ZIP_DEFLATED) as z:
            for root, dirs, files in os.walk(tmpdir):
                for f in files:
                    full = os.path.join(root, f)
                    arc  = os.path.relpath(full, tmpdir)
                    z.write(full, arc)
        print('pebble-clay flint: zip patched successfully')
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

def _patch_clay_flint_dist(project_root):
    """Patch the already-extracted dist/ directory (after ctx.load unpacks the zip)."""
    dist_dir = os.path.join(project_root, 'node_modules', 'pebble-clay', 'dist')
    print('pebble-clay flint: checking dist dir at {}'.format(dist_dir))
    if not os.path.isdir(dist_dir):
        print('pebble-clay flint: dist dir not found, skipping')
        return
    _copy_diorite_to_flint(dist_dir)
    print('pebble-clay flint: dist dir patch complete')

def options(ctx):
    ctx.load('pebble_sdk')

def configure(ctx):
    root = ctx.path.abspath()
    _patch_clay_flint_zip(root)
    ctx.load('pebble_sdk')
    _patch_clay_flint_dist(root)

def build(ctx):
    ctx.load('pebble_sdk')
    build_worker = os.path.exists('worker_src')
    binaries = []
    cached_env = ctx.env
    for platform in ctx.env.TARGET_PLATFORMS:
        ctx.env = ctx.all_envs[platform]
        ctx.set_group(ctx.env.PLATFORM_NAME)
        app_elf = '{}/pebble-app.elf'.format(ctx.env.BUILD_DIR)
        ctx.pbl_build(source=ctx.path.ant_glob('src/c/**/*.c'),
                      target=app_elf, bin_type='app')
        if build_worker:
            worker_elf = '{}/pebble-worker.elf'.format(ctx.env.BUILD_DIR)
            binaries.append({'platform': platform, 'app_elf': app_elf,
                             'worker_elf': worker_elf})
            ctx.pbl_build(source=ctx.path.ant_glob('worker_src/c/**/*.c'),
                          target=worker_elf, bin_type='worker')
        else:
            binaries.append({'platform': platform, 'app_elf': app_elf})
    ctx.env = cached_env
    ctx.set_group('bundle')
    ctx.pbl_bundle(binaries=binaries,
                   js=ctx.path.ant_glob(['src/pkjs/**/*.js',
                                         'src/pkjs/**/*.json']),
                   js_entry_file='src/pkjs/index.js')
