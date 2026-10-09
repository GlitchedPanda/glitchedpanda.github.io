(() => {
  'use strict';

  const username = 'GlitchedPanda';
  const profileUrl = `https://github.com/${username}`;
  const cacheKey = 'glitchedpanda:repositories:v1';
  const cacheLifetime = 10 * 60 * 1000;
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  const search = document.getElementById('project-search');
  const language = document.getElementById('language-filter');
  const sort = document.getElementById('project-sort');
  const resultCount = document.getElementById('results-count');
  const resetButton = document.getElementById('reset-filters');
  const status = document.getElementById('projects-status');
  const loading = document.getElementById('projects-loading');
  const retry = document.getElementById('retry-projects');
  const clearEmpty = document.getElementById('clear-empty-filters');
  const githubFallback = document.getElementById('status-github');
  const source = document.getElementById('data-source');
  const controls = [search, language, sort];
  const number = new Intl.NumberFormat();
  const date = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const languageColors = {
    Rust: '#dea584', 'C++': '#f3a4ca', C: '#a8a8d4', Python: '#74a8d3',
    JavaScript: '#e6d36b', TypeScript: '#77afe1', HTML: '#e78c72',
    CSS: '#ad91dc', Shell: '#a5c985', Lua: '#9095dc', Go: '#75c8da',
    Java: '#dba173', CMake: '#8ec7ad', Zig: '#ebbc6f', 'C#': '#a5cc8b'
  };
  let repositories = [];
  let isLoading = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', `#icon-${name}`);
    svg.append(use);
    return svg;
  }

  function externalLink(text, url) {
    const link = element('a', 'text-link', text);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.append(icon('external'));
    return link;
  }

  function safeHomepage(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function normalizeRepos(data) {
    if (!Array.isArray(data)) throw new Error('Unexpected repository data');
    return data.filter(repo => repo && typeof repo.name === 'string' && repo.name.length && !repo.private).map(repo => ({
      name: repo.name,
      description: typeof repo.description === 'string' ? repo.description : '',
      language: typeof repo.language === 'string' ? repo.language : '',
      stargazers_count: Number.isFinite(repo.stargazers_count) ? Math.max(0, repo.stargazers_count) : 0,
      updated_at: typeof repo.updated_at === 'string' && Number.isFinite(Date.parse(repo.updated_at)) ? repo.updated_at : null,
      homepage: safeHomepage(repo.homepage),
      topics: Array.isArray(repo.topics) ? repo.topics.filter(topic => typeof topic === 'string') : [],
      fork: Boolean(repo.fork),
      archived: Boolean(repo.archived)
    }));
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (!cached || !Number.isFinite(cached.savedAt) || cached.savedAt > Date.now()) return null;
      return { savedAt: cached.savedAt, repos: normalizeRepos(cached.repos) };
    } catch {
      return null;
    }
  }

  function writeCache(repos) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), repos }));
    } catch {
      // Browsing still works when storage is blocked or full.
    }
  }

  function showStatus(title, description, mode) {
    status.hidden = false;
    document.getElementById('status-title').textContent = title;
    document.getElementById('status-description').textContent = description;
    retry.hidden = mode !== 'error';
    githubFallback.hidden = mode !== 'error' && mode !== 'empty';
    clearEmpty.hidden = mode !== 'filter';
  }

  function createCard(repo) {
    const card = element('article', 'project-card');
    const top = element('div', 'project-card-top');
    const stars = element('span', 'repo-stars');
    stars.setAttribute('aria-label', `${number.format(repo.stargazers_count)} stars`);
    stars.append(icon('star'), document.createTextNode(number.format(repo.stargazers_count)));
    top.append(icon('folder'), stars);

    const title = element('h2');
    const repoUrl = `${profileUrl}/${encodeURIComponent(repo.name)}`;
    const titleLink = externalLink(repo.name, repoUrl);
    titleLink.className = '';
    // The footer supplies the external-link icon without crowding the title.
    titleLink.querySelector('svg').remove();
    title.append(titleLink);

    const description = element('p', 'project-description', repo.description || 'No description provided.');
    const meta = element('div', 'project-meta');
    if (repo.language) {
      const label = element('span', 'repo-language');
      const dot = element('span', 'language-dot');
      dot.style.setProperty('--language-color', languageColors[repo.language] || '#8ca7ff');
      dot.setAttribute('aria-hidden', 'true');
      label.append(dot, document.createTextNode(repo.language));
      meta.append(label);
    }
    if (repo.updated_at) {
      const updated = element('time', '', `Updated ${date.format(new Date(repo.updated_at))}`);
      updated.dateTime = repo.updated_at;
      meta.append(updated);
    }
    if (repo.archived) meta.append(element('span', 'repo-tag', 'Archived'));
    if (repo.fork) meta.append(element('span', 'repo-tag', 'Fork'));
    const footer = element('div', 'project-card-footer');
    const repoLink = externalLink('View source', repoUrl);
    repoLink.setAttribute('aria-label', `View ${repo.name} source on GitHub`);
    footer.append(repoLink);
    if (repo.homepage) {
      const preview = externalLink('Live preview', repo.homepage);
      preview.setAttribute('aria-label', `Open ${repo.name} live preview`);
      footer.append(preview);
    }
    card.append(top, title, description, meta, footer);
    return card;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const filtered = repositories.filter(repo => {
      const matchesLanguage = !language.value || repo.language === language.value;
      const haystack = [repo.name, repo.description, ...repo.topics].join(' ').toLocaleLowerCase();
      return matchesLanguage && haystack.includes(query);
    });
    filtered.sort((a, b) => {
      if (sort.value === 'name') return a.name.localeCompare(b.name);
      const recent = (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0);
      if (sort.value === 'updated') return recent || a.name.localeCompare(b.name);
      return b.stargazers_count - a.stargazers_count || recent || a.name.localeCompare(b.name);
    });

    grid.replaceChildren(...filtered.map(createCard));
    grid.hidden = !filtered.length;
    status.hidden = true;
    const hasFilters = Boolean(query || language.value);
    resetButton.hidden = !hasFilters;
    resultCount.textContent = hasFilters
      ? `${number.format(filtered.length)} of ${number.format(repositories.length)} repositories`
      : `${number.format(filtered.length)} ${filtered.length === 1 ? 'repository' : 'repositories'} · ${sort.options[sort.selectedIndex].text.toLocaleLowerCase()}`;

    if (!repositories.length) {
      showStatus('No public repositories.', 'You can check my GitHub profile directly.', 'empty');
    } else if (!filtered.length) {
      showStatus('No projects found.', 'Try another search or clear your filters to see all repositories.', 'filter');
    }
  }

  function resetFilters() {
    search.value = '';
    language.value = '';
    render();
    search.focus();
  }

  function displayRepos(repos, sourceLabel) {
    repositories = repos;
    document.getElementById('repo-count').textContent = number.format(repos.length);
    document.getElementById('star-count').textContent = number.format(repos.reduce((sum, repo) => sum + repo.stargazers_count, 0));
    const languages = [...new Set(repos.map(repo => repo.language).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    document.getElementById('language-count').textContent = number.format(languages.length);
    const selected = language.value;
    language.replaceChildren(new Option('All languages', ''));
    languages.forEach(name => language.add(new Option(name, name)));
    if (languages.includes(selected)) language.value = selected;
    controls.forEach(control => { control.disabled = false; });
    source.textContent = sourceLabel;
    render();
  }

  function showSkeletons() {
    grid.hidden = false;
    grid.replaceChildren();
    for (let index = 0; index < 6; index++) {
      const card = element('div', 'project-card skeleton');
      card.setAttribute('aria-hidden', 'true');
      for (let line = 0; line < 5; line++) card.append(element('div', 'skeleton-line'));
      grid.append(card);
    }
  }

  async function fetchRepos(signal) {
    const repos = [];
    for (let page = 1; ; page++) {
      const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json' }, signal
      });
      if (!response.ok) {
        const error = new Error('GitHub request failed');
        error.rateLimited = response.status === 403 || response.status === 429;
        throw error;
      }
      const batch = await response.json();
      repos.push(...normalizeRepos(batch));
      if (batch.length < 100) return repos;
    }
  }

  async function loadProjects(force = false) {
    if (isLoading) return;
    isLoading = true;
    const cached = readCache();
    status.hidden = true;
    loading.hidden = false;
    grid.setAttribute('aria-busy', 'true');
    resultCount.textContent = 'Loading projects…';
    controls.forEach(control => { control.disabled = true; });
    showSkeletons();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      if (!force && cached && Date.now() - cached.savedAt < cacheLifetime) {
        displayRepos(cached.repos, 'GitHub · recently cached');
      } else {
        const repos = await fetchRepos(controller.signal);
        writeCache(repos);
        displayRepos(repos, 'Up to date with GitHub');
      }
    } catch (error) {
      if (cached) {
        displayRepos(cached.repos, `Saved ${date.format(new Date(cached.savedAt))} · GitHub unavailable`);
      } else {
        grid.replaceChildren();
        grid.hidden = true;
        source.textContent = 'GitHub currently unavailable';
        resultCount.textContent = 'Projects couldn’t be loaded';
        showStatus('Couldn’t load projects.', error.rateLimited
          ? 'GitHub’s request limit has been reached. Try again later, or browse the repositories directly.'
          : 'Unable to reach GitHub right now. Try again, or browse the repositories directly.', 'error');
      }
    } finally {
      clearTimeout(timeout);
      loading.hidden = true;
      grid.setAttribute('aria-busy', 'false');
      isLoading = false;
    }
  }

  document.getElementById('project-controls').addEventListener('submit', event => event.preventDefault());
  search.addEventListener('input', render);
  language.addEventListener('change', render);
  sort.addEventListener('change', render);
  resetButton.addEventListener('click', resetFilters);
  clearEmpty.addEventListener('click', resetFilters);
  retry.addEventListener('click', () => loadProjects(true));
  loadProjects();
})();
