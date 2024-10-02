let map;
let geocoder;
let marker;
let floodPolygons = [];
let wmsLayer; // Variable for WMS layer
let geoJsonLayer; // Variable for GeoJSON layer
let ucRsLayer; // Variable for UC_RS layer
let mapbiomasLayer; // Variable for Mapbiomas RS layer
let hospitalsMarkers = []; // Store hospital markers
let isPointMode = false; // Control point mode
const wmsUrl = 'http://localhost:8080/geoserver/wms'; // Global scope

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -30.0346, lng: -51.2177 },
        zoom: 9,
    });

    geocoder = new google.maps.Geocoder();
    marker = new google.maps.Marker({
        map: map,
        draggable: false,
    });

    // Initialize WMS layer
    wmsLayer = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            const proj = map.getProjection();
            const zfactor = Math.pow(2, zoom);
            const top = proj.fromPointToLatLng(new google.maps.Point(coord.x * 256 / zfactor, coord.y * 256 / zfactor));
            const bot = proj.fromPointToLatLng(new google.maps.Point((coord.x + 1) * 256 / zfactor, coord.y + 1 * 256 / zfactor));
            const bbox = `${top.lng()},${bot.lat()},${bot.lng()},${top.lat()}`;
            
            return `${wmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=flood_data:ModelAverage_Enchente_v2&styles=&bbox=${bbox}&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6
    });

    // Initialize UC_RS layer
    ucRsLayer = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            const proj = map.getProjection();
            const zfactor = Math.pow(2, zoom);
            const top = proj.fromPointToLatLng(new google.maps.Point(coord.x * 256 / zfactor, coord.y * 256 / zfactor));
            const bot = proj.fromPointToLatLng(new google.maps.Point((coord.x + 1) * 256 / zfactor, coord.y + 1 * 256 / zfactor));
            const bbox = `${top.lng()},${bot.lat()},${bot.lng()},${top.lat()}`;
            
            return `${wmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=flood_data:uc_rs&styles=&bbox=${bbox}&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6
    });

    // Initialize Mapbiomas RS layer
    mapbiomasLayer = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            const proj = map.getProjection();
            const zfactor = Math.pow(2, zoom);
            const top = proj.fromPointToLatLng(new google.maps.Point(coord.x * 256 / zfactor, coord.y * 256 / zfactor));
            const bot = proj.fromPointToLatLng(new google.maps.Point((coord.x + 1) * 256 / zfactor, coord.y + 1 * 256 / zfactor));
            const bbox = `${top.lng()},${bot.lat()},${bot.lng()},${top.lat()}`;
            
            return `${wmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=flood_data:Mapbiomas_RS_v2&styles=&bbox=${bbox}&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6
    });

    // Initialize GeoJSON layer
    geoJsonLayer = new google.maps.Data({ map: null });

    fetch('shape_rs_enchentes_v2.geojson')
        .then(response => response.json())
        .then(data => {
            floodPolygons = data.features.map(feature => feature.geometry);
            geoJsonLayer.addGeoJson(data);

            geoJsonLayer.setStyle({
                fillColor: 'blue',
                strokeColor: 'blue',
                strokeWeight: 1,
                fillOpacity: parseFloat(document.getElementById('geoJsonOpacity').value),
            });
        });

    // Modify the marker mouseover event
    google.maps.event.addListener(marker, 'mouseover', function () {
        const position = marker.getPosition();
        const latlng = [position.lng(), position.lat()];
        const point = turf.point(latlng);
        let isInsideFloodPolygon = false;
        let nearestDistance = Infinity;

        floodPolygons.forEach(function (layer) {
            if (turf.booleanPointInPolygon(point, layer)) {
                isInsideFloodPolygon = true;
            } else {
                const line = turf.polygonToLine(layer);
                const nearest = turf.nearestPointOnLine(line, point);
                const distance = turf.distance(point, nearest, { units: 'meters' });
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                }
            }
        });

        const apiUrl = `http://127.0.0.1:5000/get_pixel_value?lat=${position.lat()}&lon=${position.lng()}`;
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                const pixelValues = data.pixel_values;
                const elevation = pixelValues['elevacao'];
                const precipitation = pixelValues['preciptacao'];
                const landUse = pixelValues['uso_solo'];
                const floodProbabilityValue = pixelValues['enchente'];
                const floodProbability = (floodProbabilityValue * 100).toFixed(2);

                const featureInfoUrl = `${wmsUrl}?service=WMS&version=1.1.1&request=GetFeatureInfo&layers=flood_data:uc_rs&bbox=${position.lng() - 0.001},${position.lat() - 0.001},${position.lng() + 0.001},${position.lat() + 0.001}&width=101&height=101&query_layers=flood_data:uc_rs&info_format=application/json&x=50&y=50&feature_count=1`;

                fetch(featureInfoUrl)
                    .then(response => response.json())
                    .then(featureInfoData => {
                        let ucInfo = '';

                        if (featureInfoData.features.length > 0) {
                            const nomeUc = featureInfoData.features[0].properties.nome_uc;
                            ucInfo = `<strong>Unidade de Conservação:</strong> ${nomeUc}</br>`;
                        }

                        geocoder.geocode({ location: position }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                                const addressComponents = results[0].address_components;
                                let street = '';
                                let number = '';
                                let neighborhood = '';
                                let city = '';
                                let postalCode = '';

                                for (const component of addressComponents) {
                                    if (component.types.includes('route')) street = component.long_name;
                                    if (component.types.includes('street_number')) number = component.long_name;
                                    if (component.types.includes('sublocality') || component.types.includes('neighborhood')) neighborhood = component.long_name;
                                    if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) city = component.long_name;
                                    if (component.types.includes('postal_code')) postalCode = component.long_name;
                                }

                                const floodStatus = isInsideFloodPolygon
                                    ? "DENTRO da mancha de enchente"
                                    : `FORA da mancha de enchente (Distância: ${nearestDistance.toFixed(2)} metros do ponto mais próximo da mancha de enchente)`;

                                const contentString = `                        
                                    <strong>Endereço:</strong> ${results[0].formatted_address}</br>
                                    <strong>Rua:</strong> ${street}</br>
                                    <strong>Número:</strong> ${number}</br>
                                    <strong>Bairro:</strong> ${neighborhood}</br>
                                    <strong>Cidade:</strong> ${city}</br>
                                    <strong>CEP:</strong> ${postalCode}</br>
                                    <strong>Latitude:</strong> ${position.lat().toFixed(6)}</br>
                                    <strong>Longitude:</strong> ${position.lng().toFixed(6)}</br>
                                    <strong>Status:</strong> ${floodStatus}</br>
                                    ${ucInfo}
                                    <strong>Probabilidade de enchente:</strong> ${floodProbability}%</br>
                                    <strong>Elevação:</strong> ${elevation} metros</br>
                                    <strong>Precipitação:</strong> ${precipitation} mm</br>
                                    <strong>Uso do Solo:</strong> ${landUse}</br>
                                `;

                                const infowindow = new google.maps.InfoWindow({
                                    content: contentString,
                                });
                                infowindow.open(map, marker);
                            }
                        });
                    });
            });
    });

    // Toggle point mode
    document.getElementById('point-button').addEventListener('click', function() {
        isPointMode = !isPointMode;

        if (isPointMode) {
            map.setOptions({ draggableCursor: 'crosshair' });
            alert("Clique no mapa para adicionar um marcador.");
        } else {
            map.setOptions({ draggableCursor: 'default' });
            alert("Modo de busca reativado.");
        }
    });

    // Handle map click event
    map.addListener('click', function(event) {
        if (isPointMode) {
            marker.setPosition(event.latLng);
            marker.setMap(map);
            google.maps.event.trigger(marker, 'mouseover');
        }
    });
}

