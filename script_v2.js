let map;
let geocoder;
let marker;
let floodPolygons = [];
let wmsLayer; // Variável para a camada WMS
let geoJsonLayer; // Variável para a camada GeoJSON
let ucRsLayer; // Variável para a camada UC_RS
let mapbiomasLayer; // Variável para a camada Mapbiomas_RS
let elevacaoLayer; // Variável para a camada elevacao_cropped
let precipitacaoLayer; // Variável para a camada de precipitação
let hospitalsMarkers = []; // Armazenar os marcadores de hospitais
let isPointMode = false; // Variável para controlar o modo de ponto
const wmsUrl = 'http://localhost:8080/geoserver/wms'; // URL do GeoServer

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

    // Inicializar a camada WMS
    wmsLayer = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            const proj = map.getProjection();
            const zfactor = Math.pow(2, zoom);
            const top = proj.fromPointToLatLng(
                new google.maps.Point((coord.x * 256) / zfactor, (coord.y * 256) / zfactor)
            );
            const bot = proj.fromPointToLatLng(
                new google.maps.Point(((coord.x + 1) * 256) / zfactor, ((coord.y + 1) * 256) / zfactor)
            );
            const bbox = `${top.lng()},${bot.lat()},${bot.lng()},${top.lat()}`;

            return `${wmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=flood_data:ModelAverage_Enchente_v2&styles=&bbox=${bbox}&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6,
    });

    // Inicializar a camada UC_RS
    ucRsLayer = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            const proj = map.getProjection();
            const zfactor = Math.pow(2, zoom);
            const top = proj.fromPointToLatLng(
                new google.maps.Point((coord.x * 256) / zfactor, (coord.y * 256) / zfactor)
            );
            const bot = proj.fromPointToLatLng(
                new google.maps.Point(((coord.x + 1) * 256) / zfactor, ((coord.y + 1) * 256) / zfactor)
            );
            const bbox = `${top.lng()},${bot.lat()},${bot.lng()},${top.lat()}`;

            return `${wmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=flood_data:uc_rs&styles=&bbox=${bbox}&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6,
    });

    // Inicializar a camada Mapbiomas_RS
    mapbiomasLayer = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            const proj = map.getProjection();
            const zfactor = Math.pow(2, zoom);
            const top = proj.fromPointToLatLng(
                new google.maps.Point((coord.x * 256) / zfactor, (coord.y * 256) / zfactor)
            );
            const bot = proj.fromPointToLatLng(
                new google.maps.Point(((coord.x + 1) * 256) / zfactor, ((coord.y + 1) * 256) / zfactor)
            );
            const bbox = `${top.lng()},${bot.lat()},${bot.lng()},${top.lat()}`;

            return `${wmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=flood_data:Mapbiomas_RS_v2&styles=&bbox=${bbox}&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6,
    });

    // Inicializar a camada elevacao_cropped
    elevacaoLayer = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            const proj = map.getProjection();
            const zfactor = Math.pow(2, zoom);
            const top = proj.fromPointToLatLng(
                new google.maps.Point((coord.x * 256) / zfactor, (coord.y * 256) / zfactor)
            );
            const bot = proj.fromPointToLatLng(
                new google.maps.Point(((coord.x + 1) * 256) / zfactor, ((coord.y + 1) * 256) / zfactor)
            );
            const bbox = `${top.lng()},${bot.lat()},${bot.lng()},${top.lat()}`;

            return `${wmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=flood_data:elevacao_cropped&styles=&bbox=${bbox}&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6,
    });

    // Inicializar a camada de Precipitação
    precipitacaoLayer = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            const proj = map.getProjection();
            const zfactor = Math.pow(2, zoom);
            const top = proj.fromPointToLatLng(
                new google.maps.Point((coord.x * 256) / zfactor, (coord.y * 256) / zfactor)
            );
            const bot = proj.fromPointToLatLng(
                new google.maps.Point(((coord.x + 1) * 256) / zfactor, ((coord.y + 1) * 256) / zfactor)
            );
            const bbox = `${top.lng()},${bot.lat()},${bot.lng()},${top.lat()}`;

            return `${wmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=flood_data:precipitacao&styles=precipitacao_blue_ramp_style&bbox=${bbox}&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.6,
    });

    // Inicializar a camada GeoJSON
    geoJsonLayer = new google.maps.Data({ map: null });

    fetch('shape_rs_enchentes_v2.geojson')
        .then((response) => response.json())
        .then((data) => {
            floodPolygons = data.features.map((feature) => feature.geometry);
            geoJsonLayer.addGeoJson(data);

            geoJsonLayer.setStyle({
                fillColor: 'blue',
                strokeColor: 'blue',
                strokeWeight: 1,
                fillOpacity: parseFloat(document.getElementById('geoJsonOpacity').value),
            });
        });

    google.maps.event.addListener(marker, 'mouseover', function () {
        const position = marker.getPosition();
        showMarkerInfo(position, marker);
    });

    document.getElementById('point-button').addEventListener('click', function () {
        isPointMode = !isPointMode;

        if (isPointMode) {
            map.setOptions({ draggableCursor: 'crosshair' });
            alert('Clique no mapa para adicionar um marcador.');
        } else {
            map.setOptions({ draggableCursor: 'default' });
            alert('Modo de busca reativado.');
        }
    });

    map.addListener('click', function (event) {
        if (isPointMode) {
            marker.setPosition(event.latLng);
            marker.setMap(map);
            google.maps.event.trigger(marker, 'mouseover');
        }
    });
}

function showMarkerInfo(position, markerInstance) {
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
        .then((response) => response.json())
        .then((data) => {
            const pixelValues = data.pixel_values;
            const elevation = pixelValues['elevacao'];
            const precipitation = pixelValues['preciptacao'];
            const landUse = pixelValues['uso_solo'];
            const floodProbabilityValue = pixelValues['enchente'];
            const floodProbability = (floodProbabilityValue * 100).toFixed(2);

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
                        if (component.types.includes('sublocality') || component.types.includes('neighborhood'))
                            neighborhood = component.long_name;
                        if (component.types.includes('locality') || component.types.includes('administrative_area_level_2'))
                            city = component.long_name;
                        if (component.types.includes('postal_code')) postalCode = component.long_name;
                    }

                    const floodStatus = isInsideFloodPolygon
                        ? 'DENTRO da mancha de enchente'
                        : `FORA da mancha de enchente (Distância: ${nearestDistance.toFixed(
                              2
                          )} metros do ponto mais próximo da mancha de enchente)`;

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
                        <strong>Probabilidade de enchente:</strong> ${floodProbability}%</br>
                        <strong>Elevação:</strong> ${elevation} metros</br>
                        <strong>Precipitação:</strong> ${precipitation} mm</br>
                        <strong>Uso do Solo:</strong> ${landUse}</br>
                    `;

                    const infowindow = new google.maps.InfoWindow({
                        content: contentString,
                    });
                    infowindow.open(map, markerInstance);
                }
            });
        });
}

