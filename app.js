// ============================================================================
// GLOBAL STATE & CONFIGURATION
// ============================================================================

const state = {
    currentView: 'europe', // 'europe' or 'city'
    selectedCity: null,
    viewMode: 'dots', // 'dots' or 'heatmap'
    citiesData: null,
    currentCityListings: null,
    europeMap: null,
    cityMap: null,
    cityMarkers: [],
    airbnbMarkers: [],
    heatmapLayer: null
};

const config = {
    europe: {
        center: [54, 15],
        zoom: 4,
        minZoom: 3,
        maxZoom: 18
    },
    city: {
        zoom: 13,
        minZoom: 11,
        maxZoom: 18
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    console.log('Initializing Airbnb visualization...');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize maps
    initializeMaps();
    
    // Load data
    loadData();
}

function initializeMaps() {
    // Create Europe overview map
    state.europeMap = L.map('europeMap', {
        center: config.europe.center,
        zoom: config.europe.zoom,
        minZoom: config.europe.minZoom,
        maxZoom: config.europe.maxZoom,
        zoomControl: true
    });

    // Add base tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(state.europeMap);

    // Create city detail map (initially hidden)
    state.cityMap = L.map('cityMap', {
        center: [51.5, -0.1],
        zoom: config.city.zoom,
        minZoom: config.city.minZoom,
        maxZoom: config.city.maxZoom,
        zoomControl: true
    });

    // Add base tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(state.cityMap);

    console.log('Maps initialized');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Back button
    d3.select('#backButton').on('click', () => {
        returnToEurope();
    });

    // View mode toggle
    d3.selectAll('input[name="viewMode"]').on('change', function() {
        state.viewMode = this.value;
        if (state.currentView === 'city') {
            updateCityVisualization();
        }
    });
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadData() {
    try {
        console.log('Loading cities data...');
        
        // Load cities statistical data
        state.citiesData = await d3.json('/data/processed/cities_statistical_data.json');
        console.log('Cities data loaded:', state.citiesData.length, 'cities');
        
        // Render city markers on Europe map
        renderCityMarkers();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Error loading data. Check console for details.');
    }
}

async function loadCityListings(cityId) {
    try {
        console.log('Loading listings for city:', cityId);
        
        // Find the filename for this city
        const cityMapping = await d3.json('/data/raw/mapping_info/cities_data.json');
        const cityInfo = cityMapping.find(c => c.city.toLowerCase().replace(' ', '_') === cityId);
        
        if (!cityInfo) {
            throw new Error(`City ${cityId} not found in cities_data.json`);
        }
        
        console.log('Loading CSV:', `/data/raw/listings/${cityInfo.filename}`);

        // Load the CSV file for this city
        const listings = await d3.csv(`/data/raw/listings/${cityInfo.filename}`);
        console.log('Listings loaded:', listings.length, 'entries');
        
        // Convert price to number and clean data
        listings.forEach(d => {
            const priceStr = String(d.price || '0').replace(/[$,]/g, '');
            d.price = parseFloat(priceStr);
            if (isNaN(d.price)) d.price = null;
            
            d.latitude = +d.latitude;
            d.longitude = +d.longitude;
        });

        console.log('Data cleaned and parsed');
        
        return listings;
    } catch (error) {
        console.error('Error loading city listings:', error);
        return null;
    }
}

// ============================================================================
// EUROPE MAP VIEW
// ============================================================================

function renderCityMarkers() {
    // Clear existing markers
    state.cityMarkers.forEach(marker => marker.remove());
    state.cityMarkers = [];

    state.citiesData.forEach(city => {
        // Calculate marker size based on number of listings
        const size = Math.sqrt(city.count / 1000) * 4 + 8;
        
        // Create custom icon
        const icon = L.divIcon({
            className: 'city-marker',
            html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%;"></div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });

        // Create marker
        const marker = L.marker([city.lat, city.lng], { icon })
            .addTo(state.europeMap)
            .on('click', () => zoomToCity(city));

        // Create tooltip that shows on hover
        const tooltipContent = `
            <div style="text-align: center;">
                <strong style="font-size: 14px;">${city.city}</strong><br>
                <span style="color: #7f8c8d; font-size: 12px;">${city.country}</span><br>
                <span style="font-size: 13px;">${city.count.toLocaleString()} listings</span><br>
                <span style="font-size: 13px;">€${city.avg_price != null ? city.avg_price.toFixed(2) : 'N/A'} avg</span>
            </div>
        `;
        
        marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -size/2],
            className: 'custom-tooltip'
        });

        state.cityMarkers.push(marker);
    });

    // Add labels for major cities
    const majorCities = state.citiesData.filter(d => d.count > 10000);
    majorCities.forEach(city => {
        const labelIcon = L.divIcon({
            className: 'city-label-marker',
            html: city.city,
            iconSize: [100, 20],
            iconAnchor: [50, -5]
        });

        const label = L.marker([city.lat, city.lng], { 
            icon: labelIcon,
            interactive: false
        }).addTo(state.europeMap);

        state.cityMarkers.push(label);
    });

    console.log('Rendered', state.cityMarkers.length, 'markers');
}

// ============================================================================
// CITY DETAIL VIEW
// ============================================================================

async function zoomToCity(cityData) {
    console.log('Zooming to city:', cityData.city);
    
    state.selectedCity = cityData;
    state.currentView = 'city';

    // Load city listings
    state.currentCityListings = await loadCityListings(cityData.id);

    if (!state.currentCityListings) {
        alert('Failed to load city data');
        returnToEurope();
        return;
    }

    // Switch map views
    document.getElementById('europeMap').classList.add('hidden');
    document.getElementById('cityMap').classList.remove('hidden');

    // Update UI
    d3.select('#backButton').classed('hidden', false);
    d3.select('#viewToggle').classed('hidden', false);

    // Center city map on the city
    state.cityMap.setView([cityData.lat, cityData.lng], config.city.zoom);

    // Force map to recalculate size
    setTimeout(() => {
        state.cityMap.invalidateSize();
        updateCityVisualization();
    }, 100);
}

function updateCityVisualization() {
    // Clear existing markers/layers
    clearCityVisualization();

    if (state.viewMode === 'dots') {
        renderAirbnbDots();
    } else {
        renderAirbnbHeatmap();
    }
}

function clearCityVisualization() {
    // Remove all Airbnb markers
    state.airbnbMarkers.forEach(marker => marker.remove());
    state.airbnbMarkers = [];

    // Remove heatmap layer
    if (state.heatmapLayer) {
        state.heatmapLayer.remove();
        state.heatmapLayer = null;
    }
}

function renderAirbnbDots() {
    console.log('Rendering Airbnb dots...');

    const validListings = state.currentCityListings.filter(d => 
        d.latitude && d.longitude && !isNaN(d.latitude) && !isNaN(d.longitude)
    );

    console.log('Valid listings:', validListings.length);

    validListings.forEach(listing => {
        // Create small circle marker
        const marker = L.circleMarker([listing.latitude, listing.longitude], {
            radius: 3,
            fillColor: '#e74c3c',
            color: 'white',
            weight: 0.5,
            opacity: 0.8,
            fillOpacity: 0.6
        }).addTo(state.cityMap);

        // Create tooltip that shows on hover
        const tooltipContent = `
            <div style="min-width: 150px;">
                <strong style="font-size: 13px;">${listing.name || 'Airbnb Listing'}</strong><br>
                <span style="color: #7f8c8d; font-size: 11px;">Host: ${listing.host_name || 'N/A'}</span><br>
                <span style="font-size: 12px; color: #e74c3c; font-weight: 600;">€${listing.price != null ? listing.price : 'N/A'}</span><br>
                <span style="font-size: 11px;">${listing.room_type || 'N/A'}</span>
                ${listing.neighbourhood ? `<br><span style="font-size: 11px; color: #7f8c8d;">${listing.neighbourhood}</span>` : ''}
            </div>
        `;
        
        marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip'
        });

        // Add hover effect
        marker.on('mouseover', function() {
            this.setStyle({
                radius: 5,
                fillOpacity: 1
            });
        });
        
        marker.on('mouseout', function() {
            this.setStyle({
                radius: 3,
                fillOpacity: 0.6
            });
        });

        state.airbnbMarkers.push(marker);
    });

    console.log('Rendered', state.airbnbMarkers.length, 'Airbnb dots');
}

