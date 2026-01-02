// ============================================================================
// GLOBAL STATE & CONFIGURATION
// ============================================================================

const state = {
    citiesData: null,
    act1Map: null,
    cityMarkers: {},
    currentStep: 'intro',
    cityHeatmaps: {},
    cityListings: {},
    currentHeatmap: null,
    pendingHeatmapTimer: null,
    // Act 3
    act3Map: null,
    act3ViewMode: 'dots',
    act3CityData: {},
    act3Markers: [],
    act3Heatmap: null,
    // Act 4
    densityData: null,
    densityChartRendered: false,
    // Act 4.5
    housingPressureData: null,
    housingPressureLoaded: false,
};

const config = {
    europe: {
        center: [54, 15],
        zoom: 4,
        minZoom: 3,
        maxZoom: 18
    },
    cityZoom: {
        zoom: 11,
        duration: 2.4
    }
};

// Top 5 cities by listing count with their CSV filenames
const TOP_CITIES = [
    { id: 'london', name: 'London', step: 'city-1', filename: 'london.csv' },
    { id: 'paris', name: 'Paris', step: 'city-2', filename: 'paris.csv' },
    { id: 'rome', name: 'Rome', step: 'city-3', filename: 'rome.csv' },
    { id: 'istanbul', name: 'Istanbul', step: 'city-4', filename: 'istanbul.csv' },
    { id: 'madrid', name: 'Madrid', step: 'city-5', filename: 'madrid.csv' }
];

// Act 3 cities for deep dive
const ACT3_CITIES = [
    { id: 'barcelona', name: 'Barcelona', step: 'barcelona', filename: 'barcelona.csv' },
    { id: 'lisbon', name: 'Lisbon', step: 'lisbon', filename: 'lisbon.csv' },
    { id: 'amsterdam', name: 'Amsterdam', step: 'amsterdam', filename: 'amsterdam.csv' }
];

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    console.log('Initializing scrollytelling experience...');
    
    // Set up basic event listeners first
    setupProgressDots();
    setupActObserver();
    
    // Initialize maps
    initializeAct1Map();
    initializeAct2();
    initializeAct3(); 
    initializeAct4();
    initializeAct5();
    initializeAct6();
    
    // Load data (async)
    await loadData();
    
    // Setup scroll listener AFTER data is loaded
    setupScrollListener();
    
    // Restore last viewed act if available
    restoreLastAct();
    
    console.log('✅ All initialization complete');
}

// ============================================================================
// PROGRESS DOTS NAVIGATION
// ============================================================================

function setupProgressDots() {
    const dots = document.querySelectorAll('.progress-dot');
    
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const actNumber = dot.dataset.act;
            scrollToAct(actNumber);
        });
    });
}

function scrollToAct(actNumber) {
    const actElement = document.getElementById(`act${actNumber}`);
    if (actElement) {
        updateProgressDots(actNumber);
        actElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateProgressDots(currentAct) {
    console.log('Updating dots to act:', currentAct); // DEBUG
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach(dot => {
        const dotAct = dot.dataset.act;
        if (dotAct === String(currentAct)) {
            dot.classList.add('active');
            console.log('✓ Activated dot:', dotAct); // DEBUG
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Store the current act in sessionStorage
    if (currentAct) {
        sessionStorage.setItem('lastActiveAct', currentAct);
    }
}

function restoreLastAct() {
    const lastAct = sessionStorage.getItem('lastActiveAct');
    if (lastAct) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
            scrollToAct(lastAct);
        }, 100);
    }
}

function setupActObserver() {
    console.log('Setting up Act observer...'); // DEBUG
    
    const actObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const actId = entry.target.id; // 'act1', 'act2', etc.
                const actNumber = actId.replace('act', '');
                console.log('👁️ Act visible:', actNumber); // DEBUG
                updateProgressDots(actNumber);
            }
        });
    }, {
        threshold: 0.2, // Lower threshold for better detection
        rootMargin: '-20% 0px -20% 0px'
    });
    
    // Observe all acts
    const acts = document.querySelectorAll('.act');
    console.log('Found acts:', acts.length); // DEBUG
    acts.forEach(act => {
        console.log('Observing:', act.id); // DEBUG
        actObserver.observe(act);
    });
}

// ============================================================================
// SCROLL DETECTION
// ============================================================================

function setupScrollListener() {
    // Get both types of narrative steps
    const narrativeSteps = document.querySelectorAll('.narrative-step, .narrative-step-full');
    
    console.log('Found narrative steps:', narrativeSteps.length);
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            console.log('Entry:', entry.target.dataset.step, 'isIntersecting:', entry.isIntersecting, 'ratio:', entry.intersectionRatio);
            
            if (entry.isIntersecting) {
                const stepName = entry.target.dataset.step;
                if (stepName) {
                    activateStep(stepName);
                } else {
                    // If no data-step, check which act this step belongs to and activate accordingly
                    const act5 = document.getElementById('act5');
                    if (act5 && act5.contains(entry.target)) {
                        activateStep('timeline');  // Act 5: Timeline
                    }
                }
            }
        });
    }, {
        threshold: 0.3,  // Lower threshold - trigger when 30% visible
        rootMargin: '-20% 0px -20% 0px'  // Less strict margins
    });
    
    narrativeSteps.forEach(step => {
        const stepName = step.dataset.step;
        if (stepName) {
            console.log('Observing step:', stepName);
            observer.observe(step);
        } else {
            // Also observe steps without data-step (like Act 5)
            observer.observe(step);
        }
    });
    
    console.log('Scroll listener set up for', narrativeSteps.length, 'narrative steps');
}

function setupScrollNextButton() {
    const button = document.getElementById('scroll-next-btn');
    if (!button) return;
    
    // Get all narrative steps in order
    const allSteps = Array.from(document.querySelectorAll('.narrative-step, .narrative-step-full'));
    
    // Function to find current step based on viewport
    function getCurrentStep() {
        const viewportCenter = window.innerHeight / 2;
        let currentStep = null;
        let minDistance = Infinity;
        
        allSteps.forEach(step => {
            const rect = step.getBoundingClientRect();
            const stepCenter = rect.top + rect.height / 2;
            const distance = Math.abs(stepCenter - viewportCenter);
            
            // Check if step is in viewport (at least partially visible)
            if (rect.top < viewportCenter + 100 && rect.bottom > viewportCenter - 100) {
                if (distance < minDistance) {
                    minDistance = distance;
                    currentStep = step;
                }
            }
        });
        
        return currentStep;
    }
    
    // Function to get next step
    function getNextStep() {
        const currentStep = getCurrentStep();
        if (!currentStep) {
            // If no current step, return first step
            return allSteps.length > 0 ? allSteps[0] : null;
        }
        
        const currentIndex = allSteps.indexOf(currentStep);
        if (currentIndex < allSteps.length - 1) {
            return allSteps[currentIndex + 1];
        }
        
        return null; // Last step, no next step
    }
    
    // Function to scroll to next step
    function scrollToNext() {
        const nextStep = getNextStep();
        if (nextStep) {
            nextStep.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }
    
    // Button click handler
    button.addEventListener('click', scrollToNext);
    
    // Show/hide button based on scroll position
    function updateButtonVisibility() {
        const nextStep = getNextStep();
        if (nextStep) {
            button.classList.remove('hidden');
        } else {
            button.classList.add('hidden');
        }
    }
    
    // Update button visibility on scroll (with debouncing)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateButtonVisibility, 150);
    }, { passive: true });
    
    // Also update on resize
    window.addEventListener('resize', () => {
        updateButtonVisibility();
    });
    
    // Initial check
    setTimeout(updateButtonVisibility, 500);
}

