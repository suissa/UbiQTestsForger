export type TestStatus = "passed" | "failed";
export type CanonicalTestType = "intent"|"trajectory"|"behavioral"|"acceptance"|"unit"|"component"|"integration"|"contract"|"system"|"e2e"|"smoke"|"regression"|"performance"|"security"|"accessibility"|"compatibility"|"reliability";
export interface Action { id:string; actor:string; input:Record<string,unknown>; output:Record<string,unknown>; depends_on?:string[]; semantic_types:string[] }
export interface Scenario { id:string; intent:string; actors:Record<string,{id:string;role:string}>; actions:Action[]; channels:string[]; values:Record<string,unknown>; nominal_types:string[] }
export interface TestCase { id:string; type:CanonicalTestType; skill:string; action_id:string; action_index:number; target_actor:string; input:Record<string,unknown>; expected:Record<string,unknown>; allowed_values:string[]; allowed_types:string[] }
export interface TestRun { id:string; type:CanonicalTestType; skill:string; status:TestStatus; action_id:string; actor:string; assertions:string[]; evidence:Record<string,unknown>; metrics:Record<string,number>; errors:string[]; generated_from:string }
