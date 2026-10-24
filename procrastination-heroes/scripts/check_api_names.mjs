import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const root=path.resolve(import.meta.dirname,'..')
const frontend=path.join(root,'frontend')
const {build}=await import(pathToFileURL(path.join(frontend,'node_modules/vite/dist/node/index.js')).href)
const temporary=path.join(root,'.local/api-name-check')
await fs.mkdir(temporary,{recursive:true})
const entries=[]
for(const domain of await fs.readdir(path.join(frontend,'src/apis'))){
 for(const file of await fs.readdir(path.join(frontend,'src/apis',domain))){if(file.endsWith('API.ts'))entries.push({name:file.slice(0,-3),file:path.join(frontend,'src/apis',domain,file)})}
}
const source=entries.map(e=>`import { ${e.name} } from ${JSON.stringify(e.file)}`).join('\n')+`\nimport {apiNameOf} from ${JSON.stringify(path.join(frontend,'src/system/api/apiNameOf.ts'))}\nexport const results=[`+entries.map(e=>`[${JSON.stringify(e.name.toLowerCase())},apiNameOf(Reflect.construct(${e.name},[]))]`).join(',')+']\n'
const entry=path.join(temporary,'entry.ts');await fs.writeFile(entry,source)
const built=await build({root:frontend,configFile:path.join(frontend,'vite.config.ts'),logLevel:'warn',build:{write:false,lib:{entry,formats:['es'],fileName:'contract'},rolldownOptions:{output:{keepNames:true,manualChunks:undefined}},emptyOutDir:false}})
const outputs=(Array.isArray(built)?built:[built]).flatMap(x=>x.output||[])
const chunk=outputs.find(x=>x.type==='chunk'&&x.isEntry)
if(!chunk)throw Error('API contract output not found')
const module=await import('data:text/javascript;base64,'+Buffer.from(chunk.code).toString('base64'))
const errors=module.results.filter(([expected,actual])=>expected!==actual)
if(errors.length)throw Error('Minification changed API route names: '+JSON.stringify(errors))
console.log(`PASS: all ${module.results.length} frontend API route names survive production bundling.`)