function activateStep(stepName) {
    if (state.currentStep === stepName) return;
    
    console.log('Activating step:', stepName);
    state.currentStep = stepName;
    
    // Update narrative step visual state
    document.querySelectorAll('.narrative-step').forEach(step => {
        if (step.dataset.step === stepName) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Update narrative overlay visual state (for Act 3)
    document.querySelectorAll('.narrative-overlay').forEach(overlay => {
        if (overlay.dataset.step === stepName) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    });
    
    // Update progress dots based on which act this step belongs to
    if (['intro', 'top-cities-intro', 'city-1', 'city-2', 'city-3', 'city-4', 'city-5', 'transition'].includes(stepName)) {
        updateProgressDots(1);
    } else if (stepName?.startsWith('affordability-') || stepName?.startsWith('private-room-') || stepName?.startsWith('entire-home-')) {
        updateProgressDots(2);
    } else if (stepName?.startsWith('concentration-') || stepName?.includes('barcelona') || stepName?.includes('lisbon') || stepName?.includes('amsterdam')) {
        updateProgressDots(3);
    } else if (stepName?.startsWith('impact-')) {
        updateProgressDots(4);
    } else if (stepName === 'timeline') {
        updateProgressDots(5);  // Act 5: Timeline
    } else if (stepName?.startsWith('response-')) {
        updateProgressDots(6);  // Act 6: The Response
    }
    
    // Update map based on step
    updateMapForStep(stepName);
}

// ============================================================================
// MAP INITIALIZATION
// ============================================================================

function initializeAct1Map() {
    // Create map
    state.act1Map = L.map('act1-map', {
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
    }).addTo(state.act1Map);

    console.log('Act 1 map initialized');
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
        
        // Render city markers on Act 1 map
        renderCityMarkers();
        
        // Preload top 5 cities data for smooth scrolling
        await preloadTopCities();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Check console for details.');
    }
    state.housingPressureData = await d3.json('/data/processed/housing_pressure.json');
    state.housingPressureLoaded = true;
    console.log(
        'Housing pressure data loaded:',
        state.housingPressureData.length,
        'cities'
    );
}

async function preloadTopCities() {
    console.log('Preloading top cities data...');
    
    for (const cityConfig of TOP_CITIES) {
        try {
            const listings = await loadCityListings(cityConfig.id, cityConfig.filename);
            if (listings && listings.length > 0) {
                state.cityListings[cityConfig.id] = listings;
                createCityHeatmap(cityConfig.id, listings);
                console.log(`✓ Loaded ${cityConfig.name}: ${listings.length} listings`);
            } else {
                console.warn(`⚠ No listings data for ${cityConfig.name}`);
            }
        } catch (error) {
            console.warn(`⚠ Could not load ${cityConfig.name} (this is OK for demo):`, error.message);
        }
    }
    
    console.log('Top cities data loading complete');
}

async function loadCityListings(cityId, filename) {
    try {
        const listings = await d3.csv(`/data/raw/listings/${filename}`);
        
        // Clean and parse data
        const validListings = [];
        listings.forEach(d => {
            const lat = +d.latitude;
            const lng = +d.longitude;
            
            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                const priceStr = String(d.price || '0').replace(/[$,]/g, '');
                const price = parseFloat(priceStr);
                
                validListings.push({
                    latitude: lat,
                    longitude: lng,
                    price: isNaN(price) ? null : price,
                    name: d.name,
                    room_type: d.room_type
                });
            }
        });
        
        return validListings;
    } catch (error) {
        // Don't throw - just return null so the demo works without all files
        console.warn(`Note: ${filename} not found - zoom will work without heatmap`);
        return null;
    }
}

// ============================================================================
// CITY MARKERS
// ============================================================================

function renderCityMarkers() {
    state.citiesData.forEach(city => {
        // Calculate marker size based on number of listings
        const size = Math.sqrt(city.count / 1000) * 4 + 8;
        
        // Check if this is a top city
        const isTopCity = TOP_CITIES.some(tc => tc.id === city.id);
        
        // Create custom icon
        const icon = L.divIcon({
            className: isTopCity ? 'city-marker top-city' : 'city-marker',
            html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%;"></div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });

        // Create marker
        const marker = L.marker([city.lat, city.lng], { icon })
            .addTo(state.act1Map);

        // Create tooltip
        const tooltipContent = `
            <div style="text-align: center;">
                <strong style="font-size: 14px;">${city.city}</strong><br>
                <span style="color: #b3b3b3; font-size: 12px;">${city.country}</span><br>
                <span style="font-size: 13px;">${city.count.toLocaleString()} listings</span><br>
                ${city.avg_price != null ? `<span style="font-size: 13px;">€${city.avg_price.toFixed(2)} avg</span>` : ''}
            </div>
        `;
        
        marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -size/2],
            className: 'custom-tooltip'
        });

        // Store reference if it's a top city
        if (isTopCity) {
            state.cityMarkers[city.id] = marker;
        }
    });

    console.log('Rendered city markers');
}

// ============================================================================
// HEATMAP MANAGEMENT
// ============================================================================

function createCityHeatmap(cityId, listings) {
    // Prepare heatmap data [lat, lng, intensity]
    const heatData = listings.map(d => {
        const intensity = d.price ? Math.min(d.price / 200, 1) : 0.5;
        return [d.latitude, d.longitude, intensity];
    });
    
    // Create heatmap layer (but don't add to map yet)
    // Using the same settings as the original city visualization
    const heatmapLayer = L.heatLayer(heatData, {
        radius: 25,           // Size of each heat point
        blur: 20,             // Blur amount for smooth gradient
        maxZoom: 17,          // Max zoom where heatmap is visible
        max: 1.0,             // Maximum intensity value
        gradient: {           // Custom color gradient (blue → cyan → green → yellow → orange → red)
            0.0: 'rgba(0,0,255,0)',
            0.2: 'rgba(0,255,255,0.5)',
            0.4: 'rgba(0,255,0,0.6)',
            0.6: 'rgba(255,255,0,0.7)',
            0.8: 'rgba(255,128,0,0.8)',
            1.0: 'rgba(255,0,0,0.9)'
        }
    });
    
    state.cityHeatmaps[cityId] = heatmapLayer;
}

function showCityHeatmap(cityId) {
    // Hide current heatmap if any
    if (state.currentHeatmap) {
        state.currentHeatmap.remove();
        state.currentHeatmap = null;
    }
    
    // Show new heatmap
    const heatmap = state.cityHeatmaps[cityId];
    if (heatmap) {
        heatmap.addTo(state.act1Map);
        state.currentHeatmap = heatmap;
    }
}

