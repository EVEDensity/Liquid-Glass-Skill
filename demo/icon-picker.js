import { createGlassIcon } from '../assets/glass-button.js';

const brands = ['claude','openai','gemini'];
const legacy = ['plus','check','arrow','search','play','heart','star','download','settings','close','sparkles',
  'mail','home','lock','camera','bell','calendar','bookmark','link','eye',...brands];
const popular = [...legacy.filter(id=>!brands.includes(id)), 'user','circle-check','arrow-up-right','chevron-right',
  'menu','sliders-horizontal','share-2','copy','trash-2','image','music','map-pin','shopping-cart','message-circle',
  'cloud','sun','moon','zap','shield','globe','send','folder','code','wifi','monitor','gift','rocket','clock'];
const zhTerms = {
  '添加':'plus add','加号':'plus','勾选':'check','确认':'check','箭头':'arrow','搜索':'search',
  '播放':'play','暂停':'pause','爱心':'heart','喜欢':'heart','星标':'star','下载':'download','上传':'upload',
  '设置':'settings','关闭':'x close','删除':'trash delete','垃圾桶':'trash','复制':'copy','链接':'link',
  '主页':'home house','邮件':'mail','相机':'camera','图片':'image','通知':'bell','日历':'calendar',
  '锁':'lock','用户':'user','购物车':'shopping cart','分享':'share','音乐':'music','云':'cloud',
  '太阳':'sun','月亮':'moon','定位':'map pin','时间':'clock','手机':'smartphone','书签':'bookmark',
  '星星':'star','聊天':'message','编辑':'edit','火箭':'rocket','菜单':'menu','文件夹':'folder','眼睛':'eye',
  '方向':'direction','盾牌':'shield','闪电':'zap','礼物':'gift','飞机':'plane','航班':'airplane'
};
const pageSize = 72;
const legacyEntries = legacy.map(id=>[id,'',undefined]);
const humanize = id=>id.replaceAll('-',' ').replace(/^./,letter=>letter.toUpperCase());
const iconLabel = (strings,id)=>strings['icon'+id[0].toUpperCase()+id.slice(1)] || humanize(id);

