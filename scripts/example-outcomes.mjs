import fs from 'node:fs';import {summarize,evaluate} from '../dist/model.js';import {compareOutcomes,screenEconomics} from '../dist/outcomes.js';
const climate=summarize(JSON.parse(fs.readFileSync(new URL('../dist/data/power-ludhiana.json',import.meta.url))));
const inputs={farm:'Illustrative 10 ha Punjab field',area:10,irrigation:500,organic:1.2,slope:2,dry:0,heat:0,soil:'loam',summer:'rice',winter:'wheat',priority:'balanced',residue:true};
function run(i){const results=evaluate(i,climate),baseline=results.find(r=>r.id==='baseline'),selected=results.find(r=>r.id==='water');return {inputs:i,baseline,selected,outcomes:compareOutcomes(baseline,selected,i.area)}}
const standard=run(inputs),stress=run({...inputs,irrigation:250,dry:30,heat:2});
const economics=screenEconomics({baseline:standard.baseline,selected:standard.selected,area:inputs.area,irrigation:inputs.irrigation,economics:{currency:'INR',pumpingCost:2,marginChange:-3000,transitionCost:5000}});
const example={label:'Constructed demonstration, not a real farm or field trial. Crop coefficients and all economic inputs are illustrative.',climate,standard,stress,economics};
if(process.argv.includes('--write'))fs.writeFileSync(new URL('../docs/EXAMPLE.json',import.meta.url),JSON.stringify(example,null,2)+'\n');
console.log(JSON.stringify({rain:climate.rain,demand:standard.outcomes,stressGap:{baseline:stress.baseline.deficit,selected:stress.selected.deficit},economics},null,2));