function hideAllHeatmaps() {
    // Cancel any pending heatmap timer first
    if (state.pendingHeatmapTimer) {
        clearTimeout(state.pendingHeatmapTimer);
        state.pendingHeatmapTimer = null;
    }
    
    // Remove the currently displayed heatmap
    if (state.currentHeatmap) {
        state.currentHeatmap.remove();
        state.currentHeatmap = null;
    }
}

// ============================================================================
// MAP UPDATES BASED ON SCROLL
// ============================================================================

function updateMapForStep(stepName) {
    console.log('Step changed to:', stepName); // DEBUG
    
    // ACT 1: Map steps
    if (stepName?.startsWith('city-') || ['intro', 'top-cities-intro', 'transition'].includes(stepName)) {
        // IMMEDIATELY hide any existing heatmap when changing steps
        hideAllHeatmaps();
        
        // Reset all highlights and show all markers
        resetAllHighlights();
        
        // Handle specific steps
        switch(stepName) {
            case 'intro':
                // Show all of Europe
                state.act1Map.flyTo(config.europe.center, config.europe.zoom, {
                    duration: config.cityZoom.duration
                });
                break;
                
            case 'top-cities-intro':
                // Maybe zoom in slightly
                state.act1Map.flyTo(config.europe.center, config.europe.zoom + 0.5, {
                    duration: config.cityZoom.duration
                });
                break;
                
            case 'city-1':
            case 'city-2':
            case 'city-3':
            case 'city-4':
            case 'city-5':
                // Heatmap already hidden at the top - now zoom and show new one
                zoomToCityWithHeatmap(stepName);
                break;
                
            case 'transition':
                // Reset to full view - make sure heatmap is really gone
                hideAllHeatmaps(); // Extra safety
                state.act1Map.flyTo(config.europe.center, config.europe.zoom, {
                    duration: config.cityZoom.duration
                });
                break;

        }
    }
    
    // ACT 2: Affordability steps
    if (stepName?.startsWith('affordability-') || stepName?.startsWith('private-room-') || stepName?.startsWith('entire-home-')) {
        switch(stepName) {
            case 'affordability-intro':
                highlightAffordabilityCities([]);
                // Trigger bar animation
                setTimeout(() => {
                    animateAffordabilityBars();
                }, 100);
                break;
            
            case 'private-room-intro':
            case 'private-room-top':
                switchChartMetric('private'); // Auto-switch to private room
                if (stepName === 'private-room-top') {
                    highlightAffordabilityCities(['Munich', 'Riga', 'Budapest']);
                } else {
                    highlightAffordabilityCities([]);
                }
                break;
                
            case 'entire-home-intro':
            case 'entire-home-outlier':
            case 'entire-home-top':
                switchChartMetric('entire'); // Auto-switch to entire home
                if (stepName === 'entire-home-outlier') {
                    highlightAffordabilityCities(['Hague']);
                } else if (stepName === 'entire-home-top') {
                    highlightAffordabilityCities(['Munich', 'Prague', 'Berlin']);
                } else {
                    highlightAffordabilityCities([]);
                }
                break;
                
            case 'affordability-transition':
                highlightAffordabilityCities([]);
                break;
        }
    }

    // ACT 3: City concentration steps
    if (stepName?.startsWith('concentration-') || stepName?.includes('barcelona') || stepName?.includes('lisbon') || stepName?.includes('amsterdam')) {
        switch(stepName) {
            // ACT 3: Concentration steps
            case 'concentration-intro':
                resetAct3View();
                break;
                
            case 'barcelona-intro':
                showAct3City('barcelona');
                break;
                
            case 'lisbon-intro':
                showAct3City('lisbon');
                break;
                
            case 'amsterdam-intro':
                showAct3City('amsterdam');
                break;
                
            case 'concentration-transition':
                resetAct3View();
                break;
        }
    }

    // ACT 4: Impact / Density steps
    if (stepName?.startsWith('impact-')) {
        switch(stepName) {
            case 'impact-intro':
                // Animate bars growing in on first card (with small delay to ensure chart is ready)
                setTimeout(() => {
                    animateDensityBars();
                }, 100);
                // Reset highlights
                highlightDensityCities([]);
                break;
                
            case 'impact-all':
                // Animate bars growing in
                animateDensityBars();
                break;
                
            case 'impact-extremes':
                // Highlight extreme cases
                highlightDensityCities(['south_aegean', 'crete', 'venice', 'florence', 'mallorca', 'copenhagen']);
                break;
                
            case 'impact-comparison':
                // Highlight low-density cities
                highlightDensityCities(['rotterdam', 'stockholm', 'berlin', 'naples']);
                break;
                
            case 'impact-transition':
                // Reset highlights
                highlightDensityCities([]);
                break;
        }
    }

    // ACT 4.5: Housing Pressure
    if (stepName === 'pressure-intro') {
        renderHousingGauge('girona');
    }

    if (stepName === 'pressure-high') {
        renderHousingGauge('bergamo'); // or malta
    }

    if (stepName === 'pressure-low') {
        renderHousingGauge('berlin'); // or rotterdam
    }


    // ACT 5: Response / Solutions steps (narrative-focused, no map updates)
    if (stepName?.startsWith('response-')) {
        // Act 5 is purely narrative, no map/chart updates needed
        console.log('Act 5 step:', stepName);
    }
}

function zoomToCityWithHeatmap(stepName) {
    // Safety check: return if data not loaded yet
    if (!state.citiesData) return;
    
    const cityConfig = TOP_CITIES.find(c => c.step === stepName);
    if (!cityConfig) return;
    
    // Get city data
    const cityData = state.citiesData.find(c => c.id === cityConfig.id);
    if (!cityData) return;
    
    // Cancel any pending heatmap timer
    if (state.pendingHeatmapTimer) {
        clearTimeout(state.pendingHeatmapTimer);
        state.pendingHeatmapTimer = null;
    }
    
    // Hide the marker for this city
    const marker = state.cityMarkers[cityConfig.id];
    if (marker) {
        marker.setOpacity(0);
    }
    
    // Zoom to city
    state.act1Map.flyTo([cityData.lat, cityData.lng], config.cityZoom.zoom, {
        duration: config.cityZoom.duration
    });
    
    // Show heatmap AFTER zoom completes
    // Store the timer so we can cancel it if needed
    state.pendingHeatmapTimer = setTimeout(() => {
        showCityHeatmap(cityConfig.id);
        state.pendingHeatmapTimer = null; // Clear the reference
    }, config.cityZoom.duration * 1000 + 100);
}

function resetAllHighlights() {
    // Reset all markers: remove highlight AND make visible again
    Object.values(state.cityMarkers).forEach(marker => {
        const markerElement = marker.getElement();
        if (markerElement) {
            const markerDiv = markerElement.querySelector('div');
            if (markerDiv) {
                markerDiv.classList.remove('highlighted');
            }
        }
        // Make marker visible again
        marker.setOpacity(1);
    });
}

// ============================================================================
// ACT 2: AFFORDABILITY CHART
// ============================================================================

