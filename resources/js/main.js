const menuToggle = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('.primary-nav');
const navLinks = [...document.querySelectorAll('.primary-nav a')];
const revealItems = [...document.querySelectorAll('.reveal')];
const counterItems = [...document.querySelectorAll('[data-counter]')];
const projectGrid = document.getElementById('projects-grid');
const projectFilterButtons = [...document.querySelectorAll('.filter-btn')];
const emptyProjectState = document.getElementById('empty-project-state');

if (menuToggle && primaryNav) {
  const closeMenu = () => {
    primaryNav.classList.remove('open');
    document.body.classList.remove('nav-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('open');
    document.body.classList.toggle('nav-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => link.addEventListener('click', closeMenu));

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });
}

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

if (counterItems.length > 0) {
  const animateCounter = (element) => {
    const target = Number(element.dataset.counter || 0);
    const duration = 900;
    const start = performance.now();

    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased).toLocaleString('en-AU');
      if (progress < 1) requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  };

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counterItems.forEach((counter) => counterObserver.observe(counter));
  } else {
    counterItems.forEach(animateCounter);
  }
}

const sections = [...document.querySelectorAll('main section[id]')];
if ('IntersectionObserver' in window && sections.length > 0) {
  const activeSectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
  );

  sections.forEach((section) => activeSectionObserver.observe(section));
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const renderProjects = () => {
  if (!projectGrid || !Array.isArray(window.PORTFOLIO_PROJECTS)) return;

  projectGrid.innerHTML = window.PORTFOLIO_PROJECTS.map((project) => {
    const filters = project.filters.join(' ');
    const tags = project.tools.slice(0, 4).map((tool) => `<span>${escapeHtml(tool)}</span>`).join('');
    const studioLabel = project.studio ? '<span class="project-badge">Built through SudoLabs</span>' : `<span class="project-badge">${escapeHtml(project.badge)}</span>`;

    return `
      <article class="project-card reveal visible" data-filters="${escapeHtml(filters)}">
        <a class="project-media" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="View ${escapeHtml(project.title)} details">
          <img src="${escapeHtml(project.image)}" alt="Placeholder artwork for ${escapeHtml(project.title)}" width="1600" height="900" loading="lazy" />
        </a>
        <div class="project-content">
          ${studioLabel}
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.summary)}</p>
          <div class="tag-row">${tags}</div>
          <a class="project-link" href="project.html?id=${encodeURIComponent(project.id)}">View case study</a>
        </div>
      </article>`;
  }).join('');
};

const filterProjects = (filter) => {
  if (!projectGrid) return;
  const cards = [...projectGrid.querySelectorAll('.project-card')];
  let visibleCount = 0;

  cards.forEach((card) => {
    const matches = filter === 'all' || card.dataset.filters.split(' ').includes(filter);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  if (emptyProjectState) emptyProjectState.hidden = visibleCount !== 0;
};

renderProjects();

projectFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    projectFilterButtons.forEach((candidate) => {
      const isActive = candidate === button;
      candidate.classList.toggle('active', isActive);
      candidate.setAttribute('aria-pressed', String(isActive));
    });
    filterProjects(button.dataset.filter || 'all');
  });
});

const yearNode = document.getElementById('year');
if (yearNode) yearNode.textContent = String(new Date().getFullYear());
