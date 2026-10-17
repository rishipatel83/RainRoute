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
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .user-pulse-ring {
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.32);
        animation: pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      }
      .user-pulse-core {
        width: 18px;
        height: 18px;
        background: #2563eb;
        border: 3.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        z-index: 5;
      }
      @keyframes pulseRing {
        0% { transform: scale(0.6); opacity: 0.9; }
        80% { transform: scale(1.6); opacity: 0; }
        100% { transform: scale(1.6); opacity: 0; }
      }

      /* Hazard Marker Ripple */
      .hazard-marker-wrapper {
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .hazard-pulse-ring {
        position: absolute;
        width: 44px;
        height: 44px;
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
      window.reportsArray = [];

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

        // Tap sets destination (with smart hazard proximity tap-protection)
        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;

          // Check if click was within finger-tap proximity of any hazard marker
          if (window.reportsArray && window.reportsArray.length > 0) {
            var clickPt = map.latLngToContainerPoint(e.latlng);
            for (var i = 0; i < window.reportsArray.length; i++) {
              var h = window.reportsArray[i];
              var hPt = map.latLngToContainerPoint([h.latitude, h.longitude]);
              var pxDist = Math.hypot(clickPt.x - hPt.x, clickPt.y - hPt.y);
              var meterDist = map.distance(e.latlng, [h.latitude, h.longitude]);
              
              // If within 42 screen pixels or 45 meters, open hazard popup and prevent accidental pin drop
              if (pxDist < 42 || meterDist < 45) {
                if (window.hazardMarkersMap && window.hazardMarkersMap[h._id]) {
                  window.hazardMarkersMap[h._id].openPopup();
                }
                return;
              }
            }
          }

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

      // Exact Slender Teardrop Red Pin (Matching Uploaded Design with Dark Core & Thinner Needle Bottom)
      function setDestinationMarker(lat, lng) {
        if (!map) return;
        var googlePinHtml = '<svg width="36" height="54" viewBox="0 0 36 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.38));">' +
                              '<path d="M18 1C8.6 1 1 8.6 1 18C1 26.5 6.5 34.5 13.5 43.5C16.2 47 17.5 51.5 17.7 53.5C17.8 54.2 18.2 54.2 18.3 53.5C18.5 51.5 19.8 47 22.5 43.5C29.5 34.5 35 26.5 35 18C35 8.6 27.4 1 18 1Z" fill="#EA4335"/>' +
                              '<circle cx="18" cy="18" r="8" fill="#761E19"/>' +
                            '</svg>';

        var redPinIcon = L.divIcon({
          className: 'google-destination-pin',
          html: googlePinHtml,
          iconSize: [36, 54],
          iconAnchor: [18, 54],
          popupAnchor: [0, -50]
        });

        if (destinationMarker) {
          destinationMarker.setLatLng([lat, lng]);
        } else {
          destinationMarker = L.marker([lat, lng], { icon: redPinIcon, zIndexOffset: 3000 }).addTo(map);
        }
      }

      // Exact Slender Teardrop Green Start Pin (with Dark Forest Green Core & Thinner Needle Bottom)
      function setStartMarker(lat, lng) {
        if (!map) return;
        var startPinHtml = '<svg width="36" height="54" viewBox="0 0 36 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.38));">' +
                             '<path d="M18 1C8.6 1 1 8.6 1 18C1 26.5 6.5 34.5 13.5 43.5C16.2 47 17.5 51.5 17.7 53.5C17.8 54.2 18.2 54.2 18.3 53.5C18.5 51.5 19.8 47 22.5 43.5C29.5 34.5 35 26.5 35 18C35 8.6 27.4 1 18 1Z" fill="#10B981"/>' +
                             '<circle cx="18" cy="18" r="8" fill="#064E3B"/>' +
                           '</svg>';

        var startPinIcon = L.divIcon({
          className: 'google-start-pin',
          html: startPinHtml,
          iconSize: [36, 54],
          iconAnchor: [18, 54],
          popupAnchor: [0, -50]
        });

        if (startMarker) {
          startMarker.setLatLng([lat, lng]);
        } else {
          startMarker = L.marker([lat, lng], { icon: startPinIcon, zIndexOffset: 3000 }).addTo(map);
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