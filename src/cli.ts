import {loadScenario} from "./scenario.ts";
import {loadRuntimeConfig,adapterFor,validateRuntimeConfig} from "./runtime-config.ts";
import {executeTests,generateTests,materialize,materializeTrajectory,validateGeneratedTests,verifyTrajectory} from "./engine.ts";
import {scenarioTrajectory} from "./trajectory.ts";

const [command,root="examples/2FA-passwordless"]=process.argv.slice(2);
const scenario=await loadScenario(root);
const tests=generateTests(scenario);
const runtimeActionIds=scenarioTrajectory(scenario).nodes.flatMap(node=>node.kind==="hope"&&node.target.includes(".")?[node.target]:[]);

if(command==="check"){
  const errors=validateGeneratedTests(scenario,tests);
  if(errors.length){console.error(errors.join("\n"));process.exitCode=1}else console.log(JSON.stringify({ok:true,generated_tests:tests.length},null,2))
}else if(command==="generate"||command==="run"){
  const runs=executeTests(scenario,tests),errors=validateGeneratedTests(scenario,tests);
  await materialize(root,scenario,tests,runs);
  console.log(JSON.stringify({scenario:scenario.id,generated_tests:tests.length,passed:runs.filter(r=>r.status==="passed").length,failed:runs.filter(r=>r.status==="failed").length,validation_errors:errors},null,2));
  if(errors.length||runs.some(r=>r.status==="failed"))process.exitCode=1
}else if(command==="runtime-check"){
  const configPath=process.argv[3];
  if(!configPath){console.error("runtime-check requires a runtime config path");process.exitCode=1}
  else{
    try{
      const config=await loadRuntimeConfig(configPath);
      const errors=validateRuntimeConfig(config,runtimeActionIds);
      console.log(JSON.stringify({ok:errors.length===0,scenario:scenario.id,bindings:Object.keys(config.bindings??{}).length,errors},null,2));
      if(errors.length)process.exitCode=1
    }catch(error){
      console.error(error instanceof Error?error.message:String(error));
      process.exitCode=1
    }
  }
}else if(command==="trajectory"||command==="coverage"){
  const configPath=process.argv[3];
  const runtimeConfig=configPath?await loadRuntimeConfig(configPath):undefined;
  if(runtimeConfig){
    const configErrors=validateRuntimeConfig(runtimeConfig,scenario.actions.map(a=>a.id));
    if(configErrors.length){console.error(configErrors.join("\n"));process.exitCode=1}
    else{
      const result=await verifyTrajectory(scenario,id=>adapterFor(id,runtimeConfig));
      await materializeTrajectory(root,result);
      console.log(JSON.stringify(command==="coverage"?{scenario:scenario.id,coverage:result.coverage}:{scenario:scenario.id,intent:result.trajectory.intent,matched:result.match.matched,declared:result.match.declared,observed:result.match.observed,diagnostics:result.match.diagnostics,negative:result.negative},null,2));
      if(!result.match.matched||result.negative.some(x=>!x.passed))process.exitCode=1
    }
  }else{
    const result=await verifyTrajectory(scenario);
    await materializeTrajectory(root,result);
    console.log(JSON.stringify(command==="coverage"?{scenario:scenario.id,coverage:result.coverage}:{scenario:scenario.id,intent:result.trajectory.intent,matched:result.match.matched,declared:result.match.declared,observed:result.match.observed,diagnostics:result.match.diagnostics,negative:result.negative},null,2));
    if(!result.match.matched||result.negative.some(x=>!x.passed))process.exitCode=1
  }
}else console.log("Usage: node --experimental-strip-types src/cli.ts <generate|run|check|runtime-check|trajectory|coverage> <example-root> [runtime-config]");
