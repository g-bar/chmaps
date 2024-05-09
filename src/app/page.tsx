'use client'

import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import './map.css'
import { useRef, useState, useEffect, useMemo, SyntheticEvent } from 'react'
import { DisplayedLayer, getLayers, latLngToEpsg3857, parseCapabilities } from './utils'

export default function Home() {
  const mapContainer = useRef(null)
  const mapReady = useRef(false)
  const map = useRef<maptilersdk.Map | null>(null)
  const ch = { lng: 8.25, lat: 46.8 }
  const [zoom] = useState(7.6)
  maptilersdk.config.apiKey = 'ANaMDm2d62iD6oFgxeie'
  const [selectedLayers, setSelectedLayers] = useState<DisplayedLayer[]>([])
  const [clicked, setClicked] = useState<maptilersdk.MapMouseEvent>()
  const layers = useMemo(() => selectedLayers.filter(l => l.display).map(l => l.Name), [selectedLayers])
  const legend = useMemo(() => {
    return `https://wms.geo.admin.ch/?SERVICE=WMS&REQUEST=GetLegendGraphic&VERSION=1.3.0&LAYERS=${layers.join(
      ','
    )}&STYLES=default&CRS=EPSG:3857`
  }, [layers])
  const nLayers = useMemo(() => selectedLayers.filter(l => l.display).length, [selectedLayers])
  const [features, setFeatures] = useState<{ [k: string]: string }>()

  const y = clicked && clicked.point.y - 100
  const top = y && y < 0 ? y + 100 : y

  console.log(features)

  useEffect(() => {
    async function fetchPointInfo() {
      if (!layers.length || !map.current || !clicked) return

      const bounds = map.current.getBounds()
      const sw = latLngToEpsg3857(bounds._sw.lng, bounds._sw.lat)
      const ne = latLngToEpsg3857(bounds._ne.lng, bounds._ne.lat)
      const bbox = [sw[0], sw[1], ne[0], ne[1]]
      const res = await fetch(
        `https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers.join(
          ','
        )}&QUERY_LAYERS=${layers.join(',')}&FEATURE_COUNT=1&INFO_FORMAT=application/json&I=${Math.floor(
          (clicked.point.x / window.innerWidth) * 100
        )}&J=${Math.floor(
          (clicked.point.y / window.innerHeight) * 100
        )}&CRS=EPSG:3857&STYLES=&WIDTH=101&HEIGHT=101&BBOX=${bbox.join(',')}`
      )
      try {
        const json = await res.json()
        const feat: { properties: { [key: string]: string } }[] = json.features
        if (feat.length === 0) setFeatures(undefined)
        else setFeatures(feat[0].properties)
      } catch (e) {
        setFeatures(undefined)
      }
    }
    fetchPointInfo()
  }, [clicked, layers])

  useEffect(() => {
    if (!mapContainer.current) return

    function renderLayers() {
      if (!map.current) return
      if (!mapReady.current) return window.setTimeout(renderLayers, 1000)

      for (const { Name: layer, display } of selectedLayers) {
        if (!display && map.current.getLayer(layer)) map.current.removeLayer(layer)
        else if (display && !map.current.getLayer(layer))
          map.current.addLayer({
            id: layer,
            type: 'raster',
            source: layer
          })
      }
    }

    renderLayers()

    if (map.current) return

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BASIC,
      center: [ch.lng, ch.lat],
      zoom: zoom
    })

    map.current.on('load', async () => {
      if (!map.current) return
      const layers = await fetchLayers()

      for (const layer of layers) {
        map.current.addSource(layer.Name, {
          type: 'raster',
          tiles: [
            `https://wms.geo.admin.ch/?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layer.Name}&STYLES=default&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&width=1024&height=1024`
          ]
        })
      }
      setSelectedLayers(layers.map(l => ({ ...l, display: false })))
      mapReady.current = true
    })

    map.current.on('click', e => {
      setFeatures(undefined)
      setClicked(e)
    })
  }, [ch.lng, ch.lat, zoom, selectedLayers])

  return (
    <div className="map-wrap">
      <div className="side">
        {!!Object.keys(selectedLayers).length && (
          <>
            <span className="head">Layers</span>
            <div className="layers">
              {selectedLayers.map((l, i) => (
                <label key={l.Name} className="label">
                  <input
                    type="checkbox"
                    value={l.Name}
                    onChange={e => {
                      const v = e.currentTarget.value
                      const newSelectedLayers = [...selectedLayers]
                      newSelectedLayers[i] = { ...selectedLayers[i], display: !selectedLayers[i].display }
                      setSelectedLayers(newSelectedLayers)
                    }}
                  />
                  <span className="layer">{l.Title}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* eslint-disable-next-line */}
      <img
        key="legend"
        src={`https://wms.geo.admin.ch/?SERVICE=WMS&REQUEST=GetLegendGraphic&VERSION=1.3.0&${legend}&STYLES=default&LANG=en&CRS=EPSG:2056&BBOX=2550000,1060000,2660000,1140000&WIDTH=800&HEIGHT=582&FORMAT=image/png`}
        className={`legend ${nLayers === 0 ? 'hidden' : ''}`}
        onLoad={e => {
          const img = e.currentTarget
          img.width = img.naturalWidth * 1.3
        }}
      />

      {features && clicked && (
        <div
          className="absolute bg-black opacity-50 rounded text-white"
          style={{ left: clicked.point.x, top, width: 200, height: 100, zIndex: 1, overflow: 'scroll' }}
        >
          <div className="cursor-pointer  absolute" style={{ right: 10, top: 5 }} onClick={() => setClicked(undefined)}>
            X
          </div>
          {Object.entries(features).map(([k, v], i) => (
            <div key={i}>{`${k}: ${v}`}</div>
          ))}
        </div>
      )}

      <div ref={mapContainer} className="map" />
    </div>
  )
}

async function fetchLayers() {
  const r = await fetch('https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities')
  const xml = await parseCapabilities(r.body)
  return getLayers(xml)
}
