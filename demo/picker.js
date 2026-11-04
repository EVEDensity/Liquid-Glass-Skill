import { createLiquidGlassButton } from '../assets/glass-button.js';
import { buttonChoice } from './button-choice.js';

const stage = document.querySelector('#preview');
const sample = document.querySelector('#sample');
const form = document.querySelector('form');
const submit = document.querySelector('#submit');
const status = document.querySelector('#status');
const headers = {Authorization:'Bearer '+location.hash.slice(1),'Content-Type':'application/json'};
const source = document.createElement('canvas');
source.width = source.height = 4;
const ctx = source.getContext('2d');
const choice = () => Object.fromEntries(new FormData(form));

try {
  const response = await fetch('/selection',{headers});
  if (!response.ok) throw new Error('Picker session unavailable');
  const context = await response.json();
  stage.style.background = context.background;
  ctx.fillStyle = context.background;
  ctx.fillRect(0,0,4,4);
  const [r,g,b] = ctx.getImageData(0,0,1,1).data;
  stage.style.setProperty('--sample-ink',r*.213+g*.715+b*.072>135?'#17242b':'#f7f8ff');
  let preview;
  function refresh() {
    preview?.disposeLiquidGlass?.();
    preview?.remove();
    preview = createLiquidGlassButton(sample,buttonChoice(choice(),context),{stage,source,requireExact:true});
    preview.addEventListener('pointermove',event=>event.stopImmediatePropagation(),true);
  }
  refresh();
  form.addEventListener('change',refresh);
  submit.disabled = false;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    submit.disabled = true;
    try {
      const result = await fetch('/selection',{method:'POST',headers,body:JSON.stringify(choice())});
      if (!result.ok) throw new Error('Submission failed');
      for (const select of form.querySelectorAll('select')) select.disabled = true;
      status.textContent = '已发送给 Codex，可以返回聊天窗口。';
    } catch {
      status.textContent = '提交失败，请重试或返回聊天窗口。';
      submit.disabled = false;
    }
  });
} catch {
  status.textContent = '当前预览会话不可用，请让 Codex 重新打开选样页面。';
}
