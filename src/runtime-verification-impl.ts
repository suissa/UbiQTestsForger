import type {Action} from "./types.ts";
import type {RuntimeResult} from "./runtime.ts";
import type {Evidence} from "./evidence.ts";
import {validateRuntimeOutput} from "./runtime-output.ts";

export interface RuntimeVerificationCheck { id:string; action_id:string; passed:boolean; details:string }
export interface RuntimeVerification { scenario:string; passed:boolean; checks:RuntimeVerificationCheck[]; errors:string[] }

export function verifyRuntimeContract(scenario:string, actions:Action[], results:RuntimeResult[], evidence:readonly Evidence[], state:Record<string,unknown>, values:Record<string,unknown>):RuntimeVerification {
  const checks:RuntimeVerificationCheck[]=[];
  const add=(id:string,action_id:string,passed:boolean,details:string)=>checks.push({id,action_id,passed,details});
  const byId=new Map(actions.map(action=>[action.id,action]));
  const resultIds=new Set<string>();
  for(const result of results){
    const action=byId.get(result.actionId);
    resultIds.add(result.actionId);
    if(!action){add("declared-action",result.actionId,false,"runtime returned an undeclared action");continue}
    const observed=evidence.filter(item=>item.actionId===result.actionId);
    add("transport-evidence",result.actionId,observed.some(item=>item.kind==="event"),"requires observed transport event");
    if(result.ok){
      add("output-contract",result.actionId,validateRuntimeOutput(action,result.output,values).length===0,"output must satisfy declared action contract");
      add("state-commit",result.actionId,Object.hasOwn(state,result.actionId),"successful execution must commit state");
      add("error-absence",result.actionId,!observed.some(item=>item.kind==="error"),"successful execution cannot have error evidence");
    } else {
      add("fail-closed-output",result.actionId,Object.keys(result.output).length===0,"failed execution must not expose output");
      add("fail-closed-state",result.actionId,!Object.hasOwn(state,result.actionId),"failed execution must not commit state");
      add("error-evidence",result.actionId,observed.some(item=>item.kind==="error"),"failed execution must emit error evidence");
    }
  }
  for(const action of actions) if(!resultIds.has(action.id)) add("execution-presence",action.id,false,"declared action was not executed");
  for(const key of Object.keys(state)) add("state-provenance",key,!!results.find(result=>result.actionId===key&&result.ok),"state must come from a successful action");
  const errors=checks.filter(check=>!check.passed).map(check=>check.action_id+" ["+check.id+"]: "+check.details);
  return {scenario,passed:errors.length===0,checks,errors};
}
