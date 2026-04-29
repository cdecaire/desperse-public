import { defineEventHandler, setHeaders } from 'h3'

export default defineEventHandler((event) => {
  setHeaders(event, {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600',
  })
  return {
    applinks: {
      details: [
        {
          appIDs: ['DZJ6269EWL.app.desperse.ios'],
          components: [
            { '/': '/p/*' },
            { '/': '/post/*' },
            { '/': '/u/*' },
            { '/': '/edition/*' },
          ],
        },
      ],
    },
  }
})
