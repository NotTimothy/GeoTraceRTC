const { ipcRenderer } = require('electron');
const mapboxgl = require('mapbox-gl');
require('dotenv').config();

const MAP_BOX_TOKEN = process.env.MAP_BOX_TOKEN;
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
          features: locationData
            .filter(data => data.latitude && data.longitude && !isOverOcean(data.latitude, data.longitude))
            .map(data => ({
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
          'symbol-placement': 'line-end',
          'text-field': '►',
          'text-size': 15,
          'text-offset': [0, -0.5],
          'text-keep-upright': true,
        },
        paint: {
          'text-color': '#888',
        },
      });

      // Add a popup for displaying properties on hover
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.on('mousemove', 'points', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const feature = e.features[0];
        const props = feature.properties;
        const description = `
          <div>
            <strong>IP:</strong> ${props.ip}<br>
            <strong>Address:</strong> ${props.address}<br>
            <strong>Port:</strong> ${props.port}<br>
            <strong>Network Type:</strong> ${props.network_type}<br>
            <strong>Protocol:</strong> ${props.protocol}<br>
            <strong>Candidate Type:</strong> ${props.candidate_type}
          </div>
        `;
        popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
      });

      map.on('mouseleave', 'points', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.fitBounds(bounds, { padding: 50 });
    });
  }
});

function isOverOcean(latitude, longitude) {
  // Check if the coordinates are over the ocean using a geo-spatial library or API
  // Return true if the coordinates are over the ocean, false otherwise
  // You can use a library like Turf.js or a reverse geocoding API for this purpose
  // Example implementation using Turf.js:
  // const point = turf.point([longitude, latitude]);
  // const isOcean = turf.booleanPointInPolygon(point, oceanPolygon);
  // return isOcean;
  
  // Placeholder implementation: assume all coordinates are on land
  return false;
}