function renderAirbnbHeatmap() {
    console.log('Rendering smooth heatmap...');

    // Filter valid listings with coordinates
    const validListings = state.currentCityListings.filter(d => 
        d.latitude && d.longitude && !isNaN(d.latitude) && !isNaN(d.longitude)
    );

    console.log('Valid listings for heatmap:', validListings.length);

    // Prepare data for heatmap [lat, lng, intensity]
    // Use price as intensity if available, otherwise use constant
    const heatData = validListings.map(d => {
        const intensity = d.price ? Math.min(d.price / 200, 1) : 0.5;
        return [d.latitude, d.longitude, intensity];
    });

    // Create smooth heatmap layer using Leaflet.heat
    state.heatmapLayer = L.heatLayer(heatData, {
        radius: 25,           // Size of each heat point
        blur: 20,             // Blur amount for smooth gradient
        maxZoom: 17,          // Max zoom where heatmap is visible
        max: 1.0,             // Maximum intensity value
        gradient: {           // Custom color gradient (red theme)
            0.0: 'rgba(0,0,255,0)',
            0.2: 'rgba(0,255,255,0.5)',
            0.4: 'rgba(0,255,0,0.6)',
            0.6: 'rgba(255,255,0,0.7)',
            0.8: 'rgba(255,128,0,0.8)',
            1.0: 'rgba(255,0,0,0.9)'
        }
    }).addTo(state.cityMap);

    console.log('Smooth heatmap rendered with', validListings.length, 'points');
}

