(() => {
  'use strict';

  const button = document.getElementById('discord-copy');
  const feedback = document.getElementById('copy-feedback');
  if (!button || !feedback) return;
  const username = button.querySelector('code').textContent.trim();
  let resetTimer;

  function legacyCopy() {
    const field = document.createElement('textarea');
    field.value = username;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      field.remove();
      button.focus({ preventScroll: true });
    }
  }

  button.addEventListener('click', async () => {
    clearTimeout(resetTimer);
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(username);
        copied = true;
      }
    } catch {
      // Older browsers and denied clipboard access can still support copy.
    }
    if (!copied) copied = legacyCopy();

    button.classList.toggle('copied', copied);
    feedback.textContent = copied ? 'Username copied!' : `Couldn’t copy. Username: ${username}`;
    button.setAttribute('aria-label', copied ? 'Discord username copied. Copy again' : `Copy Discord username ${username}`);
    if (copied) {
      resetTimer = setTimeout(() => {
        button.classList.remove('copied');
        button.setAttribute('aria-label', `Copy Discord username ${username}`);
        feedback.textContent = 'Click to copy username';
      }, 2500);
    }
  });
})();