function toggleWMSLayer() {
    const checkbox = document.getElementById('toggleWMS');
    if (checkbox.checked) {
        if (!map.overlayMapTypes.getArray().includes(wmsLayer)) {
            map.overlayMapTypes.push(wmsLayer);
        }
    } else {
        map.overlayMapTypes.forEach((layer, index) => {
            if (layer === wmsLayer) {
                map.overlayMapTypes.removeAt(index);
            }
        });
    }
}

function toggleGeoJSONLayer() {
    const checkbox = document.getElementById('toggleGeoJSON');
    if (checkbox.checked) {
        geoJsonLayer.setMap(map);
    } else {
        geoJsonLayer.setMap(null);
    }
}

function toggleUcRsLayer() {
    const checkbox = document.getElementById('toggleUcRs');
    if (checkbox.checked) {
        if (!map.overlayMapTypes.getArray().includes(ucRsLayer)) {
            map.overlayMapTypes.push(ucRsLayer);
        }
    } else {
        map.overlayMapTypes.forEach((layer, index) => {
            if (layer === ucRsLayer) {
                map.overlayMapTypes.removeAt(index);
            }
        });
    }
}

function toggleMapbiomasLayer() {
    const checkbox = document.getElementById('toggleMapbiomas');
    if (checkbox.checked) {
        if (!map.overlayMapTypes.getArray().includes(mapbiomasLayer)) {
            map.overlayMapTypes.push(mapbiomasLayer);
        }
    } else {
        map.overlayMapTypes.forEach((layer, index) => {
            if (layer === mapbiomasLayer) {
                map.overlayMapTypes.removeAt(index);
            }
        });
    }
}

