import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {CANONICAL_TEST_TYPES,SKILLS} from "./skills.ts";
import type {Scenario,TestCase,TestRun} from "./types.ts";

export function generateTests(s:Scenario):TestCase[]{
  const out:TestCase[]=[];
  for(const type of CANONICAL_TEST_TYPES) for(let i=0;i<s.actions.length;i++) out.push(SKILLS[type].generate(s,i));
  return out;
}
export function executeTests(s:Scenario,t:TestCase[]):TestRun[]{return t.map(x=>SKILLS[x.type].execute(x,s))}
function refs(value:unknown):string[]{if(value&&typeof value==="object"){if("$ref" in value&&typeof (value as any).$ref==="string")return [(value as any).$ref];return Object.values(value).flatMap(refs)}return[]}
export function validateGeneratedTests(s:Scenario,t:TestCase[]):string[]{
  const e:string[]=[];const values=new Set(Object.keys(s.values));const types=new Set(s.nominal_types);
  for(const x of t){
    const a=s.actions[x.action_index];
    if(!a){e.push(`${x.id}: action index is invalid`);continue}
    for(const v of x.allowed_values)if(!values.has(v))e.push(`${x.id}: undeclared value ${v}`);
    for(const ty of x.allowed_types)if(!types.has(ty))e.push(`${x.id}: undeclared type ${ty}`);
    for(const k of Object.keys(x.input))if(!Object.hasOwn(a.input,k))e.push(`${x.id}: undeclared input ${k}`);
    for(const ref of refs(x.input)){if(!ref.startsWith("values.")||!values.has(ref.slice(7)))e.push(`${x.id}: undeclared fixture reference ${ref}`)}
    for(const ty of a.semantic_types)if(!types.has(ty))e.push(`${x.id}: undeclared action semantic type ${ty}`);
  }return e
}
export async function materialize(root:string,s:Scenario,t:TestCase[],r:TestRun[]){
  await mkdir(join(root,"tests","generated"),{recursive:true});
  await writeFile(join(root,"tests","generated","manifest.json"),JSON.stringify({scenario:s.id,count:t.length,canonical_types:CANONICAL_TEST_TYPES,actions:s.actions.map(a=>a.id),status:r.every(x=>x.status==="passed")?"passed":"failed"},null,2));
  for(const type of CANONICAL_TEST_TYPES) await writeFile(join(root,"tests","generated",`${type}.json`),JSON.stringify({skill:SKILLS[type].id,purpose:SKILLS[type].purpose,when:SKILLS[type].when,cases:t.filter(x=>x.type===type),results:r.filter(x=>x.type===type)},null,2));
  await writeFile(join(root,"tests","generated","result.json"),JSON.stringify({scenario:s.id,total:r.length,passed:r.filter(x=>x.status==="passed").length,failed:r.filter(x=>x.status==="failed").length,runs:r},null,2))
}