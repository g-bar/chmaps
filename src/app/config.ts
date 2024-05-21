import * as maptilersdk from '@maptiler/sdk'
maptilersdk.config.apiKey =
  process.env.NODE_ENV === 'production' ? 'H9I34HttBvZgPmCfsh9x' : process.env.NEXT_PUBLIC_MAP_TILER ?? ''

if (!maptilersdk.config.apiKey) throw new Error('Missing API key')

export default maptilersdk
