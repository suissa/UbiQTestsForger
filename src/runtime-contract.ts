import type {Action,RuntimeBinding} from "./types.ts";
import type {RuntimeConfig} from "./runtime-config.ts";

export interface RuntimeContractEntry {
  action_id:string; declared:boolean; bound:boolean;
  protocol?:RuntimeBinding["protocol"]; url?:string; method?:RuntimeBinding["method"];
  action_semantic_types:string[]; runtime_semantic_types?:string[];
  input_fields:string[]; runtime_input_fields?:string[];
  output_fields:string[]; runtime_output_fields?:string[];
  transport_compatible:boolean; semantic_compatible:boolean;
  valid:boolean; errors:string[];
}
export interface RuntimeContract { scenario:string; required_actions:string[]; entries:RuntimeContractEntry[]; valid:boolean; errors:string[]; }

function sameSet(expected:string[],actual:string[]):boolean {
  return expected.length===actual.length&&expected.every(value=>actual.includes(value));
}

function semanticErrors(action:Action,binding:RuntimeBinding):string[] {
  const errors:string[]=[];
  const inputFields=Object.keys(action.input);
  const outputFields=Object.keys(action.output);
  if(binding.protocol==="http"&&["GET","DELETE"].includes(binding.method??"")&&inputFields.length>0)
    errors.push("runtime transport cannot carry declared input fields for "+action.id);
  if(binding.semantic_types!==undefined&&!sameSet(action.semantic_types,binding.semantic_types))
    errors.push("runtime semantic types do not match action semantic types for "+action.id);
  if(binding.input_fields!==undefined&&!sameSet(inputFields,binding.input_fields))
    errors.push("runtime input fields do not match action input fields for "+action.id);
  if(binding.output_fields!==undefined&&!sameSet(outputFields,binding.output_fields))
    errors.push("runtime output fields do not match action output fields for "+action.id);
  return errors;
}

export function validateRuntimeSemanticCompatibility(action:Action,binding:RuntimeBinding):string[] {
  return semanticErrors(action,binding);
}

export function buildRuntimeContract(scenario:string,actions:Action[]|string[],config:RuntimeConfig,validationErrors:string[]=[]):RuntimeContract {
  const declaredActions:Action[]=typeof actions[0]==="string"
    ? actions.map(id=>({id:String(id),actor:"",input:{},output:{},semantic_types:[]})) as Action[]
    : actions as Action[];
  const entries=declaredActions.map(action=>{
    const binding=config.bindings?.[action.id];
    const input_fields=Object.keys(action.input);
    const output_fields=Object.keys(action.output);
    const runtime_input_fields=binding?.input_fields;
    const runtime_output_fields=binding?.output_fields;
    const runtime_semantic_types=binding?.semantic_types;
    const compatibilityErrors=binding?semanticErrors(action,binding):[];
    const declaredErrors=validationErrors.filter(error=>error==="missing runtime binding for "+action.id||error.endsWith(" for "+action.id));
    const errors=[...declaredErrors,...compatibilityErrors];
    return {
      action_id:action.id, declared:true, bound:!!binding,
      protocol:binding?.protocol, url:binding?.url, method:binding?.method,
      action_semantic_types:[...action.semantic_types], runtime_semantic_types,
      input_fields, runtime_input_fields, output_fields, runtime_output_fields,
      transport_compatible:binding? !compatibilityErrors.some(error=>error.includes("transport")):false,
      semantic_compatible:binding? !compatibilityErrors.some(error=>error.includes("semantic types")||error.includes("input fields")||error.includes("output fields")):false,
      valid:!!binding&&errors.length===0, errors
    };
  });
  const errors=[...validationErrors,...entries.flatMap(entry=>entry.errors.filter(error=>!validationErrors.includes(error)))];
  return {scenario,required_actions:declaredActions.map(action=>action.id),entries,valid:errors.length===0,errors};
}
