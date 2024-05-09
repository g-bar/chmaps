'use client'

import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import './map.css'
import { useRef, useState, useEffect, useMemo, SyntheticEvent } from 'react'
import { DisplayedLayer, getLayers, parseCapabilities } from './utils'

export default function Home() {
  const mapContainer = useRef(null)
  const mapReady = useRef(false)
  const map = useRef<maptilersdk.Map | null>(null)
  const ch = { lng: 8.25, lat: 46.8 }
  const [zoom] = useState(7.6)
  maptilersdk.config.apiKey = 'ANaMDm2d62iD6oFgxeie'
  const [selectedLayers, setSelectedLayers] = useState<DisplayedLayer[]>([])
  const [clicked, setClicked] = useState<maptilersdk.MapMouseEvent>()
  const setClickedRef = useRef(false)
  const legend = useMemo(() => {
    const layers = selectedLayers.filter(l => l.display).map(l => l.Name)
    return `https://wms.geo.admin.ch/?SERVICE=WMS&REQUEST=GetLegendGraphic&VERSION=1.3.0&LAYERS=${layers.join(
      ','
    )}&STYLES=default&CRS=EPSG:3857`
  }, [selectedLayers])
  const nLayers = useMemo(() => selectedLayers.filter(l => l.display).length, [selectedLayers])

  const y = clicked && clicked.point.y - 100
  const top = y && y < 0 ? y + 100 : y

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
      if (setClickedRef.current) {
        setClickedRef.current = false
        setClicked(undefined)
      } else {
        setClickedRef.current = true
        setClicked(e)
      }
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

      {clicked && (
        <div
          className="absolute bg-black opacity-50 rounded"
          style={{ left: clicked.point.x, top, width: 200, height: 100, zIndex: 1 }}
        >
          <div
            className="cursor-pointer text-white absolute"
            style={{ right: 10, top: 5 }}
            onClick={() => {
              setClickedRef.current = false
              setClicked(undefined)
            }}
          >
            X
          </div>
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
