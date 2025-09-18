// tools/release.js
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const semver = require('semver');

const ROOT = process.cwd();
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const args = process.argv.slice(2);
const levelArg = (args.find(a => a.startsWith('--level=')) || '').split('=')[1] || 'patch';
const skipGit  = args.includes('--no-git');
const preRel   = args.includes('--pre'); // если хочется принудительно поставить pre-release флаг (у нас он уже в build настроен)

function run(cmd, opts={}) {
  console.log(`$ ${cmd}`);
  cp.execSync(cmd, { stdio: 'inherit', ...opts });
}

function bumpVersion(level) {
  const next = semver.inc(pkg.version, level);
  if (!next) {
    console.error('✖ Не удалось инкрементировать версию.');
    process.exit(1);
  }
  // пусть правит npm, чтобы синхронизировался package-lock
  run(`npm version ${next} --no-git-tag-version`);
  return next;
}

function ensureToken() {
  if (!process.env.GH_TOKEN) {
    console.warn('⚠ GH_TOKEN не задан. Публикация на GitHub, скорее всего, упадёт.');
  }
}

(async () => {
  ensureToken();

  const nextVersion = bumpVersion(levelArg);
  console.log(`→ Версия поднята до ${nextVersion}`);

  // Подпись под новую версию
  run('node tools/sign.js');

  // Сборка и публикация
  run('npm run clean');
  run('npm run prep');

  // Публикуем всегда (electron-builder сам создаст релиз с тегом vX.Y.Z)
  run('electron-builder -w --publish always');

  // Гит (опционально)
  if (!skipGit) {
    try {
      run('git add -A');
      run(`git commit -m "chore(release): v${nextVersion}"`);
      run(`git tag v${nextVersion}`);
      run('git push');
      run('git push --tags');
    } catch (e) {
      console.warn('⚠ Git шаги пропущены/упали — продолжим.');
    }
  }

  console.log('\n✅ Готово! Проверь релиз на GitHub — он должен содержать installer (.exe), .blockmap и latest.yml.');
})();