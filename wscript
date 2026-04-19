import os.path
import zipfile
import shutil
import tempfile

top = '.'
out = 'build'

def _patch_clay_flint():
    """Add flint to pebble-clay's dist.zip (flint is hardware-identical to diorite).
    Runs at configure time so the patched zip is ready before the build unpacks it."""
    dist_zip = os.path.join('node_modules', 'pebble-clay', 'dist.zip')
    if not os.path.exists(dist_zip):
        return
    with zipfile.ZipFile(dist_zip, 'r') as z:
        if any('flint' in n for n in z.namelist()):
            return  # already patched
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
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

def options(ctx):
    ctx.load('pebble_sdk')

def configure(ctx):
    _patch_clay_flint()
    ctx.load('pebble_sdk')

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
