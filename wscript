import os.path
import zipfile
import shutil
import tempfile

top = '.'
out = 'build'

def options(ctx):
    ctx.load('pebble_sdk')

def configure(ctx):
    root = ctx.path.abspath()

    # ── Step 1: patch dist.zip before ctx.load unpacks it ──────────────────
    dist_zip = os.path.join(root, 'node_modules', 'pebble-clay', 'dist.zip')
    ctx.msg('Clay flint zip', dist_zip)
    if not os.path.exists(dist_zip):
        ctx.msg('Clay flint zip', 'NOT FOUND – skipping zip patch')
    else:
        with zipfile.ZipFile(dist_zip, 'r') as z:
            already = any('flint' in n for n in z.namelist())
        if already:
            ctx.msg('Clay flint zip', 'already patched')
        else:
            tmpdir = tempfile.mkdtemp(prefix='clay-flint-')
            try:
                with zipfile.ZipFile(dist_zip, 'r') as z:
                    z.extractall(tmpdir)
                for sub in ('include/pebble-clay', 'binaries'):
                    src = os.path.join(tmpdir, sub, 'diorite')
                    dst = os.path.join(tmpdir, sub, 'flint')
                    if os.path.isdir(src) and not os.path.isdir(dst):
                        shutil.copytree(src, dst)
                with zipfile.ZipFile(dist_zip, 'w', zipfile.ZIP_DEFLATED) as zout:
                    for r, dirs, files in os.walk(tmpdir):
                        for f in files:
                            full = os.path.join(r, f)
                            arc  = os.path.relpath(full, tmpdir)
                            zout.write(full, arc)
                ctx.msg('Clay flint zip', 'patched OK')
            except Exception as e:
                ctx.msg('Clay flint zip', 'PATCH FAILED: {}'.format(e))
            finally:
                shutil.rmtree(tmpdir, ignore_errors=True)

    ctx.load('pebble_sdk')

    # ── Step 2: patch the extracted dist/ directory (belt-and-suspenders) ──
    dist_dir = os.path.join(root, 'node_modules', 'pebble-clay', 'dist')
    ctx.msg('Clay flint dist dir', dist_dir)
    if not os.path.isdir(dist_dir):
        ctx.msg('Clay flint dist dir', 'NOT FOUND – skipping dir patch')
    else:
        patched = []
        for sub in ('include/pebble-clay', 'binaries'):
            src = os.path.join(dist_dir, sub, 'diorite')
            dst = os.path.join(dist_dir, sub, 'flint')
            if os.path.isdir(src) and not os.path.isdir(dst):
                try:
                    shutil.copytree(src, dst)
                    patched.append(sub)
                except Exception as e:
                    ctx.msg('Clay flint dist dir', 'copy {} failed: {}'.format(sub, e))
        ctx.msg('Clay flint dist dir',
                'patched {}'.format(patched) if patched else 'already complete')

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