function renderAggregatedDots() {
    console.log('Using aggregated dots as heatmap fallback...');

    // Create a grid and aggregate listings
    const gridSize = 0.005; // ~500m
    const grid = {};

    state.currentCityListings.forEach(listing => {
        if (!listing.latitude || !listing.longitude) return;

        const latKey = Math.floor(listing.latitude / gridSize);
        const lngKey = Math.floor(listing.longitude / gridSize);
        const key = `${latKey},${lngKey}`;

        if (!grid[key]) {
            grid[key] = {
                lat: latKey * gridSize + gridSize / 2,
                lng: lngKey * gridSize + gridSize / 2,
                count: 0
            };
        }
        grid[key].count++;
    });

    // Find max count for scaling
    const maxCount = Math.max(...Object.values(grid).map(cell => cell.count));

    // Render aggregated circles
    Object.values(grid).forEach(cell => {
        const intensity = cell.count / maxCount;
        const radius = Math.sqrt(cell.count) * 2 + 5;
        
        const color = d3.interpolateReds(intensity);

        const marker = L.circleMarker([cell.lat, cell.lng], {
            radius: radius,
            fillColor: color,
            color: 'white',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.6
        }).addTo(state.cityMap);

        marker.bindPopup(`<div class="popup-title">${cell.count} Listings</div>`);

        state.airbnbMarkers.push(marker);
    });

    console.log('Rendered', Object.keys(grid).length, 'aggregated cells');
}

// ============================================================================
// NAVIGATION
// ============================================================================

function returnToEurope() {
    console.log('Returning to Europe view');
    
    state.selectedCity = null;
    state.currentCityListings = null;
    state.currentView = 'europe';

    // Clear city visualization
    clearCityVisualization();

    // Switch map views
    document.getElementById('cityMap').classList.add('hidden');
    document.getElementById('europeMap').classList.remove('hidden');

    // Update UI
    d3.select('#backButton').classed('hidden', true);
    d3.select('#viewToggle').classed('hidden', true);

    // Reset Europe map view
    state.europeMap.setView(config.europe.center, config.europe.zoom);
    
    // Force map to recalculate size
    setTimeout(() => {
        state.europeMap.invalidateSize();
    }, 100);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showError(message) {
    console.error(message);
    alert(message);
}

// ============================================================================
// VIS1 - Teammate's first visualization
// ============================================================================

function renderVis1() {
    // VIS1: Your teammate can implement their visualization here
    console.log('VIS1 rendering...');
}

// ============================================================================
// VIS3 - Bar chart for housing comparison
// ============================================================================

function renderVis3() {
    // VIS3: Bar chart comparing Airbnb density to residential housing
    console.log('VIS3 rendering...');
}

// ============================================================================
// START THE APPLICATION
// ============================================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}