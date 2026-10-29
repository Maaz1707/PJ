/* Progressive motion: content stays visible if animation APIs are unavailable. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = '.categories > a, .tile-grid > a, .section-title, .featured-products > .product, .products > .product, .banner-pair > a, .collection-banner, .discovery, .services > button, .footer-top, .newsletter, .detail-photo, .detail-content, .shop-intro';
  let observer;
  let scheduled = false;
  const observed = new WeakSet();
  function reveal(element) {
    element.classList.remove('motion-pending');
    observer?.unobserve(element);
  }
  function scan() {
    scheduled = false;
    if (preference.matches || !observer) return;
    document.querySelectorAll(targets).forEach(element => {
      if (observed.has(element)) return;
      observed.add(element);
      const siblings = Array.from(element.parentElement.children);
      element.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(element) % 4, 3) * 65}ms`);
      element.classList.add('motion-reveal', 'motion-pending');
      observer.observe(element);
    });
  }
  function configure() {
    observer?.disconnect();
    document.querySelectorAll('.motion-pending').forEach(reveal);
    if (preference.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
    scan();
  }
  new MutationObserver(() => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(scan);
    }
  }).observe(document.querySelector('main'), { childList: true, subtree: true });
  document.addEventListener('focusin', event => {
    const element = event.target.closest('.motion-pending');
    if (element) reveal(element);
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('.wish, .primary, .hero-dots button');
    if (!preference.matches && button?.animate) {
      button.animate([
        { scale: '1' }, { scale: '.96' }, { scale: '1' }
      ], { duration: 240, easing: 'ease-out' });
    }
  });
  let ticking = false;
  const updateHeader = () => {
    const header = document.querySelector('header');
    header.classList.toggle('is-scrolled', scrollY > 24);
    const travel = document.documentElement.scrollHeight - innerHeight;
    header.style.setProperty('--scroll-progress', travel > 0 ? Math.min(1, scrollY / travel) : 0);
    const hero = document.querySelector('.hero');
    const heroImage = document.querySelector('#hero-image');
    if (hero && heroImage) {
      const rect = hero.getBoundingClientRect();
      const distance = Math.max(0, Math.min(-rect.top, rect.height));
      heroImage.style.transform = preference.matches ? '' : `translateY(${Math.min(distance * .09, 35)}px) scale(1.065)`;
    }
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); }
  }, { passive: true });
  preference.addEventListener('change', configure);
  preference.addEventListener('change', updateHeader);
  addEventListener('resize', updateHeader, { passive: true });

  // Gentle image depth follows fine pointers only; scrolling remains native.
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let hovered = null;
  let pointerFrame = 0;
  let point = { x: 0, y: 0 };
  const resetHover = () => {
    if (!hovered) return;
    ['--tilt-x', '--tilt-y', '--spot-x', '--spot-y'].forEach(name => hovered.style.removeProperty(name));
    hovered.classList.remove('motion-depth');
    hovered = null;
  };
  document.addEventListener('pointermove', event => {
    if (preference.matches || !finePointer.matches) return;
    const target = event.target.closest('.product .photo, .tile-grid > a, .banner-pair > a');
    if (target !== hovered) { resetHover(); hovered = target; }
    if (!hovered) return;
    point = { x: event.clientX, y: event.clientY };
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!hovered?.isConnected) { resetHover(); return; }
      const rect = hovered.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (point.x - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (point.y - rect.top) / rect.height));
      hovered.classList.add('motion-depth');
      hovered.style.setProperty('--tilt-x', `${(0.5 - y) * 2.4}deg`);
      hovered.style.setProperty('--tilt-y', `${(x - 0.5) * 2.4}deg`);
      hovered.style.setProperty('--spot-x', `${x * 100}%`);
      hovered.style.setProperty('--spot-y', `${y * 100}%`);
    });
  }, { passive: true });
  document.addEventListener('pointerleave', resetHover);
  preference.addEventListener('change', resetHover);
  document.addEventListener('load', event => {
    if (event.target.id === 'hero-image' && !preference.matches && event.target.animate) {
      event.target.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 650, easing: 'ease-out' });
      updateHeader();
    }
  }, true);

  // Keep the header stable while native view transitions blend page content.
  const originalRoute = window.route;
  if (typeof originalRoute === 'function') {
    removeEventListener('hashchange', originalRoute);
    let activeTransition;
    addEventListener('hashchange', () => {
      resetHover();
      activeTransition?.skipTransition();
      if (preference.matches || !document.startViewTransition) {
        originalRoute(); updateHeader(); return;
      }
      const transition = document.startViewTransition(() => { originalRoute(); updateHeader(); });
      activeTransition = transition;
      // Rapid navigation deliberately skips the previous snapshot animation.
      transition.ready.catch(() => {});
      transition.finished.catch(() => {}).finally(() => {
        if (activeTransition === transition) activeTransition = null;
      });
    });
  }
  configure();
  updateHeader();
})();
