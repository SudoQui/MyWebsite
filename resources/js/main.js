const siteHeader = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = [...document.querySelectorAll('.primary-nav a')];
const revealItems = [...document.querySelectorAll('.reveal')];
const counterItems = [...document.querySelectorAll('[data-counter]')];
const filterButtons = [...document.querySelectorAll('.filter-btn')];
const projectCards = [...document.querySelectorAll('.project-card')];
const emptyState = document.getElementById('empty-project-state');
const yearTarget = document.getElementById('year');

if (yearTarget) {
  yearTarget.textContent = String(new Date().getFullYear());
}

if (menuToggle && siteHeader) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteHeader.classList.toggle('nav-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      siteHeader.classList.remove('nav-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (revealItems.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

if (counterItems.length > 0) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const runCounter = (el) => {
    const targetValue = Number(el.dataset.counter);
    if (!Number.isFinite(targetValue)) {
      return;
    }

    if (prefersReducedMotion) {
      el.textContent = String(targetValue);
      return;
    }

    const duration = 1200;
    const start = performance.now();

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(targetValue * eased));
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  };

  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counterItems.forEach((item) => counterObserver.observe(item));
}

const sections = [...document.querySelectorAll('main section[id]')];
if (sections.length > 0 && navLinks.length > 0) {
  const activeSectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${id}`);
        });
      });
    },
    { threshold: 0.5, rootMargin: '-20% 0px -30% 0px' }
  );

  sections.forEach((section) => activeSectionObserver.observe(section));
}

const dotLinks = [...document.querySelectorAll('.dots .dot')];
if (sections.length > 0 && dotLinks.length > 0) {
  const dotSectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const currentId = entry.target.getAttribute('id');
        dotLinks.forEach((dot) => {
          const targetId = (dot.getAttribute('href') || '').replace('#', '');
          if (targetId === currentId) {
            dot.setAttribute('aria-current', 'true');
            return;
          }
          dot.removeAttribute('aria-current');
        });
      });
    },
    { threshold: 0.55, rootMargin: '-20% 0px -30% 0px' }
  );

  sections.forEach((section) => dotSectionObserver.observe(section));
}

const matchesFilter = (card, filterName) => {
  if (filterName === 'all') {
    return true;
  }

  const cardFilters = card.dataset.filters ? card.dataset.filters.split(/\s+/) : [];
  return cardFilters.includes(filterName);
};

const applyProjectFilter = (filterName) => {
  let visibleCount = 0;

  projectCards.forEach((card) => {
    const shouldShow = matchesFilter(card, filterName);

    if (shouldShow) {
      card.hidden = false;
      card.classList.remove('filter-out');
      card.classList.remove('filter-in');
      // Restart animation for smooth transitions between filters.
      void card.offsetWidth;
      card.classList.add('filter-in');
      visibleCount += 1;
      return;
    }

    card.classList.remove('filter-in');
    card.classList.add('filter-out');

    window.setTimeout(() => {
      if (card.classList.contains('filter-out')) {
        card.hidden = true;
      }
    }, 210);
  });

  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
  }
};

if (filterButtons.length > 0 && projectCards.length > 0) {
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedFilter = button.dataset.filter;
      if (!selectedFilter) {
        return;
      }

      filterButtons.forEach((btn) => {
        const isActive = btn === button;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      applyProjectFilter(selectedFilter);
    });
  });

  projectCards.forEach((card) => {
    card.addEventListener('animationend', () => {
      card.classList.remove('filter-in');
    });
  });

  applyProjectFilter('all');
}
