import type {RuntimeBinding} from "./types.ts";
import type {RuntimeConfig} from "./runtime-config.ts";

export interface RuntimeContractEntry {
  action_id: string;
  declared: boolean;
  bound: boolean;
  protocol?: RuntimeBinding["protocol"];
  url?: string;
  method?: RuntimeBinding["method"];
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

export function buildRuntimeContract(scenario: string, actionIds: string[], config: RuntimeConfig, validationErrors: string[] = []): RuntimeContract {
  const entries = actionIds.map(action_id => {
    const binding = config.bindings?.[action_id];
    const errors = validationErrors.filter(error => error.includes(action_id));
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
  return {scenario, required_actions: [...actionIds], entries, valid: validationErrors.length === 0, errors: [...validationErrors]};
}
