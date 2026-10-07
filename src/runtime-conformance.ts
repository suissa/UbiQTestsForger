export type RuntimeConformanceTransport = "http"|"websocket";
export interface RuntimeConformanceCase {id:string;transport:RuntimeConformanceTransport;obligation:string}
export const RUNTIME_CONFORMANCE_CASES:readonly RuntimeConformanceCase[]=[
{id:"http.success",transport:"http",obligation:"successful response emits transport evidence and successful state"},
{id:"http.unexpected_status",transport:"http",obligation:"unexpected status fails closed with error evidence"},
{id:"http.timeout",transport:"http",obligation:"timeout fails closed with error evidence"},
{id:"http.missing_binding",transport:"http",obligation:"missing binding fails closed without fallback"},
{id:"http.failed_state_guard",transport:"http",obligation:"failed execution produces no successful output or state"},
{id:"websocket.success",transport:"websocket",obligation:"open/send/receive produces successful state"},
{id:"websocket.multi_message",transport:"websocket",obligation:"receive.messages requires the declared message count"},
{id:"websocket.close_before_receive",transport:"websocket",obligation:"closure before required messages fails closed"},
{id:"websocket.close_before_open",transport:"websocket",obligation:"closure before open fails closed"},
{id:"websocket.transport_error",transport:"websocket",obligation:"transport error fails closed with error evidence"}
];
export function validateRuntimeConformanceMatrix():string[]{const ids=new Set<string>();const errors:string[]=[];for(const c of RUNTIME_CONFORMANCE_CASES){if(ids.has(c.id))errors.push("duplicate conformance case "+c.id);ids.add(c.id)}if(RUNTIME_CONFORMANCE_CASES.length!==10)errors.push("expected 10 runtime conformance cases");return errors}
