import type {Action} from "./types.ts";

export interface RuntimeOutputContract {
  action_id:string;
  required_fields:string[];
  expected:Record<string,unknown>;
}

function resolve(value:unknown,values:Record<string,unknown>):unknown{
  if(value&&typeof value==="object"&&"$ref" in value){
    const ref=(value as {$ref:string}).$ref;
    if(ref.startsWith("values.")) return values[ref.slice(7)];
  }
  if(Array.isArray(value)) return value.map(item=>resolve(item,values));
  if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,resolve(item,values)]));
  return value;
}
function equal(a:unknown,b:unknown):boolean{
  if(Object.is(a,b)) return true;
  if(!a||!b||typeof a!=="object"||typeof b!=="object") return false;
  if(Array.isArray(a)||Array.isArray(b)) return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
  const ak=Object.keys(a as object),bk=Object.keys(b as object);
  return ak.length===bk.length&&ak.every(key=>Object.hasOwn(b as object,key)&&equal((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]));
}

export function buildRuntimeOutputContract(action:Action,values:Record<string,unknown>):RuntimeOutputContract{
  return {action_id:action.id,required_fields:Object.keys(action.output),expected:resolve(action.output,values) as Record<string,unknown>};
}

export function validateRuntimeOutput(action:Action,output:Record<string,unknown>,values:Record<string,unknown>):string[]{
  const expected=buildRuntimeOutputContract(action,values).expected;
  const errors:string[]=[];
  for(const field of Object.keys(expected)){
    if(!Object.hasOwn(output,field)) errors.push("runtime output missing field "+field+" for "+action.id);
    else if(!equal(output[field],expected[field])) errors.push("runtime output mismatch for "+action.id+" field "+field);
  }
  return errors;
}
