const glassMenuLabels = {
  en: { title:'More actions', copy:'Copy', share:'Share', rename:'Rename', close:'Close', name:'Menu name' },
  zh: { title:'更多操作', copy:'复制', share:'分享', rename:'重命名', close:'关闭', name:'菜单名称' }
};

let glassMenuCount = 0;

export function createGlassMenu(title, schedule) {
  const piece = document.createElement('div');
  piece.className = 'glass more-glass';
  piece.innerHTML = `
    <div class="more-surface">
      <button type="button" class="more-trigger" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/>
        </svg>
      </button>
      <div class="more-actions" role="group" inert>
        <button type="button" data-menu-action="copy"></button>
        <button type="button" data-menu-action="share"></button>
        <button type="button" data-menu-action="rename"></button>
        <form hidden><input maxlength="80"></form>
        <button type="button" data-menu-action="close"></button>
      </div>
    </div>`;
  const surface = piece.querySelector('.more-surface');
  const trigger = piece.querySelector('.more-trigger');
  const actions = piece.querySelector('.more-actions');
  const rows = [...actions.querySelectorAll('button')];
  const form = actions.querySelector('form');
  const name = form.querySelector('input');
  const rename = rows.find(row=>row.dataset.menuAction==='rename');
  actions.id = 'glass-menu-actions-'+ ++glassMenuCount;
  trigger.setAttribute('aria-controls',actions.id);
  piece.glassMenuTitle = title || '';

  function stopRename() {
    form.hidden = true;
    rename.hidden = false;
  }

  function setOpen(open, returnFocus = false) {
    if (piece.hasAttribute('data-menu-open')===open) return;
    piece.toggleAttribute('data-menu-open',open);
    trigger.setAttribute('aria-expanded',String(open));
    trigger.inert = open;
    actions.inert = !open;
    if (open) rows[0].focus({preventScroll:true});
    else {
      stopRename();
      if (returnFocus) trigger.focus({preventScroll:true});
    }
    schedule();
  }

  piece.setGlassMenuLanguage = language=>{
    const labels = glassMenuLabels[language];
    const label = piece.glassMenuTitle || labels.title;
    trigger.setAttribute('aria-label',label);
    trigger.title = label;
    actions.setAttribute('aria-label',label);
    name.setAttribute('aria-label',labels.name);
    rows.forEach(row=>row.textContent=labels[row.dataset.menuAction]);
  };
  piece.closeGlassMenu = ()=>setOpen(false);
  trigger.addEventListener('click',()=>{
    piece.dispatchEvent(new CustomEvent('glassmenuopen',{bubbles:true}));
    setOpen(true);
  });
  actions.addEventListener('click',event=>{
    const action = event.target.closest('[data-menu-action]')?.dataset.menuAction;
    if (!action) return;
    if (action==='rename') {
      form.hidden = false;
      name.value = piece.glassMenuTitle;
      name.placeholder = trigger.getAttribute('aria-label');
      name.focus({preventScroll:true});
      name.select();
      rename.hidden = true;
      return;
    }
    if (action!=='close') {
      piece.dispatchEvent(new CustomEvent('glassmenuaction',{bubbles:true,detail:{action}}));
    }
    setOpen(false,true);
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    piece.glassMenuTitle = name.value.trim();
    piece.setGlassMenuLanguage(document.documentElement.lang.startsWith('zh')?'zh':'en');
    stopRename();
    rename.focus({preventScroll:true});
  });
  piece.addEventListener('keydown',event=>{
    if (event.key!=='Escape' || !piece.hasAttribute('data-menu-open')) return;
    event.stopPropagation();
    if (form.hidden) setOpen(false,true);
    else {
      stopRename();
      rename.focus({preventScroll:true});
    }
  });
  for (const type of ['transitionrun','transitionend','transitioncancel']) surface.addEventListener(type,schedule);
  return piece;
}
