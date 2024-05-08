'use client'

import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import './map.css'
import { useRef, useState, useEffect } from 'react'
import { getLayers, parseCapabilities } from './utils'

export default function Home() {
  const mapContainer = useRef(null)
  const mapReady = useRef(false)
  const map = useRef<maptilersdk.Map | null>(null)
  const ch = { lng: 8.25, lat: 46.8 }
  const [zoom] = useState(7.6)
  maptilersdk.config.apiKey = 'ANaMDm2d62iD6oFgxeie'
  const [selectedLayers, setSelectedLayers] = useState<{ [layer: string]: boolean }>({})

  console.log(selectedLayers)

  useEffect(() => {
    async function fetchLayers() {
      const r = await fetch('https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities')
      const xml = await parseCapabilities(r.body)
      const layers = getLayers(xml)
      setSelectedLayers(
        layers.reduce((prev, current) => {
          prev[current] = false
          return prev
        }, {} as { [layer: string]: boolean })
      )
    }

    ["ch.agroscope.feuchtflaechenpotential-kulturlandschaft"]

    fetchLayers()
  }, [])

  useEffect(() => {
    if (!mapContainer.current) return // stops map from intializing more than once

    if (!map.current) {
      map.current = new maptilersdk.Map({
        container: mapContainer.current,
        style: maptilersdk.MapStyle.BASIC,
        center: [ch.lng, ch.lat],
        zoom: zoom
      })

      map.current.on('load', function () {
        if (!map.current) return
        map.current.addSource('wms-test-source', {
          type: 'raster',
          // use the tiles option to specify a WMS tile source URL
          // https://docs.maptiler.com/gl-style-specification/sources/
          tiles: [
            //'https://img.nj.gov/imagerywms/Natural2015?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=Natural2015',
            'https://wms.geo.admin.ch/?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=ch.swisstopo.digitales-hoehenmodell_25_reliefschattierung,ch.bafu.bundesinventare-bln&STYLES=default&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&width=1024&height=1024'
          ]
        })

        
        mapReady.current = true
      })
    }

    function renderLayers() {
      if (!map.current) return

      for (const [layer, show] of Object.entries(selectedLayers)) {
        if (!show) {
          if (map.current.getLayer(layer)) map.current.removeLayer(layer)
        } else if (!map.current.getLayer(layer))
          map.current.addLayer({
            id: layer,
            type: 'raster',
            source: 'wms-test-source'
          })
      }
    }

    if (mapReady.current) renderLayers()
    else window.setTimeout(renderLayers, 1000)
  }, [ch.lng, ch.lat, zoom, selectedLayers])

  return (
    <div className="map-wrap">
      <div className="side">
        <span className="head">Layers</span>
        <div className="layers">
          <label className="label">
            <input
              type="checkbox"
              value="ch.bafu.bundesinventare-bln"
              onChange={e => {
                const v = e.currentTarget.value
                setSelectedLayers({ ...selectedLayers, [v]: !selectedLayers[v] })
              }}
            />
            <span className="layer">Layer 1</span>
          </label>
        </div>
      </div>
      <div ref={mapContainer} className="map" />
    </div>
  )
}
