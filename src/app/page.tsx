'use client'

import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import './map.css'
import { useRef, useState, useEffect, useMemo } from 'react'
import { getLayers, parseCapabilities } from './utils'

export default function Home() {
  const mapContainer = useRef(null)
  const mapReady = useRef(false)
  const map = useRef<maptilersdk.Map | null>(null)
  const ch = { lng: 8.25, lat: 46.8 }
  const [zoom] = useState(7.6)
  maptilersdk.config.apiKey = 'ANaMDm2d62iD6oFgxeie'
  const [selectedLayers, setSelectedLayers] = useState<{ [layer: string]: boolean }>({})

  useEffect(() => {
    if (!mapContainer.current) return // stops map from intializing more than once

    if (!map.current) {
      map.current = new maptilersdk.Map({
        container: mapContainer.current,
        style: maptilersdk.MapStyle.BASIC,
        center: [ch.lng, ch.lat],
        zoom: zoom
      })

      map.current.on('load', async function () {
        if (!map.current) return
        const layers = await fetchLayers()

        const selectedLayers: { [layer: string]: boolean } = {}

        for (const layer of layers) {
          map.current.addSource(layer, {
            type: 'raster',
            tiles: [
              `https://wms.geo.admin.ch/?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layer}&STYLES=default&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&width=1024&height=1024`
            ]
          })
          selectedLayers[layer] = false
        }
        setSelectedLayers(selectedLayers)
        mapReady.current = true
      })
    }

    function renderLayers() {
      if (!map.current) return

      for (const [layer, show] of Object.entries(selectedLayers)) {
        if (!show && map.current.getLayer(layer)) map.current.removeLayer(layer)
        else if (show && !map.current.getLayer(layer))
          map.current.addLayer({
            id: layer,
            type: 'raster',
            source: layer
          })
      }
    }

    if (mapReady.current) renderLayers()
    else window.setTimeout(renderLayers, 1000)
  }, [ch.lng, ch.lat, zoom, selectedLayers])

  return (
    <div className="map-wrap">
      <div className="side">
        {!!Object.keys(selectedLayers).length && (
          <>
            <span className="head">Layers</span>
            <div className="layers">
              {Object.keys(selectedLayers).map(l => (
                <label key={l} className="label">
                  <input
                    type="checkbox"
                    value={l}
                    onChange={e => {
                      const v = e.currentTarget.value
                      setSelectedLayers({ ...selectedLayers, [v]: !selectedLayers[v] })
                    }}
                  />
                  <span className="layer">{l}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
      <div ref={mapContainer} className="map" />
    </div>
  )
}

async function fetchLayers() {
  const r = await fetch('https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities')
  const xml = await parseCapabilities(r.body)
  return getLayers(xml)
}
