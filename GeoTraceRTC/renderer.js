const { ipcRenderer } = require('electron');
const mapboxgl = require('mapbox-gl');

require('dotenv').config();
const MAP_BOX_TOKEN = process.env.MAP_BOX_TOKEN

mapboxgl.accessToken = MAP_BOX_TOKEN;

ipcRenderer.send('open-file-dialog');

ipcRenderer.on('location-data', (event, locationData) => {
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [0, 20],
    zoom: 2,
  });

  const coordinates = locationData
    .filter(data => data.latitude && data.longitude)
    .map(data => [data.longitude, data.latitude]);

  if (coordinates.length > 0) {
    map.on('load', () => {
      map.addSource('points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: locationData.map(data => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [data.longitude, data.latitude],
            },
            properties: {
              ip: data.ip,
              address: data.address,
              port: data.port,
              network_type: data.network_type,
              protocol: data.protocol,
              candidate_type: data.candidate_type,
            },
          })),
        },
      });

      map.addLayer({
        id: 'points',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ff0000',
        },
      });

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        },
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#888',
          'line-width': 4,
        },
      });

      map.addLayer({
        id: 'arrow',
        type: 'symbol',
        source: 'route',
        layout: {
          'symbol-placement': 'line',
          'text-field': '►',
          'text-size': 15,
          'symbol-spacing': 100,
          'text-keep-upright': true,
        },
        paint: {
          'text-color': '#888',
        },
      });

      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.fitBounds(bounds, { padding: 50 });
    });
  }
});