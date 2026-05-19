const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || __dirname);

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function backupOnce(filePath) {
  const backupPath = `${filePath}.bak`;
  if (!exists(backupPath)) fs.copyFileSync(filePath, backupPath);
}

function writeIfChanged(filePath, nextText) {
  const prevText = read(filePath);
  if (prevText === nextText) return false;
  backupOnce(filePath);
  fs.writeFileSync(filePath, nextText, 'utf8');
  return true;
}

function replaceAll(text, from, to) {
  return text.includes(from) ? text.split(from).join(to) : text;
}

function walkForProjects(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkForProjects(fullPath, results);
      continue;
    }
    if (entry.isFile() && entry.name === 'main.js') {
      const projectDir = path.dirname(fullPath);
      if (exists(path.join(projectDir, 'app', 'index.html'))) results.push(projectDir);
    }
  }
  return results;
}

function patchMainJs(filePath) {
  let text = read(filePath);

  if (!text.includes('app.disableHardwareAcceleration();')) {
    text = replaceAll(
      text,
      "require('@electron/remote/main').initialize();",
      "require('@electron/remote/main').initialize();\n\napp.disableHardwareAcceleration();"
    );
  }

  if (!text.includes('    frame: false,')) {
    text = replaceAll(
      text,
      '    useContentSize: true,',
      "    useContentSize: true,\n    frame: false,"
    );
  }

  if (!text.includes('    transparent: true,')) {
    text = replaceAll(
      text,
      '    frame: false,',
      "    frame: false,\n    transparent: true,"
    );
  }

  text = replaceAll(text, "    backgroundColor: '#000000',\n", "    backgroundColor: '#00000000',\n");
  text = replaceAll(text, "    backgroundColor: '#000000',", "    backgroundColor: '#00000000',");

  if (!text.includes('    hasShadow: false,')) {
    text = replaceAll(text, "    backgroundColor: '#00000000',", "    backgroundColor: '#00000000',\n    hasShadow: false,");
  }

  if (!text.includes("  mainWindow.setBackgroundColor('#00000000');")) {
    text = replaceAll(
      text,
      "  // Enable `@electron/remote` module for renderer process",
      "  mainWindow.setBackgroundColor('#00000000');\n\n  // Enable `@electron/remote` module for renderer process"
    );
  }

  return writeIfChanged(filePath, text);
}

function patchIndexHtml(filePath) {
  let text = read(filePath);

  if (!text.includes('html, body {')) {
    text = replaceAll(
      text,
      '<style>\n',
      "<style>\n\t\thtml, body {\n\t\t\tbackground-color: transparent;\n\t\t}\n"
    );
    text = replaceAll(
      text,
      '<style>\r\n',
      "<style>\r\n\t\thtml, body {\r\n\t\t\tbackground-color: transparent;\r\n\t\t}\r\n"
    );
  }

  text = replaceAll(text, 'background-color: #000000;', 'background-color: transparent;');
  text = replaceAll(text, 'background-color:#000000;', 'background-color: transparent;');

  return writeIfChanged(filePath, text);
}

function patchCode0(filePath) {
  if (!exists(filePath)) return false;
  let text = read(filePath);
  text = replaceAll(text, "{gdjs.evtsExt__DesktopPet__SetPreviewTestBackground.func(runtimeScene, null);\n}\n", '');
  text = replaceAll(text, "{gdjs.evtsExt__DesktopPet__SetPreviewTestBackground.func(runtimeScene, null);\r\n}\r\n", '');
  return writeIfChanged(filePath, text);
}

function patchRuntimeGame(filePath) {
  if (!exists(filePath)) return false;
  let text = read(filePath);

  text = replaceAll(
    text,
    'preserveDrawingBuffer:!0}),this._threeRenderer.shadowMap',
    'preserveDrawingBuffer:!0,alpha:!0}),this._threeRenderer.shadowMap'
  );

  text = replaceAll(
    text,
    'PIXI.autoDetectRenderer({width:this._game.getGameResolutionWidth(),height:this._game.getGameResolutionHeight(),view:e,preserveDrawingBuffer:!0,antialias:!1})',
    'PIXI.autoDetectRenderer({width:this._game.getGameResolutionWidth(),height:this._game.getGameResolutionHeight(),view:e,preserveDrawingBuffer:!0,antialias:!1,backgroundAlpha:0,backgroundColor:0,transparent:!0,clearBeforeRender:!1})'
  );

  return writeIfChanged(filePath, text);
}

function patchRuntimeScene(filePath) {
  if (!exists(filePath)) return false;
  let text = read(filePath);

  text = replaceAll(text, 'r.setClearColor(this._runtimeScene.getBackgroundColor())', 'r.setClearColor(this._runtimeScene.getBackgroundColor(),0)');
  text = replaceAll(
    text,
    'this._runtimeScene.getClearCanvas()&&r.clear(),this._backgroundColor||(this._backgroundColor=new THREE.Color),this._backgroundColor.set(this._runtimeScene.getBackgroundColor()),a.background=this._backgroundColor',
    'this._runtimeScene.getClearCanvas()&&r.clear(),this._backgroundColor||(this._backgroundColor=new THREE.Color),this._backgroundColor.set(this._runtimeScene.getBackgroundColor()),a.background=null'
  );
  text = replaceAll(
    text,
    'n&&(e.background.color=this._runtimeScene.getBackgroundColor(),this._runtimeScene.getClearCanvas()&&e.clear(),n=!1)',
    'n&&(e.background.color=0,e.background.alpha=0,this._runtimeScene.getClearCanvas()&&e.clear(),n=!1)'
  );
  text = replaceAll(
    text,
    'e.background.color=this._runtimeScene.getBackgroundColor(),e.render(this._pixiContainer,{clear:this._runtimeScene.getClearCanvas()})',
    'e.background.color=0,e.background.alpha=0,e.render(this._pixiContainer,{clear:this._runtimeScene.getClearCanvas()})'
  );
  text = replaceAll(
    text,
    'e.setClearColor(this._runtimeScene.getBackgroundColor()),this._runtimeScene.getClearCanvas()&&e.clear(),o.background=this._backgroundColor',
    'e.setClearColor(this._runtimeScene.getBackgroundColor(),0),this._runtimeScene.getClearCanvas()&&e.clear(),o.background=null'
  );

  return writeIfChanged(filePath, text);
}

function patchProject(projectDir) {
  const changes = [];
  if (patchMainJs(path.join(projectDir, 'main.js'))) changes.push('main.js');
  if (patchIndexHtml(path.join(projectDir, 'app', 'index.html'))) changes.push('app/index.html');
  if (patchCode0(path.join(projectDir, 'app', 'code0.js'))) changes.push('app/code0.js');
  if (patchRuntimeGame(path.join(projectDir, 'app', 'pixi-renderers', 'runtimegame-pixi-renderer.js'))) changes.push('app/pixi-renderers/runtimegame-pixi-renderer.js');
  if (patchRuntimeScene(path.join(projectDir, 'app', 'pixi-renderers', 'runtimescene-pixi-renderer.js'))) changes.push('app/pixi-renderers/runtimescene-pixi-renderer.js');
  return changes;
}

const projects = [...new Set(walkForProjects(root))];

if (!projects.length) {
  console.error(`No export folder found under: ${root}`);
  process.exit(1);
}

for (const projectDir of projects) {
  const changes = patchProject(projectDir);
  console.log(`${changes.length ? 'OK' : 'SKIP'} ${projectDir}`);
  if (changes.length) console.log(`  ${changes.join(', ')}`);
}
