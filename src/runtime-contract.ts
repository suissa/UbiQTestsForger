function sameSet(expected: string[], actual: string[]): boolean { return expected.length === actual.length && expected.every(value => actual.includes(value)); }\nimport type {RuntimeBinding} from "./types.ts";
import type {RuntimeConfig} from "./runtime-config.ts";

export interface RuntimeContractEntry {
  action_id: string;
  declared: boolean;
  bound: boolean;
  protocol?: RuntimeBinding["protocol"];
  url?: string;
  method?: RuntimeBinding["method"];
  action_semantic_types: string[];
  runtime_semantic_types?: string[];
  input_fields: string[];
  runtime_input_fields?: string[];
  output_fields: string[];
  runtime_output_fields?: string[];
  transport_compatible: boolean;
  semantic_compatible: boolean;
  valid: boolean;
  errors: string[];
}

export interface RuntimeContract {
  scenario: string;
  required_actions: string[];
  entries: RuntimeContractEntry[];
  valid: boolean;
  errors: string[];
}

export function buildRuntimeContract(scenario: string, actions: import("./types.ts").Action[], config: RuntimeConfig, validationErrors: string[] = []): RuntimeContract {
  const entries = actions.map(action => {
    const action_id = action.id;
    const binding = config.bindings?.[action_id];
    const input_fields = Object.keys(action.input);
    const output_fields = Object.keys(action.output);
    const runtime_input_fields = binding?.input_fields;
    const runtime_output_fields = binding?.output_fields;
    const runtime_semantic_types = binding?.semantic_types;
    const transport_compatible = !!binding && (binding.protocol === "websocket" || !["GET","DELETE"].includes(binding.method ?? "") || input_fields.length === 0);
    const semantic_compatible = !!binding &&
      (runtime_semantic_types === undefined || sameSet(action.semantic_types, runtime_semantic_types)) &&
      (runtime_input_fields === undefined || sameSet(input_fields, runtime_input_fields)) &&
      (runtime_output_fields === undefined || sameSet(output_fields, runtime_output_fields));
    const errors = validationErrors.filter(error => error === "missing runtime binding for " + action_id || error.endsWith(" for " + action_id));
    if (binding && !transport_compatible) errors.push("runtime transport cannot carry declared input fields for " + action_id);
    if (binding && runtime_semantic_types !== undefined && !sameSet(action.semantic_types, runtime_semantic_types)) errors.push("runtime semantic types do not match action semantic types for " + action_id);
    if (binding && runtime_input_fields !== undefined && !sameSet(input_fields, runtime_input_fields)) errors.push("runtime input fields do not match action input fields for " + action_id);
    if (binding && runtime_output_fields !== undefined && !sameSet(output_fields, runtime_output_fields)) errors.push("runtime output fields do not match action output fields for " + action_id);
    return {
      action_id,
      declared: true,
      bound: !!binding,
      protocol: binding?.protocol,
      url: binding?.url,
      valid: !!binding && errors.length === 0,
      errors
    };
  });
  return {scenario, required_actions: actions.map(action => action.id), entries, valid: entries.every(entry => entry.valid) && validationErrors.length === 0, errors: [...validationErrors, ...entries.flatMap(entry => entry.errors.filter(error => !validationErrors.includes(error)))]};
}
