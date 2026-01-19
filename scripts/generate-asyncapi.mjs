import { TypeScriptGenerator } from '@asyncapi/modelina'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { parse } from 'yaml'
import { dirname } from 'node:path'

const ASYNCAPI_PATH = 'shared/homeassistant-websocket-asyncapi.yaml'
const OUTPUT_PATH = 'shared/generated/homeassistant-ws.ts'

async function generate() {
  // Read and parse the AsyncAPI document
  const content = await readFile(ASYNCAPI_PATH, 'utf-8')
  const asyncapiDocument = parse(content)

  // Create TypeScript generator with options
  const generator = new TypeScriptGenerator({
    modelType: 'interface',
    enumType: 'enum',
    mapType: 'indexedObject',
    useJavaNamingConvention: false,
  })

  // Generate models from the document
  const models = await generator.generate(asyncapiDocument)

  // Build output content with exports and fix reserved keywords
  const header = `// Auto-generated from ${ASYNCAPI_PATH}
// Do not edit manually

`
  // Add 'export' to interfaces and fix 'reservedType' -> 'type', 'reservedEvent' -> 'event'
  const modelsOutput = models
    .map((model) =>
      model.result
        .replace(/^interface /gm, 'export interface ')
        .replace(/reservedType:/g, 'type:')
        .replace(/reservedEvent:/g, 'event:')
    )
    .join('\n\n')

  const output = header + modelsOutput

  // Ensure output directory exists
  await mkdir(dirname(OUTPUT_PATH), { recursive: true })

  // Write output file
  await writeFile(OUTPUT_PATH, output)

  console.log(`Generated ${models.length} models to ${OUTPUT_PATH}`)
}

generate().catch((error) => {
  console.error('Failed to generate AsyncAPI types:', error)
  process.exit(1)
})
