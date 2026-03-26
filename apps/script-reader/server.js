const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const SCRIPTS_DIR = path.join(__dirname, '..', '..', 'docs', 'game-knowledge', 'scripts');
const STATIC_DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API: list script files
  if (url.pathname === '/api/files' && req.method === 'GET') {
    const files = fs.readdirSync(SCRIPTS_DIR)
      .filter(f => f.endsWith('.json') && f.startsWith('scripts-collection'))
      .sort();
    // Add virtual 'all' option
    const result = ['_all', ...files];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // API: get enum mappings
  if (url.pathname === '/api/enums' && req.method === 'GET') {
    const enumFile = path.join(SCRIPTS_DIR, 'enum-mapping.json');
    if (!fs.existsSync(enumFile)) {
      res.writeHead(404); res.end('{"error": "Enum mapping not found"}'); return;
    }
    serveStatic(res, enumFile);
    return;
  }

  // API: get scripts from a file
  if (url.pathname === '/api/scripts' && req.method === 'GET') {
    const file = url.searchParams.get('file');
    if (!file) { res.writeHead(400); res.end('Missing file param'); return; }
    
    // Virtual '_all' merges all collection files
    if (file === '_all') {
      const colFiles = fs.readdirSync(SCRIPTS_DIR)
        .filter(f => f.endsWith('.json') && f.startsWith('scripts-collection'))
        .sort();
      let all = [];
      for (const cf of colFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, cf), 'utf8'));
        // Tag each script with its source file and collection label
        const colNum = cf.match(/collection-(\d+|en)/)?.[1] || '?';
        data.forEach(s => {
          s._sourceFile = cf;
          s._collectionLabel = colNum === 'en' ? 'EN' : `集${colNum}`;
        });
        all = all.concat(data);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(all));
      return;
    }
    
    const filePath = path.join(SCRIPTS_DIR, file);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('File not found'); return; }
    serveStatic(res, filePath);
    return;
  }

  // API: save a single script
  if (url.pathname === '/api/scripts' && req.method === 'PUT') {
    const body = JSON.parse(await readBody(req));
    let { file, script } = body;
    
    // If saving from '_all' view, find the actual source file
    if (file === '_all') {
      file = script._sourceFile;
      if (!file) { res.writeHead(400); res.end('No source file'); return; }
    }
    
    // Remove internal tags before saving
    const cleanScript = { ...script };
    delete cleanScript._sourceFile;
    delete cleanScript._collectionLabel;
    
    const filePath = path.join(SCRIPTS_DIR, file);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('File not found'); return; }
    const scripts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const idx = scripts.findIndex(s => s.id === cleanScript.id);
    if (idx === -1) { res.writeHead(404); res.end('Script not found'); return; }
    scripts[idx] = cleanScript;
    fs.writeFileSync(filePath, JSON.stringify(scripts, null, 2), 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, saved: cleanScript.id, file }));
    return;
  }

  // API: delete a script
  if (url.pathname === '/api/scripts' && req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    const file = url.searchParams.get('file');

    if (!id || !file) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'Missing id or file params' })); return;
    }

    const targetFile = file === '_all' ? url.searchParams.get('sourceFile') : file;
    if (!targetFile) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Missing sourceFile param' })); return;
    }

    const filePath = path.join(SCRIPTS_DIR, targetFile);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404); res.end(JSON.stringify({ error: 'File not found' })); return;
    }

    let scripts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const initialLength = scripts.length;
    scripts = scripts.filter(s => String(s.id) !== String(id) && s.title !== String(id)); // Also matching by title if id is missing on old data 

    if (scripts.length === initialLength) {
      res.writeHead(404); res.end(JSON.stringify({ error: 'Script not found' })); return;
    }

    fs.writeFileSync(filePath, JSON.stringify(scripts, null, 2), 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, deleted: id }));
    return;
  }

  // API: link two scripts
  if (url.pathname === '/api/links' && req.method === 'GET') {
    const linkFile = path.join(SCRIPTS_DIR, 'script-links.json');
    if (!fs.existsSync(linkFile)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]'); return;
    }
    serveStatic(res, linkFile);
    return;
  }

  if (url.pathname === '/api/links' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const { id1, id2 } = body;
    if (!id1 || !id2) { res.writeHead(400); res.end('Missing ids'); return; }

    const linkFile = path.join(SCRIPTS_DIR, 'script-links.json');
    let links = [];
    if (fs.existsSync(linkFile)) {
      links = JSON.parse(fs.readFileSync(linkFile, 'utf8'));
    }
    
    // Add bi-directional or simple pair (just store as sorted tuple array)
    const pair = [id1, id2].sort();
    const exists = links.some(l => l[0] === pair[0] && l[1] === pair[1]);
    if (!exists) {
      links.push(pair);
      fs.writeFileSync(linkFile, JSON.stringify(links, null, 2), 'utf8');
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, links }));
    return;
  }

  // Static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  serveStatic(res, path.join(STATIC_DIR, filePath));
});

server.listen(PORT, () => {
  console.log(`🎭 Script Reader running at http://localhost:${PORT}`);
});