let affordabilityData = null;
let currentMetric = 'private';
let highlightedCities = [];
let affordabilityBarsAnimated = false; // Track if bars have been animated

async function initializeAct2() {
    try {
        console.log('Loading affordability data...');
        affordabilityData = await d3.json('/data/processed/cities_affordability_2023.json');
        console.log('Affordability data loaded:', affordabilityData.length, 'cities');
        
        // Render initial chart
        renderAffordabilityChart('private');
        
        // Set up metric toggle
        document.querySelectorAll('input[name="affMetric"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const newMetric = e.target.value;
                if (currentMetric === newMetric) return; // Already on this metric
                
                currentMetric = newMetric;
                
                // Fade out current chart
                d3.select('#affordability-chart')
                    .transition()
                    .duration(300)
                    .style('opacity', 0)
                    .on('end', () => {
                        // Re-render chart with new metric
                        renderAffordabilityChart(currentMetric);
                        
                        // Re-apply highlights if any
                        if (highlightedCities.length > 0) {
                            highlightAffordabilityCities(highlightedCities);
                        }
                        
                        // Fade in new chart
                        d3.select('#affordability-chart')
                            .style('opacity', 0)
                            .transition()
                            .duration(300)
                            .style('opacity', 1);
                    });
            });
        });
        
    } catch (error) {
        console.error('Error loading affordability data:', error);
    }
}

function renderAffordabilityChart(metric = 'private') {
    const container = d3.select('#affordability-chart');
    container.selectAll('*').remove();
    
    if (!affordabilityData) {
        container.append('div')
            .attr('class', 'loading')
            .text('Loading affordability data...');
        return;
    }
    
    // Pick metric key
    const metricKey = metric === 'private' 
        ? 'affordability_private_room_vs_1bed_rent'
        : 'affordability_entire_home_vs_house_rent';
    
    // Filter and sort data
    const data = affordabilityData
        .filter(d => d[metricKey] != null && !isNaN(d[metricKey]))
        .map(d => ({
            country: d.country,
            city: d.city,
            value: +d[metricKey],
            rent1bed: d.rent_1bed_month,
            rentHouse: d.rent_house_detached_month
        }))
        .sort((a, b) => b.value - a.value);
    
    if (data.length === 0) {
        container.append('div')
            .attr('class', 'loading')
            .text('No data available for this metric.');
        return;
    }
    
    // Dimensions
    const containerWidth = container.node().getBoundingClientRect().width || 700;
    const margin = { top: 20, right: 80, bottom: 30, left: 160 };
    const rowHeight = 36;
    const height = data.length * rowHeight + margin.top + margin.bottom;
    const width = containerWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xMax = d3.max(data, d => d.value) || 1;
    const x = d3.scaleLinear()
        .domain([0, xMax * 1.05])
        .range([0, innerWidth]);
    
    const y = d3.scaleBand()
        .domain(data.map(d => d.city))
        .range([0, innerHeight])
        .padding(0.2);
    
    // Axes
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d => d.toFixed(1) + '×'));
    
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y));
    
    // Tooltip
    let tooltip = d3.select('body').selectAll('.d3-tooltip').data([null]);
    tooltip = tooltip.enter().append('div')
        .attr('class', 'd3-tooltip')
        .merge(tooltip);
    
    function showTooltip(event, d) {
        const label = metric === 'private'
            ? 'Private room vs 1-bed rent'
            : 'Entire home vs house rent';
        
        const rentLine = metric === 'private'
            ? `1-bed rent/month: €${d.rent1bed?.toFixed(0) || 'N/A'}`
            : `House rent/month: €${d.rentHouse?.toFixed(0) || 'N/A'}`;
        
        tooltip
            .style('opacity', 1)
            .html(`
                <div style="font-weight:600; margin-bottom:6px;">${d.city}, ${d.country}</div>
                <div>${label}: <b>${d.value.toFixed(2)}×</b></div>
                <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">${rentLine}</div>
            `)
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY + 10}px`);
    }
    
    function moveTooltip(event) {
        tooltip
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY + 10}px`);
    }
    
    function hideTooltip() {
        tooltip.style('opacity', 0);
    }
    
    // Bars - start at width 0 for first animation, full width after that
    g.selectAll('rect.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', affordabilityBarsAnimated ? 'bar visible' : 'bar') // Add visible class if already animated
        .attr('data-city', d => d.city.toLowerCase())
        .attr('data-target-width', d => x(d.value)) // Store target width
        .attr('x', 0)
        .attr('y', d => y(d.city))
        .attr('height', y.bandwidth())
        .attr('width', d => affordabilityBarsAnimated ? x(d.value) : 0) // Full width if animated, 0 if not
        .style('opacity', affordabilityBarsAnimated ? 0.7 : 0) // Set initial opacity
        .on('mouseenter', showTooltip)
        .on('mousemove', moveTooltip)
        .on('mouseleave', hideTooltip);
    
    // Value labels - show immediately if already animated
    g.selectAll('text.value')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'value')
        .attr('x', d => x(d.value) + 8)
        .attr('y', d => y(d.city) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .text(d => d.value.toFixed(2) + '×')
        .style('opacity', affordabilityBarsAnimated ? 1 : 0); // Show if animated, hide if not
}

function animateAffordabilityBars() {
    // Only animate once
    if (affordabilityBarsAnimated) return;
    
    // Animate bars growing in from width 0 to target width
    d3.selectAll('#affordability-chart rect.bar')
        .transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .ease(d3.easeCubicOut)
        .attr('width', function() { 
            return this.getAttribute('data-target-width'); 
        })
        .style('opacity', 0.7) // Fade to normal opacity
        .attr('class', 'bar visible');
    
    // Animate value labels fading in
    d3.selectAll('#affordability-chart text.value')
        .transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .style('opacity', 1);
    
    // Mark as animated
    affordabilityBarsAnimated = true;
}

function highlightAffordabilityCities(cityNames) {
    highlightedCities = cityNames;
    
    const allBars = d3.selectAll('#affordability-chart rect.bar');
    const allLabels = d3.selectAll('#affordability-chart text.value');
    
    if (cityNames.length > 0) {
        // Fade out non-highlighted bars
        allBars
            .classed('highlighted', false)
            .classed('visible', true)
            .transition()
            .duration(400)
            .style('opacity', 0.3);
        
        // Fade out non-highlighted labels
        allLabels
            .transition()
            .duration(400)
            .style('opacity', 0.4);
        
        // Highlight and fade in specified cities
        cityNames.forEach(cityName => {
            d3.selectAll(`#affordability-chart rect.bar[data-city="${cityName.toLowerCase()}"]`)
                .classed('highlighted', true)
                .transition()
                .duration(400)
                .style('opacity', 1);
            
            d3.selectAll(`#affordability-chart text.value`)
                .filter(function(d) {
                    return d && d.city.toLowerCase() === cityName.toLowerCase();
                })
                .transition()
                .duration(400)
                .style('opacity', 1);
        });
    } else {
        // No highlights - fade all bars back to normal
        allBars
            .classed('highlighted', false)
            .transition()
            .duration(400)
            .style('opacity', 0.7);
        
        allLabels
            .transition()
            .duration(400)
            .style('opacity', 1);
    }
}

