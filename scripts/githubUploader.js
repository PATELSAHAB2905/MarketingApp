import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to make HTTPS requests to GitHub API
function githubRequest({ method = 'GET', endpoint, token, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.github.com${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'User-Agent': 'NodeJS-GitHub-Uploader',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
      },
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`GitHub API Error [${res.statusCode}]: ${parsed.message || data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Ignore list
const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'dist-ssr',
  '.git',
  '.gemini',
  '.vscode',
  '.idea',
]);

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const relPath = path.relative(baseDir, filePath).replace(/\\/g, '/');
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.has(file)) {
        results = results.concat(getAllFiles(filePath, baseDir));
      }
    } else {
      if (!file.endsWith('.log') && !file.endsWith('.tmp')) {
        results.push({ fullPath: filePath, relPath });
      }
    }
  }
  return results;
}

export async function uploadToGitHub({
  username = 'PATELSAHAB2905',
  repoName = 'marketing-management-system',
  token,
  isPrivate = true,
  description = 'Patel Sahab Spices - Marketing Management System with Firebase Firestore',
}) {
  if (!token) {
    throw new Error('GitHub Personal Access Token is required for secure authentication.');
  }

  console.log(`[1/4] Checking/Creating Private Repository "${repoName}" for ${username}...`);
  let repo;
  try {
    // Check if repo already exists
    repo = await githubRequest({ endpoint: `/repos/${username}/${repoName}`, token });
    console.log(`✓ Repository already exists: ${repo.html_url}`);
  } catch (err) {
    // Create new private repository
    console.log(`Creating new ${isPrivate ? 'PRIVATE' : 'PUBLIC'} repository...`);
    repo = await githubRequest({
      method: 'POST',
      endpoint: '/user/repos',
      token,
      body: {
        name: repoName,
        private: isPrivate,
        description,
        auto_init: true,
      },
    });
    console.log(`✓ Created repository: ${repo.html_url}`);
  }

  console.log(`[2/4] Scanning project files (excluding node_modules, dist)...`);
  const files = getAllFiles(ROOT_DIR);
  console.log(`✓ Found ${files.length} project files to upload.`);

  console.log(`[3/4] Uploading file blobs to GitHub...`);
  const treeItems = [];
  for (let i = 0; i < files.length; i++) {
    const { fullPath, relPath } = files[i];
    const content = fs.readFileSync(fullPath);
    const isBinary = content.includes(0);

    const blob = await githubRequest({
      method: 'POST',
      endpoint: `/repos/${username}/${repoName}/git/blobs`,
      token,
      body: {
        content: content.toString(isBinary ? 'base64' : 'utf8'),
        encoding: isBinary ? 'base64' : 'utf-8',
      },
    });

    treeItems.push({
      path: relPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });

    if ((i + 1) % 20 === 0 || i === files.length - 1) {
      console.log(`  Uploaded ${i + 1}/${files.length} files...`);
    }
  }

  console.log(`[4/4] Creating Git Tree & Commit on main branch...`);
  // Get latest commit on default branch
  let parentCommitSha = null;
  try {
    const ref = await githubRequest({ endpoint: `/repos/${username}/${repoName}/git/ref/heads/main`, token });
    parentCommitSha = ref.object.sha;
  } catch (e) {
    try {
      const refMaster = await githubRequest({ endpoint: `/repos/${username}/${repoName}/git/ref/heads/master`, token });
      parentCommitSha = refMaster.object.sha;
    } catch (e2) {}
  }

  const tree = await githubRequest({
    method: 'POST',
    endpoint: `/repos/${username}/${repoName}/git/trees`,
    token,
    body: {
      tree: treeItems,
    },
  });

  const commit = await githubRequest({
    method: 'POST',
    endpoint: `/repos/${username}/${repoName}/git/commits`,
    token,
    body: {
      message: 'Initial upload: Marketing Management System with Firebase Cloud Firestore',
      tree: tree.sha,
      parents: parentCommitSha ? [parentCommitSha] : [],
    },
  });

  // Update branch ref
  try {
    await githubRequest({
      method: 'PATCH',
      endpoint: `/repos/${username}/${repoName}/git/refs/heads/main`,
      token,
      body: { sha: commit.sha, force: true },
    });
  } catch (e) {
    await githubRequest({
      method: 'POST',
      endpoint: `/repos/${username}/${repoName}/git/refs`,
      token,
      body: { ref: 'refs/heads/main', sha: commit.sha },
    });
  }

  console.log(`🎉 Successfully uploaded project to GitHub in PRIVATE mode!`);
  console.log(`👉 Access URL: ${repo.html_url}`);
  return { success: true, url: repo.html_url, repoName };
}

// If run directly from CLI with argument
if (process.argv[2]) {
  const token = process.argv[2];
  uploadToGitHub({ token })
    .then((res) => {
      console.log('Done!', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Upload Error:', err.message);
      process.exit(1);
    });
}
