import { spawnSync } from 'node:child_process'

const command = process.argv[2]
const repoName = process.argv[3] || 'evermore-heart'

if (!['create-repo', 'enable-pages', 'pages-status'].includes(command)) {
  throw new Error('Usage: node scripts/github-api.mjs create-repo|enable-pages|pages-status [repo-name]')
}

const credential = spawnSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
})
if (credential.status !== 0) {
  throw new Error('GitHub credential is unavailable. Please authorize Git Credential Manager first.')
}
const values = Object.fromEntries(
  credential.stdout
    .split(/\r?\n/)
    .filter((line) => line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
)
if (!values.password) throw new Error('GitHub access token was not returned by the credential helper.')

async function api(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${values.password}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Evermore-Heart-Publisher',
      ...options.headers,
    },
  })
  const text = await response.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { message: text }
  }
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}: ${body.message || 'GitHub API request failed'}`)
    error.status = response.status
    error.body = body
    throw error
  }
  return body
}

const user = await api('/user')

if (command === 'create-repo') {
  const repo = await api('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: repoName,
      description: '心动宇宙 · 一封由星光与代码写成的浪漫情书',
      homepage: `https://${user.login}.github.io/${repoName}/`,
      private: false,
      has_issues: false,
      has_projects: false,
      has_wiki: false,
      auto_init: false,
    }),
  })
  console.log(JSON.stringify({
    login: user.login,
    id: user.id,
    name: repo.name,
    url: repo.html_url,
    cloneUrl: repo.clone_url,
    homepage: repo.homepage,
  }, null, 2))
} else if (command === 'enable-pages') {
  let pages
  try {
    pages = await api(`/repos/${user.login}/${repoName}/pages`, {
      method: 'POST',
      body: JSON.stringify({ source: { branch: 'gh-pages', path: '/' } }),
    })
  } catch (error) {
    if (error.status !== 409) throw error
    pages = await api(`/repos/${user.login}/${repoName}/pages`, {
      method: 'PUT',
      body: JSON.stringify({ source: { branch: 'gh-pages', path: '/' } }),
    })
  }
  console.log(JSON.stringify({
    repo: `https://github.com/${user.login}/${repoName}`,
    pages: pages.html_url,
    status: pages.status,
    branch: pages.source?.branch,
    path: pages.source?.path,
  }, null, 2))
} else {
  const pages = await api(`/repos/${user.login}/${repoName}/pages`)
  const latestBuild = await api(`/repos/${user.login}/${repoName}/pages/builds/latest`)
  console.log(JSON.stringify({ pages, latestBuild }, null, 2))
}