function switchChartMetric(metric) {
    if (currentMetric === metric) return; // Don't switch if already on this metric
    
    currentMetric = metric;
    
    // Update radio button
    const radio = document.querySelector(`input[name="affMetric"][value="${metric}"]`);
    if (radio) {
        radio.checked = true;
    }
    
    // Fade out current chart
    d3.select('#affordability-chart')
        .transition()
        .duration(300)
        .style('opacity', 0)
        .on('end', () => {
            // Re-render chart with new metric
            renderAffordabilityChart(metric);
            
            // Fade in new chart
            d3.select('#affordability-chart')
                .style('opacity', 0)
                .transition()
                .duration(300)
                .style('opacity', 1);
        });
}

// ============================================================================
// ACT 3: CITY CONCENTRATION
// ============================================================================

function initializeAct3() {
    console.log('Initializing Act 3...');
    
    // Wait a bit for the DOM to be ready
    setTimeout(() => {
        // Create map
        state.act3Map = L.map('act3-map', {
            center: config.europe.center,
            zoom: config.europe.zoom,
            minZoom: 3,
            maxZoom: 18,
            zoomControl: true
        });

        // Add base tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(state.act3Map);

        // Set up view mode toggle
        document.querySelectorAll('input[name="act3ViewMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.act3ViewMode = e.target.value;
                updateAct3Visualization();
            });
        });

        // Preload Act 3 cities
        preloadAct3Cities();
        
        // Add an Intersection Observer to invalidate map size when Act 3 becomes visible
        const act3Section = document.getElementById('act3');
        if (act3Section) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && state.act3Map) {
                        console.log('Act 3 visible - invalidating map size');
                        setTimeout(() => {
                            state.act3Map.invalidateSize();
                        }, 100);
                    }
                });
            }, { threshold: 0.1 });
            
            observer.observe(act3Section);
        }
        
        console.log('Act 3 map initialized');
    }, 100);
}

async function preloadAct3Cities() {
    console.log('Preloading Act 3 cities...');
    
    for (const cityConfig of ACT3_CITIES) {
        try {
            const listings = await loadCityListings(cityConfig.id, cityConfig.filename);
            if (listings && listings.length > 0) {
                state.act3CityData[cityConfig.id] = {
                    listings: listings,
                    config: cityConfig
                };
                console.log(`✓ Loaded ${cityConfig.name} for Act 3: ${listings.length} listings`);
            }
        } catch (error) {
            console.warn(`⚠ Could not load ${cityConfig.name}:`, error.message);
        }
    }
    
    console.log('Act 3 cities loaded');
}

function showAct3City(cityId) {
    // Safety check: return if data not loaded yet
    if (!state.citiesData) return;
    
    const cityData = state.act3CityData[cityId];
    if (!cityData) {
        console.warn(`No data for ${cityId}`);
        return;
    }
    
    // Get city center from main cities data
    const cityInfo = state.citiesData.find(c => c.id === cityId);
    if (!cityInfo) return;
    
    // Update stats panel
    updateStatsPanel(cityInfo);
    
    // Zoom to city
    state.act3Map.flyTo([cityInfo.lat, cityInfo.lng], 11, {
        duration: 2.4
    });
    
    // Show visualization after zoom
    setTimeout(() => {
        updateAct3Visualization();
    }, 1500);
}

function updateAct3Visualization() {
    // Clear existing visualization
    clearAct3Visualization();
    
    // Find which city is currently active
    const currentCity = getCurrentAct3City();
    if (!currentCity) return;
    
    const cityData = state.act3CityData[currentCity];
    if (!cityData) return;
    
    if (state.act3ViewMode === 'dots') {
        renderAct3Dots(cityData.listings);
    } else {
        renderAct3Heatmap(cityData.listings);
    }
}

function getCurrentAct3City() {
    const step = state.currentStep;
    if (step.includes('barcelona')) return 'barcelona';
    if (step.includes('lisbon')) return 'lisbon';
    if (step.includes('amsterdam')) return 'amsterdam';
    return null;
}

function renderAct3Dots(listings) {
    console.log('Rendering Act 3 dots:', listings.length);
    
    // Safety check: ensure map is ready
    if (!state.act3Map || !state.act3Map.getContainer()) return;
    
    listings.forEach(listing => {
        const marker = L.circleMarker([listing.latitude, listing.longitude], {
            radius: 4,
            fillColor: '#FF385C',
            color: 'white',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.6
        }).addTo(state.act3Map);

        // Tooltip
        const tooltipContent = `
            <div style="min-width: 150px;">
                <strong style="font-size: 13px;">${listing.name || 'Airbnb Listing'}</strong><br>
                ${listing.price ? `<span style="font-size: 12px; color: #FF385C; font-weight: 600;">€${listing.price}</span><br>` : ''}
                <span style="font-size: 11px;">${listing.room_type || 'N/A'}</span>
            </div>
        `;
        
        marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip'
        });

        marker.on('mouseover', function() {
            this.setStyle({
                radius: 6,
                fillOpacity: 1
            });
        });
        
        marker.on('mouseout', function() {
            this.setStyle({
                radius: 4,
                fillOpacity: 0.6
            });
        });

        state.act3Markers.push(marker);
    });
}

function renderAct3Heatmap(listings) {
    console.log('Rendering Act 3 heatmap:', listings.length);
    
    // Safety check: ensure map is ready
    if (!state.act3Map || !state.act3Map.getContainer()) return;
    
    const heatData = listings.map(d => {
        const intensity = d.price ? Math.min(d.price / 200, 1) : 0.5;
        return [d.latitude, d.longitude, intensity];
    });
    
    state.act3Heatmap = L.heatLayer(heatData, {
        radius: 25,
        blur: 20,
        maxZoom: 17,
        max: 1.0,
        gradient: {
            0.0: 'rgba(0,0,255,0)',
            0.2: 'rgba(0,255,255,0.5)',
            0.4: 'rgba(0,255,0,0.6)',
            0.6: 'rgba(255,255,0,0.7)',
            0.8: 'rgba(255,128,0,0.8)',
            1.0: 'rgba(255,0,0,0.9)'
        }
    }).addTo(state.act3Map);
}

function clearAct3Visualization() {
    // Remove all markers
    state.act3Markers.forEach(marker => marker.remove());
    state.act3Markers = [];
    
    // Remove heatmap
    if (state.act3Heatmap) {
        state.act3Heatmap.remove();
        state.act3Heatmap = null;
    }
}

function updateStatsPanel(cityInfo) {
    document.getElementById('stat-city').textContent = cityInfo.city;
    document.getElementById('stat-listings').textContent = cityInfo.count.toLocaleString();
    document.getElementById('stat-price').textContent = cityInfo.avg_price 
        ? `€${cityInfo.avg_price.toFixed(0)}`
        : 'N/A';
}

function resetAct3View() {
    clearAct3Visualization();
    state.act3Map.flyTo(config.europe.center, config.europe.zoom, {
        duration: 1.5
    });
    
    // Reset stats
    document.getElementById('stat-city').textContent = '-';
    document.getElementById('stat-listings').textContent = '-';
    document.getElementById('stat-price').textContent = '-';
}

