import React, { forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

const INITIAL_HTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      html, body {
        padding: 0;
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      #map { width: 100%; height: 100%; }

      /* Sleek Leaflet Popups */
      .leaflet-popup-content-wrapper {
        border-radius: 18px !important;
        box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.28) !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: hidden;
      }
      .leaflet-popup-content {
        margin: 0 !important;
        line-height: 1.4 !important;
      }
      .leaflet-popup-tip {
        background: #ffffff !important;
      }

      /* Radar Pulse for Current Location */
      .user-pulse-container {
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .user-pulse-ring {
        position: absolute;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.28);
        animation: pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      }
      .user-pulse-core {
        width: 16px;
        height: 16px;
        background: #2563eb;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        z-index: 2;
      }
      @keyframes pulseRing {
        0% { transform: scale(0.6); opacity: 0.9; }
        80% { transform: scale(1.6); opacity: 0; }
        100% { transform: scale(1.6); opacity: 0; }
      }

      /* Hazard Marker Ripple */
      .hazard-marker-wrapper {
        position: relative;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hazard-pulse-ring {
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        animation: hazardPulse 1.8s ease-out infinite;
      }
      @keyframes hazardPulse {
        0% { transform: scale(0.7); opacity: 0.9; }
        100% { transform: scale(1.4); opacity: 0; }
      }

      /* Clean map tiles filter */
      .leaflet-tile {
        filter: saturate(1.08) contrast(1.02);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var map;
      var destinationMarker = null;
      var startMarker = null;
      var routeLayer = null;
      var alternativeRouteLayer = null;
      var userMarker = null;
      var waterlogLayer = null;

      // Bridge for admin actions from popup HTML
      window.triggerHazardAction = function(action, reportId) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'HAZARD_ACTION',
            action: action,
            reportId: reportId
          }));
        }
      };

      try {
        map = L.map('map', { 
          zoomControl: false,
          attributionControl: false 
        }).setView([22.7196, 75.8577], 14);

        // 100% FREE OpenStreetMap Tiles
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a','b','c']
        }).addTo(map);

        map.whenReady(function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
          }
        });

        // Tap sets destination
        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;

          setDestinationMarker(lat, lng);

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DESTINATION_SET', lat: lat, lng: lng }));
          }
        });

        // Long-press sets custom start point
        map.on('contextmenu', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          
          setStartMarker(lat, lng);

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'START_SET', lat: lat, lng: lng }));
          }
        });
      } catch(err) {
        console.error("Map initialization error:", err);
      }

      // Authentic Google Maps Style Red Teardrop Pin
      function setDestinationMarker(lat, lng) {
        if (!map) return;
        var googlePinHtml = '<svg width="34" height="46" viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">' +
                              '<path d="M17 0C7.611 0 0 7.611 0 17C0 29.75 17 46 17 46C17 46 34 29.75 34 17C34 7.611 26.389 0 17 0Z" fill="#EA4335"/>' +
                              '<circle cx="17" cy="17" r="6.5" fill="#FFFFFF"/>' +
                            '</svg>';

        var redPinIcon = L.divIcon({
          className: 'google-destination-pin',
          html: googlePinHtml,
          iconSize: [34, 46],
          iconAnchor: [17, 46],
          popupAnchor: [0, -42]
        });

        if (destinationMarker) {
          destinationMarker.setLatLng([lat, lng]);
        } else {
          destinationMarker = L.marker([lat, lng], { icon: redPinIcon }).addTo(map);
        }
      }

      // Custom Start Marker (Green Google Maps Style Pin)
      function setStartMarker(lat, lng) {
        if (!map) return;
        var startPinHtml = '<svg width="34" height="46" viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">' +
                             '<path d="M17 0C7.611 0 0 7.611 0 17C0 29.75 17 46 17 46C17 46 34 29.75 34 17C34 7.611 26.389 0 17 0Z" fill="#10B981"/>' +
                             '<circle cx="17" cy="17" r="6.5" fill="#FFFFFF"/>' +
                           '</svg>';

        var startPinIcon = L.divIcon({
          className: 'google-start-pin',
          html: startPinHtml,
          iconSize: [34, 46],
          iconAnchor: [17, 46],
          popupAnchor: [0, -42]
        });

        if (startMarker) {
          startMarker.setLatLng([lat, lng]);
        } else {
          startMarker = L.marker([lat, lng], { icon: startPinIcon }).addTo(map);
        }
      }
    </script>
  </body>
  </html>
`;

const MapScreen = forwardRef(({ onMapReady, onDestinationSelect, onStartSelect, onHazardAction }, ref) => {
  return (
    <View style={styles.container}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html: INITIAL_HTML }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
        onLoadEnd={() => {
          if (onMapReady) onMapReady();
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "MAP_READY" && onMapReady) {
              onMapReady();
            } else if (data.type === "DESTINATION_SET" && onDestinationSelect) {
              onDestinationSelect(data.lat, data.lng);
            } else if (data.type === "START_SET" && onStartSelect) {
              onStartSelect(data.lat, data.lng);
            } else if (data.type === "HAZARD_ACTION" && onHazardAction) {
              onHazardAction(data.action, data.reportId);
            }
          } catch (e) {
            console.warn("WebView message parse error:", e);
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default MapScreen;