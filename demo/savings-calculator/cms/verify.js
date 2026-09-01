const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = '/home/user/sestek/demo/savings-calculator/cms';

for (const slug of ['speech-analytics','automated-quality-management','conversational-ivr','virtual-agent','voice-biometrics']) {
  const html = fs.readFileSync(path.join(dir, slug + '.calculator-code.html'), 'utf8');

  // fake DOM: input values by name, text nodes by id
  const inputs = {}, texts = {};
  for (const m of html.matchAll(/<input\b[^>]*>/g)) {
    const tag = m[0];
    const name = /name="([^"]+)"/.exec(tag);
    if (!name) continue;
    const val = /value="([^"]*)"/.exec(tag);
    inputs[name[1]] = val ? val[1] : '';
  }
  for (const m of html.matchAll(/id="(monthly_savings|anual_savings|saving_fte)"/g)) texts[m[1]] = '';

  const $ = (sel) => {
    const names = [...String(sel).matchAll(/input\[name="([^"]+)"\]/g)].map(x => x[1]);
    if (names.length) return { on(){}, val(v){ if (v === undefined) return inputs[names[0]]; names.forEach(n => inputs[n] = v); }, text(){} };
    const id = /^#(.+)$/.exec(sel);
    if (id) return { on(){}, text(v){ if (v === undefined) return texts[id[1]]; texts[id[1]] = v; }, val(){} };
    throw new Error('unhandled selector: ' + sel);
  };

  const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  const ctx = { $, document: { addEventListener(){} }, Math, Array, parseFloat, isNaN, isFinite, Number, String };
  vm.createContext(ctx);
  vm.runInContext(script + '\ncalculate_roi();', ctx);

  const outs = Object.entries(inputs).filter(([k]) => !['number_of_agents','cost_per_agent','total_calls','total_inquiries','calls_req_auth','number_of_leaders','cost_per_leader','number_of_qm','cost_per_qm'].includes(k));
  console.log(slug);
  console.log('   monthly=' + texts.monthly_savings + '  annual=' + texts.anual_savings + '  fte=' + texts.saving_fte);
  console.log('   fields: ' + outs.map(([k,v]) => k + '=' + v).join('  '));
}