// ============================================================================
// ACT 4: POPULATION DENSITY / IMPACT
// ============================================================================

let highlightedDensityCities = [];

async function initializeAct4() {
    try {
        console.log('Loading density data...');
        state.densityData = await d3.json('/data/processed/city_population_density.json');
        console.log('Density data loaded:', state.densityData.length, 'cities');
        
        // Sort by density (highest first)
        state.densityData.sort((a, b) => b.airbnbs_per_1k - a.airbnbs_per_1k);
        
        // Take only top 20 cities
        state.densityData = state.densityData.slice(0, 20);  // ← ADD THIS LINE
        
        console.log('Using top 20 cities for chart');
        
        // Render the chart (initially all bars hidden)
        renderDensityChart();
        
    } catch (error) {
        console.error('Error loading density data:', error);
    }
}

function renderDensityChart() {
    const container = d3.select('#density-chart');
    container.selectAll('*').remove();
    
    if (!state.densityData) {
        container.append('div')
            .attr('class', 'loading')
            .text('Loading density data...');
        return;
    }
    
    const data = state.densityData;
    
    // Dimensions
    const containerWidth = container.node().getBoundingClientRect().width || 700;
    const margin = { top: 10, right: 80, bottom: 30, left: 180 };
    const barHeight = 24;
    const height = data.length * barHeight + margin.top + margin.bottom;
    const width = containerWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xMax = d3.max(data, d => d.airbnbs_per_1k) || 1;
    const x = d3.scaleLinear()
        .domain([0, xMax * 1.05])
        .range([0, innerWidth]);
    
    const y = d3.scaleBand()
        .domain(data.map(d => d.city))
        .range([0, innerHeight])
        .padding(0.15);
    
    // Axes
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6));
    
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).tickSize(0));
    
    // Tooltip
    let tooltip = d3.select('body').selectAll('.d3-tooltip').data([null]);
    tooltip = tooltip.enter().append('div')
        .attr('class', 'd3-tooltip')
        .merge(tooltip);
    
    function showTooltip(event, d) {
        tooltip
            .style('opacity', 1)
            .html(`
                <div style="font-weight:600; margin-bottom:6px;">${d.city}, ${d.country}</div>
                <div><b>${d.airbnbs_per_1k.toFixed(1)}</b> Airbnbs per 1,000 residents</div>
                <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
                    ${d.listings.toLocaleString()} listings / ${d.population.toLocaleString()} population
                </div>
                ${d.population_source ? `<div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">Population: ${d.population_source}</div>` : ''}
            `)
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY + 10}px`);
    }
    
    function moveTooltip(event) {
        tooltip
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY + 10}px`);
    }
    
    function hideTooltip() {
        tooltip.style('opacity', 0);
    }
    
    // Bars - start at width 0 for growth animation
    g.selectAll('rect.density-bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'density-bar')
        .attr('data-city', d => d.id)
        .attr('data-target-width', d => x(d.airbnbs_per_1k)) // Store target width
        .attr('x', 0)
        .attr('y', d => y(d.city))
        .attr('height', y.bandwidth())
        .attr('width', 0) // Start at 0 for animation
        .style('opacity', 0) // Start hidden
        .on('mouseenter', showTooltip)
        .on('mousemove', moveTooltip)
        .on('mouseleave', hideTooltip);
    
    // Value labels
    g.selectAll('text.density-value')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'density-value')
        .attr('x', d => x(d.airbnbs_per_1k) + 6)
        .attr('y', d => y(d.city) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .text(d => d.airbnbs_per_1k.toFixed(1))
        .style('opacity', 0);
    
    // Add note about data sources
    const noteText = data.some(d => d.population_source) 
        ? "* Some population values are sourced from Wikipedia where Eurostat data was unavailable."
        : "";
    d3.select('#density-note').text(noteText);
    
    state.densityChartRendered = true;
}

function animateDensityBars() {
    if (!state.densityChartRendered) return;
    
    // Animate bars growing in from width 0 to target width
    d3.selectAll('#density-chart rect.density-bar')
        .transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .ease(d3.easeCubicOut)
        .attr('width', function() { 
            return this.getAttribute('data-target-width'); 
        })
        .style('opacity', 0.7) // Fade to normal opacity
        .attr('class', 'density-bar visible');
    
    // Animate value labels fading in
    d3.selectAll('#density-chart text.density-value')
        .transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .style('opacity', 1);
}

function highlightDensityCities(cityIds) {
    highlightedDensityCities = cityIds;
    
    if (!state.densityChartRendered) return;
    
    const allBars = d3.selectAll('#density-chart rect.density-bar');
    const allLabels = d3.selectAll('#density-chart text.density-value');
    
    if (cityIds.length > 0) {
        // Fade out non-highlighted bars
        allBars
            .classed('highlighted', false)
            .transition()
            .duration(400)
            .style('opacity', 0.3);
        
        // Fade out non-highlighted labels
        allLabels
            .transition()
            .duration(400)
            .style('opacity', 0.4);
        
        // Highlight and fade in specified cities
        cityIds.forEach(cityId => {
            d3.selectAll(`#density-chart rect.density-bar[data-city="${cityId}"]`)
                .classed('highlighted', true)
                .transition()
                .duration(400)
                .style('opacity', 1);
            
            d3.selectAll(`#density-chart text.density-value`)
                .filter(function(d) {
                    return d && d.id === cityId;
                })
                .transition()
                .duration(400)
                .style('opacity', 1);
        });
    } else {
        // No highlights - fade all bars back to normal
        allBars
            .classed('highlighted', false)
            .transition()
            .duration(400)
            .style('opacity', 0.7);
        
        allLabels
            .transition()
            .duration(400)
            .style('opacity', 1);
    }
}

// ===================================================
// ACT 4.5: Housing Pressure Gauge
// ===================================================

