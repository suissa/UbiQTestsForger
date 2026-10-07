export type EvidenceKind="event"|"state"|"trace"|"log"|"metric"|"error";
export interface Evidence{id:string;kind:EvidenceKind;sequence:number;timestamp:number;actionId?:string;actor?:string;channel?:string;payload?:Record<string,unknown>;source:string;error?:string}
export class EvidenceCollector{private readonly items:Evidence[]=[];emit(e:Omit<Evidence,"id">){const item={...e,id:"evidence."+String(this.items.length+1).padStart(4,"0")};this.items.push(Object.freeze(item));return item}all(){return this.items as readonly Evidence[]}}
export function serializeEvidence(e:readonly Evidence[]){return JSON.stringify(e,null,2)}
