const username = 'GlitchedPanda';
const grid = document.getElementById('projects-grid');
const status = document.getElementById('projects-status');
const summary = document.getElementById('project-stats');

function getTopLanguages(repos) {
  const counts = repos.reduce((acc, repo) => {
    if (!repo.language) return acc;
    acc[repo.language] = (acc[repo.language] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([lang, count]) => `${lang} (${count})`)
    .join(', ');
}

function showStatus(text, withSpinner = false) {
  status.classList.remove('d-none');
  status.classList.add('d-flex', 'flex-column', 'flex-sm-row', 'align-items-center', 'justify-content-center', 'gap-2');
  if (withSpinner) {
    status.innerHTML = `<div class="spinner-border" role="status" aria-hidden="true"></div><span>${text}</span>`;
  } else {
    status.innerHTML = `<span>${text}</span>`;
  }
}

function createProjectCard(repo) {
  const col = document.createElement('div');
  col.className = 'col-12 col-md-6';

  const card = document.createElement('article');
  card.className = 'card project-card h-100';

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h2');
  title.className = 'h5 project-card-title mb-2 d-flex align-items-center justify-content-between';
  const link = document.createElement('a');
  link.href = repo.html_url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = repo.name;
  title.appendChild(link);

  const description = document.createElement('p');
  description.className = 'project-card-text mb-3';
  description.textContent = repo.description || 'No description available.';

  const meta = document.createElement('div');
  meta.className = 'project-meta mb-3';
  const starText = `★ ${repo.stargazers_count.toLocaleString()}`;
  const langText = repo.language ? ` · ${repo.language}` : '';
  const updatedText = ` · Updated ${new Date(repo.updated_at).toLocaleDateString()}`;
  meta.textContent = `${starText}${langText}${updatedText}`;

  const footer = document.createElement('div');
  footer.className = 'd-flex flex-wrap gap-2 project-card-footer';

  const sourceBtn = document.createElement('a');
  sourceBtn.className = 'btn btn-outline-primary btn-sm';
  sourceBtn.href = repo.html_url;
  sourceBtn.target = '_blank';
  sourceBtn.rel = 'noopener';
  sourceBtn.textContent = 'View repo';
  footer.appendChild(sourceBtn);

  if (repo.homepage) {
    const demoBtn = document.createElement('a');
    demoBtn.className = 'btn btn-outline-secondary btn-sm';
    demoBtn.href = repo.homepage;
    demoBtn.target = '_blank';
    demoBtn.rel = 'noopener';
    demoBtn.textContent = 'Live preview';
    footer.appendChild(demoBtn);
  }

  body.appendChild(title);
  body.appendChild(description);
  body.appendChild(meta);
  body.appendChild(footer);
  card.appendChild(body);
  col.appendChild(card);
  return col;
}

async function loadProjects() {
  showStatus('Loading projects…', true);
  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`, {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const repos = await response.json();
    if (!repos.length) {
      showStatus('No public repositories were found.');
      return;
    }

    repos.sort((a, b) => b.stargazers_count - a.stargazers_count);

    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const topLanguages = getTopLanguages(repos);
    if (summary) {
      summary.textContent = `${repos.length} repos loaded · ${totalStars.toLocaleString()} stars total${topLanguages ? ` · Top languages: ${topLanguages}` : ''}`;
    }

    repos.forEach(repo => grid.appendChild(createProjectCard(repo)));
    status.classList.add('d-none');
  } catch (error) {
    showStatus(`Unable to load projects. ${error.message}`);
    console.error(error);
  }
}

loadProjects();
