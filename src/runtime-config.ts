import {readFile} from "node:fs/promises";
import type {RuntimeBinding} from "./types.ts";
import {HttpRuntimeAdapter,WebSocketRuntimeAdapter,type RuntimeAdapter,type RuntimeAdapterOptions} from "./runtime.ts";

export interface RuntimeConfig{bindings:Record<string,RuntimeBinding>;default_timeout_ms?:number}

export async function loadRuntimeConfig(path:string):Promise<RuntimeConfig>{
  return JSON.parse(await readFile(path,"utf8")) as RuntimeConfig;
}

export function adapterFor(actionId:string,config:RuntimeConfig):RuntimeAdapter{
  const binding=config.bindings[actionId];
  if(!binding)throw new Error("missing runtime binding for "+actionId);
  const options:RuntimeAdapterOptions={bindings:config.bindings,defaultTimeoutMs:config.default_timeout_ms};
  return binding.protocol==="http"?new HttpRuntimeAdapter(options):new WebSocketRuntimeAdapter(options);
}

export function validateRuntimeConfig(config:RuntimeConfig,actionIds:string[]):string[]{
  const errors:string[]=[];
  if(!config||typeof config!=="object")return ["runtime config must be an object"];
  if(!config.bindings||typeof config.bindings!=="object"||Array.isArray(config.bindings))return ["runtime config bindings must be an object"];
  if(config.default_timeout_ms!==undefined&&(!Number.isFinite(config.default_timeout_ms)||config.default_timeout_ms<=0))
    errors.push("default_timeout_ms must be a positive finite number");

  const required=new Set(actionIds);
  for(const id of actionIds){
    const binding=config.bindings[id];
    if(!binding){errors.push("missing runtime binding for "+id);continue}
    if(binding.protocol!=="http"&&binding.protocol!=="websocket"){errors.push("invalid runtime protocol for "+id);continue}
    if(typeof binding.url!=="string"||binding.url.length===0){errors.push("missing runtime URL for "+id)}
    else if(!binding.url.includes("${")&&(()=>{try{new URL(binding.url);return false}catch{return true}})())errors.push("invalid runtime URL for "+id);
    if(binding.protocol==="http"){
      if(!binding.method)errors.push("missing HTTP method for "+id);
      else if(!["GET","POST","PUT","PATCH","DELETE"].includes(binding.method))errors.push("invalid HTTP method for "+id);
      if(binding.expect_status!==undefined&&(!Array.isArray(binding.expect_status)||binding.expect_status.some(status=>!Number.isInteger(status)||status<100||status>599)))
        errors.push("invalid expected HTTP status for "+id);
    }
    for(const field of ["semantic_types","input_fields","output_fields"] as const){\n      const value=binding[field];\n      if(value!==undefined&&(!Array.isArray(value)||value.some(item=>typeof item!=="string"||item.length===0))) errors.push("invalid "+field+" for "+id);\n      else if(Array.isArray(value)&&new Set(value).size!==value.length) errors.push("duplicate "+field+" for "+id);\n    }\n    const timeoutMs=binding.timeout_ms;
    if(timeoutMs!==undefined&&(!Number.isFinite(timeoutMs)||timeoutMs<=0))errors.push("invalid timeout for "+id);
    if(binding.protocol==="websocket"&&binding.receive){
      if(binding.receive.timeout_ms!==undefined&&(!Number.isFinite(binding.receive.timeout_ms)||binding.receive.timeout_ms<=0))errors.push("invalid WebSocket receive timeout for "+id);
      if(binding.receive.messages!==undefined&&(!Number.isInteger(binding.receive.messages)||binding.receive.messages<1))errors.push("invalid WebSocket receive message count for "+id);
    }
  }
  for(const id of Object.keys(config.bindings))if(!required.has(id))errors.push("runtime binding is not declared by scenario: "+id);
  return errors;
}