export function mountIconPicker({getStrings,onPick}) {
  const launch = document.querySelector('#open-icons');
  const chip = launch.querySelector('.icon-chip-preview');
  const dialog = document.querySelector('#icon-dialog');
  const search = dialog.querySelector('#icon-search');
  const results = dialog.querySelector('#icon-results');
  const grid = dialog.querySelector('#label-icons');
  const count = dialog.querySelector('#icon-result-count');
  const more = dialog.querySelector('#more-icons');
  const clear = dialog.querySelector('#remove-icon');
  const filters = [...dialog.querySelectorAll('[data-icon-filter]')];
  let catalog = new Map(legacyEntries.map(entry=>[entry[0],entry]));
  let request;
  let loaded = false;
  let failed = false;
  let filter = 'popular';
  let visible = pageSize;
  let current = {icon:''};

  async function load() {
    try {
      const response = await fetch(new URL('./lucide-catalog.json',import.meta.url));
      if (!response.ok) throw new Error('Icon catalog could not be loaded');
      const entries = await response.json();
      catalog = new Map(entries.map(entry=>[entry[0],entry]));
      for (const entry of legacyEntries) if (!catalog.has(entry[0])) catalog.set(entry[0],entry);
      loaded = true;
    } catch {
      request = undefined;
      failed = true;
    }
    if (dialog.open) render();
  }

  function sync(typography) {
    current = typography ?? {icon:''};
    const {icon,iconGlyph} = current;
    chip.replaceChildren();
    const preview = createGlassIcon(document,icon || 'plus',iconGlyph);
    if (preview) chip.append(preview);
    const strings = getStrings();
    const label = icon ? iconLabel(strings,icon) : strings.chooseIcon;
    launch.querySelector('[data-i18n]').textContent = label;
    launch.setAttribute('aria-label',icon ? strings.changeIcon.replace('{name}',label) : label);
    clear.disabled = !icon;
  }

  function pick(icon,iconGlyph) {
    onPick(icon,iconGlyph);
    dialog.close();
  }

  function findMatches() {
    const query = search.value.trim().toLowerCase();
    const words = (zhTerms[query] || query).split(/[\s-]+/).filter(Boolean);
    const candidates = filter==='brands' ? brands.map(id=>catalog.get(id)) : [...catalog.values()];
    if (words.length) {
      const phrase = words.join(' ');
      const strings = getStrings();
      const matches = [];
      for (const entry of candidates) {
        const [id,tags] = entry;
        const name = id.replaceAll('-',' ');
        const label = iconLabel(strings,id).toLowerCase();
        const terms = name+' '+tags.toLowerCase()+' '+label;
        if (!words.every(word=>terms.includes(word))) continue;
        const rank = name===phrase || label===phrase ? 0
          : name.startsWith(phrase) || label.startsWith(phrase) ? 1
          : words.every(word=>name.includes(word)) ? 2 : 3;
        matches.push({entry,rank});
      }
      return matches.sort((a,b)=>a.rank-b.rank).map(item=>item.entry);
    }
    if (filter!=='popular') return candidates;
    const ids = new Set([current.icon,...popular]);
    return [...ids].filter(Boolean).map(id=>catalog.get(id) ??
      (id===current.icon && current.iconGlyph ? [id,'',current.iconGlyph] : null)).filter(Boolean);
  }

  function render() {
    const strings = getStrings();
    const matches = findMatches();
    count.textContent = failed ? strings.iconsUnavailable
      : !loaded ? strings.iconsLoading
      : matches.length ? strings.iconCount.replace('{n}',matches.length.toLocaleString())
      : strings.iconsEmpty;
    for (const button of filters) button.setAttribute('aria-pressed',String(button.dataset.iconFilter===filter));
    const items = matches.slice(0,visible);
    const active = items.some(([id])=>id===current.icon) ? current.icon : items[0]?.[0];
    grid.replaceChildren(...items.map(([id,,nodes])=>{
      const option = document.createElement('button');
      option.type = 'button';
      option.dataset.icon = id;
      option.title = iconLabel(strings,id);
      option.setAttribute('aria-label',option.title);
      option.setAttribute('aria-pressed',String(id===current.icon));
      option.tabIndex = id===active ? 0 : -1;
      const icon = createGlassIcon(document,id,nodes);
      if (icon) option.append(icon);
      const label = document.createElement('span');
      label.textContent = option.title;
      option.append(label);
      option.addEventListener('click',()=>pick(id,legacy.includes(id)?undefined:nodes));
      return option;
    }));
    more.hidden = matches.length<=visible;
  }

  function resetResults() {
    visible = pageSize;
    results.scrollTop = 0;
    render();
  }
  launch.addEventListener('click',()=>{
    filter = 'popular';
    search.value = '';
    failed = false;
    if (!loaded) request ??= load();
    resetResults();
    dialog.showModal();
    search.focus();
  });
  dialog.querySelector('#close-icons').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{ if (event.target===dialog) dialog.close(); });
  clear.addEventListener('click',()=>pick(''));
  dialog.addEventListener('close',()=>launch.focus({preventScroll:true}));
  for (const button of filters) button.addEventListener('click',()=>{
    filter = button.dataset.iconFilter;
    if (filter==='popular') search.value = '';
    resetResults();
  });
  search.addEventListener('input',()=>{
    if (filter==='popular' && search.value.trim()) filter = 'all';
    resetResults();
  });
  search.addEventListener('keydown',event=>{
    if (event.key!=='ArrowDown' || !grid.firstElementChild) return;
    event.preventDefault();
    grid.querySelector('[tabindex="0"]').focus();
  });
  grid.addEventListener('keydown',event=>{
    const options = [...grid.children];
    const index = options.indexOf(event.target);
    if (index<0) return;
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const step = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
    const next = event.key==='Home' ? 0 : event.key==='End' ? options.length-1 : index+step;
    if (!Number.isFinite(next)) return;
    event.preventDefault();
    const item = options[Math.max(0,Math.min(options.length-1,next))];
    grid.querySelector('[tabindex="0"]').tabIndex = -1;
    item.tabIndex = 0;
    item.focus();
  });
  more.addEventListener('click',()=>{
    const firstNew = visible;
    visible += pageSize;
    render();
    const next = grid.children[firstNew];
    if (next) {
      grid.querySelector('[tabindex="0"]').tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    }
  });
  return sync;
}
