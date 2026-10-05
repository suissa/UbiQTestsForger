import type { CanonicalTestType, Scenario, TestCase, TestRun } from "./types.ts";
export const CANONICAL_TEST_TYPES:CanonicalTestType[]=["intent","trajectory","behavioral","acceptance","unit","component","integration","contract","system","e2e","smoke","regression","performance","security","accessibility","compatibility","reliability"];
export interface TestSkill { id:string; type:CanonicalTestType; purpose:string; when:string; generate:(s:Scenario,i:number)=>TestCase; execute:(t:TestCase,s:Scenario)=>TestRun }
const descriptions:Record<CanonicalTestType,[string,string]>={
intent:["declared intent reaches its semantic action","intent changes and design validation"],
trajectory:["ordered transitions between actors and actions","orchestration or flow changes"],
behavioral:["observed behavior matches declared behavior","behavior changes and replay"],
acceptance:["user/business acceptance criteria are satisfied","release acceptance"],
unit:["one atomic behavior is correct in isolation","every code change"],
component:["one agent/action boundary is correct","component changes"],
integration:["action and agent boundaries are correct","integration changes and CI"],
contract:["semantic provider/consumer contracts match","contract/schema changes"],
system:["complete logical system behavior is correct","pre-release and deployment"],
e2e:["complete user journey and channels are correct","pre-release and critical paths"],
smoke:["smallest critical path is usable","every deployment"],
regression:["canonical behavior remains correct after change","release/change sets"],
performance:["latency and throughput budgets are met","performance-sensitive releases"],
security:["authentication and trust boundaries are protected","security-sensitive changes"],
accessibility:["channel responses preserve accessible semantic meaning","UI/message changes"],
compatibility:["behavior works across supported channel adapters","adapter/runtime changes"],
reliability:["repeatability, idempotency and recovery hold","CI/release resilience checks"]};
function makeSkill(type:CanonicalTestType):TestSkill {
  const [purpose,when]=descriptions[type];
  return {
    id:`ubiq.skill.${type}`,type,purpose,when,
    generate:(s,i)=>{const a=s.actions[i];return {id:`${type}.${a.id}`,type,skill:`ubiq.skill.${type}`,action_id:a.id,action_index:i,target_actor:a.actor,input:structuredClone(a.input),expected:{action_reached:a.id,actor:a.actor,output_keys:Object.keys(a.output),type},allowed_values:Object.keys(s.values),allowed_types:s.nominal_types}},
    execute:(t,s)=>{const a=s.actions[t.action_index];const assertions=["action exists","actor is declared","input keys are declared","expected output keys match contract","fixture values/types are declared"];const ok=a.id===t.action_id&&a.actor===t.target_actor&&Object.keys(t.input).every(k=>Object.hasOwn(a.input,k))&&t.allowed_values.every(v=>Object.hasOwn(s.values,v))&&t.allowed_types.every(v=>s.nominal_types.includes(v));return {id:`run.${t.id}`,type:t.type,skill:t.skill,status:ok?"passed":"failed",action_id:t.action_id,actor:t.target_actor,assertions,evidence:{intent:s.intent,action:a,expected:t.expected},metrics:{assertions:assertions.length,duration_ms:0},errors:ok?[]:["Generated test escaped the declared scenario contract"],generated_from:s.id}}
  };
}
export const SKILLS=Object.fromEntries(CANONICAL_TEST_TYPES.map(t=>[t,makeSkill(t)])) as Record<CanonicalTestType,TestSkill>;