function toggleElevacaoLayer() {
    const checkbox = document.getElementById('toggleElevacao');
    if (checkbox.checked) {
        if (!map.overlayMapTypes.getArray().includes(elevacaoLayer)) {
            map.overlayMapTypes.push(elevacaoLayer);
        }
    } else {
        map.overlayMapTypes.forEach((layer, index) => {
            if (layer === elevacaoLayer) {
                map.overlayMapTypes.removeAt(index);
            }
        });
    }
}

function togglePrecipitacaoLayer() {
    const checkbox = document.getElementById('togglePrecipitacao');
    if (checkbox.checked) {
        if (!map.overlayMapTypes.getArray().includes(precipitacaoLayer)) {
            map.overlayMapTypes.push(precipitacaoLayer);
        }
    } else {
        map.overlayMapTypes.forEach((layer, index) => {
            if (layer === precipitacaoLayer) {
                map.overlayMapTypes.removeAt(index);
            }
        });
    }
}

function toggleHospitalsLayer() {
    const checkbox = document.getElementById('toggleHospitals');
    if (checkbox.checked) {
        fetch('hospitals.geojson')
            .then((response) => response.json())
            .then((data) => {
                data.features.forEach((feature) => {
                    const coords = feature.geometry.coordinates;
                    const latLng = new google.maps.LatLng(coords[1], coords[0]);

                    const hospitalMarker = new google.maps.Marker({
                        position: latLng,
                        map: map,
                        icon: {
                            url: 'hospital.png',
                            scaledSize: new google.maps.Size(65, 65),
                        },
                    });

                    google.maps.event.addListener(hospitalMarker, 'mouseover', function () {
                        showMarkerInfo(hospitalMarker.getPosition(), hospitalMarker);
                    });

                    hospitalsMarkers.push(hospitalMarker);
                });
            });
    } else {
        hospitalsMarkers.forEach((marker) => marker.setMap(null));
        hospitalsMarkers = [];
    }
}

function changeWMSOpacity() {
    const opacity = parseFloat(document.getElementById('wmsOpacity').value);
    wmsLayer.setOpacity(opacity);
}

function changeGeoJSONOpacity() {
    const opacity = parseFloat(document.getElementById('geoJsonOpacity').value);
    geoJsonLayer.setStyle({
        fillColor: 'blue',
        strokeColor: 'blue',
        strokeWeight: 1,
        fillOpacity: opacity,
    });
}

function changeUcRsOpacity() {
    const opacity = parseFloat(document.getElementById('ucRsOpacity').value);
    ucRsLayer.setOpacity(opacity);
}

function changeMapbiomasOpacity() {
    const opacity = parseFloat(document.getElementById('mapbiomasOpacity').value);
    mapbiomasLayer.setOpacity(opacity);
}

function changeElevacaoOpacity() {
    const opacity = parseFloat(document.getElementById('elevacaoOpacity').value);
    elevacaoLayer.setOpacity(opacity);
}

function changePrecipitacaoOpacity() {
    const opacity = parseFloat(document.getElementById('precipitacaoOpacity').value);
    precipitacaoLayer.setOpacity(opacity);
}

function geocodeAddress() {
    const address = document.getElementById('address').value;
    geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            map.setCenter(location);
            map.setZoom(15);
            marker.setPosition(location);
            google.maps.event.trigger(marker, 'mouseover');
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}

document.getElementById('address').addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
        geocodeAddress();
    }
});

document.getElementById('search').addEventListener('click', function () {
    geocodeAddress();
});

document.getElementById('layer-button').addEventListener('click', function () {
    const layerMenu = document.getElementById('layer-menu');
    if (layerMenu.style.display === 'none' || layerMenu.style.display === '') {
        layerMenu.style.display = 'block';
    } else {
        layerMenu.style.display = 'none';
    }
});

window.addEventListener('click', function (event) {
    const layerMenu = document.getElementById('layer-menu');
    if (
        !layerMenu.contains(event.target) &&
        event.target.id !== 'layer-button' &&
        event.target.parentElement.id !== 'layer-button'
    ) {
        layerMenu.style.display = 'none';
    }
});

window.onload = initMap;