function renderHousingGauge(cityId) {
  if (!state.housingPressureData || !Array.isArray(state.housingPressureData)) {
      console.warn('Housing pressure data not loaded');
      return;
  }

  const city = state.housingPressureData.find(d => d.id === cityId);
  if (!city) {
      console.warn('City not found:', cityId);
      return;
  }

  // Ensure numeric values (JSON sometimes comes through as strings)
  const actualValue = +city.airbnb_share;
  const airbnbHomes = +city.airbnb_homes;
  const totalHousing = +city.total_housing;

  const containerSel = d3.select('#housing-gauge');
  if (containerSel.empty()) {
      console.warn('Missing #housing-gauge container in DOM');
      return;
  }

  console.log('Rendering gauge for:', city.city, actualValue + '%');
  state.currentHousingCity = cityId;

  containerSel.selectAll('*').remove();

  const width = 480;
  const height = 400;
  const radius = 140;
  const gaugeY = 160;

  const svg = containerSel.append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('overflow', 'visible');

  const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${gaugeY})`);

  const maxValue = 15;
  const scale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([-Math.PI * 0.75, Math.PI * 0.75]);

  const arc = d3.arc()
      .innerRadius(radius - 28)
      .outerRadius(radius)
      .cornerRadius(2);

  const zones = [
      { from: 0, to: 2, color: '#4CAF50' },
      { from: 2, to: 5, color: '#FFC107' },
      { from: 5, to: maxValue, color: '#FF385C' }
  ];

  zones.forEach(z => {
      g.append('path')
          .attr('d', arc({ startAngle: scale(z.from), endAngle: scale(z.to) }))
          .attr('fill', z.color)
          .attr('opacity', 0.85);
  });

  const ticks = [0, 2, 5, 10, 15];
  ticks.forEach(val => {
      const angle = scale(val);
      const innerR = radius - 28;
      const outerR = radius + 5;

      const x1 = Math.cos(angle - Math.PI / 2) * innerR;
      const y1 = Math.sin(angle - Math.PI / 2) * innerR;
      const x2 = Math.cos(angle - Math.PI / 2) * outerR;
      const y2 = Math.sin(angle - Math.PI / 2) * outerR;

      g.append('line')
          .attr('x1', x1).attr('y1', y1)
          .attr('x2', x2).attr('y2', y2)
          .attr('stroke', '#333')
          .attr('stroke-width', 2);

      const labelR = radius + 20;
      const labelX = Math.cos(angle - Math.PI / 2) * labelR;
      const labelY = Math.sin(angle - Math.PI / 2) * labelR;

      g.append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '13px')
          .attr('font-weight', '600')
          .attr('fill', '#333')
          .text(val + '%');
  });

  const displayValue = Math.min(actualValue, maxValue);
  const needleAngle = scale(displayValue);
  const needleLength = radius - 35;

  const needleGroup = g.append('g').attr('class', 'needle-group');

  needleGroup.append('line')
      .attr('class', 'gauge-needle')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', -needleLength)
      .attr('stroke', '#222')
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round')
      .attr('transform', `rotate(${scale(0) * 180 / Math.PI})`)
      .transition()
      .duration(1500)
      .ease(d3.easeElasticOut.amplitude(1).period(0.5))
      .attr('transform', `rotate(${needleAngle * 180 / Math.PI})`);

  needleGroup.append('circle').attr('r', 8).attr('fill', '#222');
  needleGroup.append('circle').attr('r', 3).attr('fill', '#fff');

  const valueColor = actualValue > 5 ? '#FF385C' : actualValue > 2 ? '#FFC107' : '#4CAF50';

  svg.append('text')
      .attr('class', 'gauge-value')
      .attr('x', width / 2)
      .attr('y', gaugeY + 70)
      .attr('text-anchor', 'middle')
      .attr('font-size', '52px')
      .attr('font-weight', 'bold')
      .attr('fill', valueColor)
      .text('0%')
      .transition()
      .duration(1500)
      .tween('text', function() {
          const i = d3.interpolateNumber(0, actualValue);
          return function(t) {
              this.textContent = i(t).toFixed(1) + '%';
          };
      });

  svg.append('text')
      .attr('x', width / 2)
      .attr('y', gaugeY + 110)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('fill', '#333')
      .text(`${city.city} (${city.year})`);

  svg.append('text')
      .attr('x', width / 2)
      .attr('y', gaugeY + 135)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('fill', '#666')
      .text(`${airbnbHomes.toLocaleString()} of ${totalHousing.toLocaleString()} homes`);
}

// ===================================================
// ACT 5: Multi-city timeline (active listings by year)
// Visible if: first_year <= year <= last_year
// ===================================================

const ACT5_YEAR_MIN = 2015;
const ACT5_YEAR_MAX = 2025;

const CITY_CONFIG = {
  amsterdam: {
    name: "Amsterdam",
    file: "data/processed/amsterdam_timeline_points.csv",
    center: [52.3702, 4.8952],
    zoom: 12,
    minYearFallback: 2015
  },
  paris: {
    name: "Paris",
    file: "data/processed/paris_timeline_points.csv",
    center: [48.8566, 2.3522],
    zoom: 12,
    minYearFallback: 2015
  },
  berlin: {
    name: "Berlin",
    file: "data/processed/berlin_timeline_points.csv",
    center: [52.52, 13.405],
    zoom: 12,
    minYearFallback: 2015
  },
  barcelona: {
    name: "Barcelona",
    file: "data/processed/barcelona_timeline_points.csv",
    center: [41.3851, 2.1734],
    zoom: 12,
    minYearFallback: 2015
  }
};

// Map + renderer
let act5Map = null;
let act5Layer = null;
const act5Renderer = L.canvas({ padding: 0.5 });

// City state
let act5CityKey = "amsterdam";
let act5CurrentYear = null;

// Cache per city: data + indices + min/max
const act5Cache = new Map(); // cityKey -> { data, byFirst, byLast, minYear, maxYear, markers, currentYear }

// Play animation
let act5IsPlaying = false;
let act5Timer = null;
const ACT5_PLAY_INTERVAL_MS = 500; 

function initAct5Map() {
  if (act5Map) return;
  const el = document.getElementById("act5-map");
  if (!el) return;

  const cfg = CITY_CONFIG[act5CityKey];

  act5Map = L.map("act5-map").setView(cfg.center, cfg.zoom);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(act5Map);

  act5Layer = L.layerGroup().addTo(act5Map);
}

function indexTimelineData(rows) {
  const byFirst = new Map();
  const byLast = new Map();

  rows.forEach(d => {
    if (!byFirst.has(d.first_year)) byFirst.set(d.first_year, []);
    byFirst.get(d.first_year).push(d);

    if (!byLast.has(d.last_year)) byLast.set(d.last_year, []);
    byLast.get(d.last_year).push(d);
  });

  return { byFirst, byLast };
}

function stopAct5Playback() {
  act5IsPlaying = false;
  if (act5Timer) clearInterval(act5Timer);
  act5Timer = null;

  const btn = document.getElementById("act5-playBtn");
  if (btn) {
    btn.classList.remove("is-playing");
    btn.textContent = "▶";
    btn.setAttribute("aria-label", "Play timeline");
  }
}

function startAct5Playback() {
  const slider = document.getElementById("act5-yearSlider");
  if (!slider) return;

  // If already playing, then toggle to pause
  if (act5IsPlaying) {
    act5IsPlaying = false;
    if (act5Timer) clearInterval(act5Timer);
    act5Timer = null;
    const btn = document.getElementById("act5-playBtn");
    if (btn) {
      btn.classList.remove("is-playing");
      btn.textContent = "▶";
      btn.setAttribute("aria-label", "Play timeline");
    }
    return;
  }

  act5IsPlaying = true;
  const btn = document.getElementById("act5-playBtn");
  if (btn) {
    btn.classList.add("is-playing");
    btn.textContent = "❚❚";
    btn.setAttribute("aria-label", "Pause timeline");
  }

  // Prevent double timers
  if (act5Timer) clearInterval(act5Timer);

  act5Timer = setInterval(async () => {
    if (!act5IsPlaying) {
      if (act5Timer) clearInterval(act5Timer);
      act5Timer = null;
      return;
    }
    const cityState = await loadCity(act5CityKey);

    let y = +slider.value;
    const maxY = +slider.max;

    // loop back to min when reaching end
    if (y >= maxY) {
      y = +slider.min;
      slider.value = y;
      cityState.currentYear = null; // force rebuild for clean loop
      cityState.markers.clear();
      act5Layer && act5Layer.clearLayers();
      setYear(cityState, y);
      return;
    }

    y += 1;
    slider.value = y;
    setYear(cityState, y);
  }, ACT5_PLAY_INTERVAL_MS);
}


function addListingDot(cityState, d) {
  if (cityState.markers.has(d.id)) return;

  const m = L.circleMarker([d.lat, d.lng], {
    radius: 3,
    weight: 1.5,
    color: "#fff", // white outline
    fillColor: "#FF385C",
    fillOpacity: 0.7,
    renderer: act5Renderer,
    className: "airbnb-dot"
  });
  

  m.addTo(act5Layer);
  cityState.markers.set(d.id, m);
}

function removeListingDot(cityState, id) {
  const m = cityState.markers.get(id);
  if (!m) return;
  act5Layer.removeLayer(m);
  cityState.markers.delete(id);
}

function renderYearFull(cityState, year) {
  act5Layer.clearLayers();
  cityState.markers.clear();

  const active = cityState.data.filter(
    d =>
      d.first_year <= year &&
      d.last_year >= year &&
      d.last_year >= ACT5_YEAR_MIN
  );
  active.forEach(d => addListingDot(cityState, d));

  updateOverlayCount(cityState.markers.size);
  cityState.currentYear = year;
}

function renderYearIncremental(cityState, year) {
  // Add starts
  const starts = cityState.byFirst.get(year) || [];
  starts.forEach(d => addListingDot(cityState, d));

  // Remove those that ended last year
  const endedLastYear = cityState.byLast.get(year - 1) || [];
  endedLastYear.forEach(d => removeListingDot(cityState, d.id));

  updateOverlayCount(cityState.markers.size);
  cityState.currentYear = year;
}

function setYear(cityState, year) {
  updateOverlayYear(year);

  if (cityState.currentYear === null) {
    renderYearFull(cityState, year);
    return;
  }

  if (year < cityState.currentYear) {
    renderYearFull(cityState, year);
    return;
  }

  for (let y = cityState.currentYear + 1; y <= year; y++) {
    renderYearIncremental(cityState, y);
  }
}

function updateOverlayYear(year) {
  const label = document.getElementById("act5-yearLabel");
  if (label) label.textContent = year;
}

function updateOverlayCount(count) {
  const countEl = document.getElementById("act5-count");
  if (countEl) countEl.textContent = count;
}

function updateOverlayCityTitle(cityKey) {
  const title = document.getElementById("act5-cityTitle");
  if (title) title.textContent = `${CITY_CONFIG[cityKey].name} activity timeline`;
}

// Loads (or uses cached) city dataset
async function loadCity(cityKey) {
  if (act5Cache.has(cityKey)) return act5Cache.get(cityKey);

  const cfg = CITY_CONFIG[cityKey];

  const rows = await d3.csv(cfg.file, d => ({
    id: d.id,
    lat: +d.latitude,
    lng: +d.longitude,
    room_type: d.room_type,
    first_year: +d.first_year,
    last_year: +d.last_year
  }));

  const data = rows.filter(d =>
    !isNaN(d.lat) && !isNaN(d.lng) &&
    !isNaN(d.first_year) && !isNaN(d.last_year) &&
    d.last_year >= d.first_year
  );

  const minYearData = d3.min(data, d => d.first_year) ?? cfg.minYearFallback;
  const maxYearData = d3.max(data, d => d.last_year) ?? ACT5_YEAR_MAX;
  
  const minYear = Math.max(ACT5_YEAR_MIN, minYearData);
  const maxYear = Math.min(ACT5_YEAR_MAX, maxYearData);  

  const { byFirst, byLast } = indexTimelineData(data);

  const cityState = {
    data,
    byFirst,
    byLast,
    minYear,
    maxYear,
    markers: new Map(),
    currentYear: null
  };

  act5Cache.set(cityKey, cityState);
  return cityState;
}

function setSliderRange(minYear, maxYear, currentYearDesired = null) {
  const slider = document.getElementById("act5-yearSlider");
  if (!slider) return;

  slider.min = minYear;
  slider.max = maxYear;

  let year = currentYearDesired;
  if (year === null || year === undefined) {
    year = Math.min(Math.max(2018, minYear), maxYear);
  } else {
    year = Math.min(Math.max(year, minYear), maxYear);
  }

  slider.value = year;
  updateOverlayYear(year);
  return year;
}

async function switchCity(cityKey) {
  stopAct5Playback();
  act5CityKey = cityKey;

  // Update select to match current city
  const select = document.getElementById("act5-citySelect");
  if (select) {
    select.value = cityKey;
  }

  // Update title
  updateOverlayCityTitle(cityKey);

  // Clear map layer
  act5Layer && act5Layer.clearLayers();

  // Set view
  const cfg = CITY_CONFIG[cityKey];
  act5Map.setView(cfg.center, cfg.zoom);

  // Load data + set slider range
  const cityState = await loadCity(cityKey);

  // keep same year if possible
  const slider = document.getElementById("act5-yearSlider");
  const desiredYear = slider ? +slider.value : null;

  const year = setSliderRange(cityState.minYear, cityState.maxYear, desiredYear);

  // Reset and render
  cityState.currentYear = null;
  cityState.markers.clear();
  setYear(cityState, year);

  // Leaflet resize fix
  setTimeout(() => act5Map && act5Map.invalidateSize(), 150);



}

async function initializeAct5() {
  initAct5Map();

  // UI
  const slider = document.getElementById("act5-yearSlider");
  const select = document.getElementById("act5-citySelect");

  if (!slider || !select) return;

  // Play button
  const playBtn = document.getElementById("act5-playBtn");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      startAct5Playback();
    });
  }

  // Read initial city from select element to ensure sync with HTML
  const initialCity = select.value || act5CityKey;
  act5CityKey = initialCity;

  // initial city
  updateOverlayCityTitle(act5CityKey);
  await switchCity(act5CityKey);

  // City switch
  select.addEventListener("change", async (e) => {
    await switchCity(e.target.value);
  });

  // Year slider change
  let t = null;
  slider.addEventListener("input", (e) => {
    const year = +e.target.value;
    clearTimeout(t);
    t = setTimeout(async () => {
      const cityState = await loadCity(act5CityKey);
      setYear(cityState, year);
    }, 30);
  });
}

// ============================================================================
// ACT 6: THE RESPONSE / SOLUTIONS
// ============================================================================

function initializeAct6() {
    console.log('Act 6 initialized (narrative-focused)');
    
    // Optional: Add subtle animations when policy cards come into view
    setupPolicyCardAnimations();
}

function setupPolicyCardAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });
    
    // Observe policy cards
    document.querySelectorAll('.policy-card').forEach(card => {
        observer.observe(card);
    });
    
    // Observe lesson cards
    document.querySelectorAll('.lesson-card').forEach(card => {
        observer.observe(card);
    });
}

// ============================================================================
// START THE APPLICATION
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