// Toggle WMS layer
function toggleWMSLayer() {
    const checkbox = document.getElementById('toggleWMS');
    if (checkbox.checked) {
        // Add WMS layer to the map
        if (!map.overlayMapTypes.getArray().includes(wmsLayer)) {
            map.overlayMapTypes.push(wmsLayer);
        }
    } else {
        // Remove WMS layer from the map
        map.overlayMapTypes.forEach((layer, index) => {
            if (layer === wmsLayer) {
                map.overlayMapTypes.removeAt(index);
            }
        });
    }
}

// Toggle GeoJSON layer
function toggleGeoJSONLayer() {
    const checkbox = document.getElementById('toggleGeoJSON');
    if (checkbox.checked) {
        geoJsonLayer.setMap(map);
    } else {
        geoJsonLayer.setMap(null);
    }
}

// Toggle UC_RS layer
function toggleUcRsLayer() {
    const checkbox = document.getElementById('toggleUcRs');
    if (checkbox.checked) {
        map.overlayMapTypes.push(ucRsLayer);
    } else {
        map.overlayMapTypes.removeAt(map.overlayMapTypes.getLength() - 1);
    }
}

// Toggle Mapbiomas RS layer
function toggleMapbiomasLayer() {
    const checkbox = document.getElementById('toggleMapbiomas');
    if (checkbox.checked) {
        // Add Mapbiomas layer to the map
        if (!map.overlayMapTypes.getArray().includes(mapbiomasLayer)) {
            map.overlayMapTypes.push(mapbiomasLayer);
        }
    } else {
        // Remove Mapbiomas layer from the map
        map.overlayMapTypes.forEach((layer, index) => {
            if (layer === mapbiomasLayer) {
                map.overlayMapTypes.removeAt(index);
            }
        });
    }
}

