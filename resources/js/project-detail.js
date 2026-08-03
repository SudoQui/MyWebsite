const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');
const projects = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];
const project = projects.find((candidate) => candidate.id === projectId);
const hero = document.getElementById('project-hero');
const content = document.getElementById('project-content');

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const listMarkup = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

if (!project || !hero || !content) {
  document.title = 'Project not found | Mustafa Siddiqui';
  if (hero) {
    hero.className = 'not-found';
    hero.innerHTML = '<h1>Project not found</h1><p>The requested case study could not be found.</p><a href="index.html#projects">Return to projects</a>';
  }
} else {
  document.title = `${project.title} | Mustafa Siddiqui`;
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) descriptionMeta.setAttribute('content', project.summary);

  hero.innerHTML = `
    <img src="${escapeHtml(project.image)}" alt="Placeholder artwork for ${escapeHtml(project.title)}" width="1600" height="900" />
    <div>
      <p class="eyebrow">${escapeHtml(project.studio ? 'Built through SudoLabs' : project.badge)}</p>
      <h1>${escapeHtml(project.title)}</h1>
      <p>${escapeHtml(project.summary)}</p>
      <div class="tag-row">${project.tools.map((tool) => `<span>${escapeHtml(tool)}</span>`).join('')}</div>
      <p class="placeholder-note">The project image is a named placeholder. Replace the matching SVG file in resources/img/projects when final screenshots or photography are ready.</p>
    </div>`;

  const links = project.links.length
    ? `<section class="case-card full"><h2>External links</h2><div class="external-links">${project.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div></section>`
    : '';

  content.innerHTML = `
    <div class="case-grid">
      <section class="case-card full">
        <h2>Problem and motivation</h2>
        <p>${escapeHtml(project.problem)}</p>
      </section>
      <section class="case-card">
        <h2>What I built</h2>
        ${listMarkup(project.built)}
      </section>
      <section class="case-card">
        <h2>My role and contribution</h2>
        ${listMarkup(project.role)}
      </section>
      <section class="case-card full">
        <h2>Engineering lessons</h2>
        ${listMarkup(project.lessons)}
      </section>
      ${links}
    </div>`;
}

const yearNode = document.getElementById('year');
if (yearNode) yearNode.textContent = String(new Date().getFullYear());
