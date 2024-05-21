import { getLayers, parseCapabilities } from './utils'
import Main from './Main'

export default async function DataFetcher() {
  // Fetch data from a public API
  const res = await fetchLayers()

  return <Main layersData={res} />
}

async function fetchLayers() {
  console.log('not on browser!')
  const r = await fetch('https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities')
  const xml = await parseCapabilities(r.body)
  return getLayers(xml)
}