// Toggle hospitals layer
function toggleHospitalsLayer() {
    const checkbox = document.getElementById('toggleHospitals');
    if (checkbox.checked) {
        fetch('hospitals.geojson')
            .then(response => response.json())
            .then(data => {
                data.features.forEach(feature => {
                    const coords = feature.geometry.coordinates;
                    const latLng = new google.maps.LatLng(coords[1], coords[0]);

                    const hospitalMarker = new google.maps.Marker({
                        position: latLng,
                        map: map,
                        icon: {
                            url: 'hospital.png',
                            scaledSize: new google.maps.Size(65, 65)
                        }
                    });

                    google.maps.event.addListener(hospitalMarker, 'mouseover', function () {
                        const position = hospitalMarker.getPosition();
                        const latlng = [position.lng(), position.lat()];
                        const point = turf.point(latlng);
                        let isInsideFloodPolygon = false;
                        let nearestDistance = Infinity;

                        floodPolygons.forEach(function (layer) {
                            if (turf.booleanPointInPolygon(point, layer)) {
                                isInsideFloodPolygon = true;
                            } else {
                                const line = turf.polygonToLine(layer);
                                const nearest = turf.nearestPointOnLine(line, point);
                                const distance = turf.distance(point, nearest, { units: 'meters' });
                                if (distance < nearestDistance) {
                                    nearestDistance = distance;
                                }
                            }
                        });

                        const apiUrl = `http://127.0.0.1:5000/get_pixel_value?lat=${position.lat()}&lon=${position.lng()}`;
                        fetch(apiUrl)
                            .then(response => response.json())
                            .then(data => {
                                const pixelValues = data.pixel_values;
                                const elevation = pixelValues['elevacao'];
                                const precipitation = pixelValues['preciptacao'];
                                const landUse = pixelValues['uso_solo'];
                                const floodProbabilityValue = pixelValues['enchente'];
                                const floodProbability = (floodProbabilityValue * 100).toFixed(2);

                                const featureInfoUrl = `${wmsUrl}?service=WMS&version=1.1.1&request=GetFeatureInfo&layers=flood_data:uc_rs&bbox=${position.lng() - 0.001},${position.lat() - 0.001},${position.lng() + 0.001},${position.lat() + 0.001}&width=101&height=101&query_layers=flood_data:uc_rs&info_format=application/json&x=50&y=50&feature_count=1`;

                                fetch(featureInfoUrl)
                                    .then(response => response.json())
                                    .then(featureInfoData => {
                                        let ucInfo = '';

                                        if (featureInfoData.features.length > 0) {
                                            const nomeUc = featureInfoData.features[0].properties.nome_uc;
                                            ucInfo = `<strong>Unidade de Conservação:</strong> ${nomeUc}</br>`;
                                        }

                                        geocoder.geocode({ location: position }, (results, status) => {
                                            if (status === 'OK' && results[0]) {
                                                const addressComponents = results[0].address_components;
                                                let street = '';
                                                let number = '';
                                                let neighborhood = '';
                                                let city = '';
                                                let postalCode = '';

                                                for (const component of addressComponents) {
                                                    if (component.types.includes('route')) street = component.long_name;
                                                    if (component.types.includes('street_number')) number = component.long_name;
                                                    if (component.types.includes('sublocality') || component.types.includes('neighborhood')) neighborhood = component.long_name;
                                                    if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) city = component.long_name;
                                                    if (component.types.includes('postal_code')) postalCode = component.long_name;
                                                }

                                                const floodStatus = isInsideFloodPolygon
                                                    ? "DENTRO da mancha de enchente"
                                                    : `FORA da mancha de enchente (Distância: ${nearestDistance.toFixed(2)} metros do ponto mais próximo da mancha de enchente)`;

                                                const contentString = `                        
                                                    <strong>Endereço:</strong> ${results[0].formatted_address}</br>
                                                    <strong>Rua:</strong> ${street}</br>
                                                    <strong>Número:</strong> ${number}</br>
                                                    <strong>Bairro:</strong> ${neighborhood}</br>
                                                    <strong>Cidade:</strong> ${city}</br>
                                                    <strong>CEP:</strong> ${postalCode}</br>
                                                    <strong>Latitude:</strong> ${position.lat().toFixed(6)}</br>
                                                    <strong>Longitude:</strong> ${position.lng().toFixed(6)}</br>
                                                    <strong>Status:</strong> ${floodStatus}</br>
                                                    ${ucInfo}
                                                    <strong>Probabilidade de enchente:</strong> ${floodProbability}%</br>
                                                    <strong>Elevação:</strong> ${elevation} metros</br>
                                                    <strong>Precipitação:</strong> ${precipitation} mm</br>
                                                    <strong>Uso do Solo:</strong> ${landUse}</br>
                                                `;

                                                const infowindow = new google.maps.InfoWindow({
                                                    content: contentString,
                                                });
                                                infowindow.open(map, hospitalMarker);
                                            }
                                        });
                                    });
                            });
                    });

                    hospitalsMarkers.push(hospitalMarker);
                });
            });
    } else {
        hospitalsMarkers.forEach(marker => marker.setMap(null));
        hospitalsMarkers = [];
    }
}

