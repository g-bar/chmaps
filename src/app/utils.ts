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

export type Layer = { Name: string; CRS?: string[]; Layer?: Layer; Title: string }
export type DisplayedLayer = Layer & { display: boolean }

export function getLayers(xml: { WMS_Capabilities: { Capability: { Layer: { Layer: Layer[] } } } }) {
  const webMercatorLayers = xml.WMS_Capabilities.Capability.Layer.Layer.filter(l => {
    const CRS = l.CRS || l.Layer?.CRS
    if (!CRS) return false
    return CRS.includes('EPSG:3857')
  })

  return webMercatorLayers
}

export function latLngToEpsg3857(lng: number, lat: number): [number, number] {
  const x = (lng * 20037508.34) / 180
  const y = (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 20037508.34) / Math.PI
  return [x, y]
}
