(function(){
  const wrapper = document.getElementById('discord-copy');
  if (!wrapper) return;
  const codeEl = wrapper.querySelector('code');
  const tooltip = wrapper.querySelector('.copy-tooltip');
  let hideTimer = null;

  function showTooltip(text) {
    tooltip.textContent = text;
    wrapper.classList.add('show-tooltip');
  }

  function hideTooltip() {
    wrapper.classList.remove('show-tooltip');
  }

  function copyText() {
    const text = codeEl.textContent.trim();
    if (!navigator.clipboard) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); }
      catch(e) { /* ignore */ }
      ta.remove();
      onCopied();
      return;
    }
    navigator.clipboard.writeText(text).then(onCopied).catch(()=>{
      showTooltip('Failed');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideTooltip, 1500);
    });
  }

  function onCopied(){
    wrapper.classList.add('copied');
    showTooltip('Copied!');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(()=>{
      wrapper.classList.remove('copied');
      hideTooltip();
    }, 1600);
  }

  wrapper.addEventListener('click', (e)=>{ copyText(); });
  wrapper.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyText(); }
  });
  wrapper.addEventListener('mouseenter', ()=>{ showTooltip('Copy'); });
  wrapper.addEventListener('focus', ()=>{ showTooltip('Copy'); });
  wrapper.addEventListener('mouseleave', ()=>{ hideTooltip(); });
  wrapper.addEventListener('blur', ()=>{ hideTooltip(); });
})();