// Change WMS layer opacity
function changeWMSOpacity() {
    const opacity = parseFloat(document.getElementById('wmsOpacity').value);
    wmsLayer.setOpacity(opacity);
}

// Change GeoJSON layer opacity
function changeGeoJSONOpacity() {
    const opacity = parseFloat(document.getElementById('geoJsonOpacity').value);
    geoJsonLayer.setStyle({
        fillColor: 'blue',
        strokeColor: 'blue',
        strokeWeight: 1,
        fillOpacity: opacity,
    });
}

// Change UC_RS layer opacity
function changeUcRsOpacity() {
    const opacity = parseFloat(document.getElementById('ucRsOpacity').value);
    ucRsLayer.setOpacity(opacity);
}

// Geocode address
function geocodeAddress() {
    const address = document.getElementById('address').value;
    geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            map.setCenter(location);
            map.setZoom(15);
            marker.setPosition(location);
            marker.setMap(map);
            google.maps.event.trigger(marker, 'mouseover');
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}

// Event listeners for search functionality
document.getElementById('address').addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
        geocodeAddress();
    }
});

document.getElementById('search').addEventListener('click', function () {
    geocodeAddress();
});

// Toggle layer menu
document.getElementById('layer-button').addEventListener('click', function() {
    const layerMenu = document.getElementById('layer-menu');
    if (layerMenu.style.display === 'none' || layerMenu.style.display === '') {
        layerMenu.style.display = 'block';
    } else {
        layerMenu.style.display = 'none';
    }
});

// Hide layer menu when clicking outside
window.addEventListener('click', function(event) {
    const layerMenu = document.getElementById('layer-menu');
    if (!layerMenu.contains(event.target) && event.target.id !== 'layer-button' && event.target.parentElement.id !== 'layer-button') {
        layerMenu.style.display = 'none';
    }
});

// Initialize the map on window load
window.onload = initMap;
