import * as maptilersdk from '@maptiler/sdk'
if (!process.env.MAP_TILER_API_KEY) throw new Error('API_key missing')
maptilersdk.config.apiKey = process.env.MAP_TILER_API_KEY

export default maptilersdk
