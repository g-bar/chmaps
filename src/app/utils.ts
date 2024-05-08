import { XMLParser } from 'fast-xml-parser'
export async function parseCapabilities(stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return

  const reader = stream.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))

  const parser = new XMLParser()
  const xml = parser.parse(buffer)
  return xml
}

type Layer = { Name: string; CRS?: string[]; Layer?: Layer }

export function getLayers(xml: { WMS_Capabilities: { Capability: { Layer: { Layer: Layer[] } } } }) {
  const webMercatorLayers = xml.WMS_Capabilities.Capability.Layer.Layer.filter(l => {
    const CRS = l.CRS || l.Layer?.CRS
    if (!CRS) return false
    return CRS.includes('EPSG:3857')
  })

  return webMercatorLayers.map(l => l.Name)
}
