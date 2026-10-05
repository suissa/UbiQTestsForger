import { readFile } from "node:fs/promises";
import type { Scenario } from "./types.ts";
export async function readYamlJson<T>(path:string):Promise<T>{return JSON.parse(await readFile(path,"utf8")) as T}
export async function loadScenario(root:string):Promise<Scenario>{return readYamlJson<Scenario>(`${root}/intent/configs/behavior.yml`)}
