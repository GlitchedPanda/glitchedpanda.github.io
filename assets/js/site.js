(() => {
  'use strict';

  document.body.classList.add('js');
  const toggle = document.querySelector('.nav-toggle');
  const navigation = document.getElementById('main-navigation');
  if (!toggle || !navigation) return;

  const mobile = window.matchMedia('(max-width: 760px)');

  function setOpen(open) {
    navigation.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-inner')) setOpen(false);
  });

  mobile.addEventListener('change', () => {
    // Keep keyboard focus visible when resizing into the collapsed layout.
    if (mobile.matches && navigation.contains(document.activeElement)) toggle.focus();
    setOpen(false);
  });
})();
