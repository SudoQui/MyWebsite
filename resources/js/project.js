const revealTargets = [...document.querySelectorAll('.reveal')];
const counterTargets = [...document.querySelectorAll('[data-counter]')];

if (revealTargets.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (counterTargets.length > 0) {
  const animateCounter = (element) => {
    const target = Number(element.dataset.counter);
    if (!Number.isFinite(target)) {
      return;
    }

    if (reducedMotion) {
      element.textContent = String(target);
      return;
    }

    const duration = 1000;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(target * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counterTargets.forEach((counter) => counterObserver.observe(counter));
}
