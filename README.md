# Airbnb's Impact on European Cities

An interactive data visualization exploring how Airbnb affects housing markets, gentrification, and housing pressure across 55+ European cities.

This project was created as a semester-long data visualization assignment under the Faculty of Information and Computer Science.

![Project Banner](https://img.shields.io/badge/Status-Live-success) ![Data Viz](https://img.shields.io/badge/Type-Data%20Visualization-blue) ![Interactive](https://img.shields.io/badge/Interactive-Yes-brightgreen)

## Getting Started

### Deployment

Our site is deployed and available at: \
https://kajagr.github.io/airbnb-visualisation-project/

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/kajagr/airbnb-visualisation-project.git
cd airbnb-visualisation-project
```
2. **Get listings**

Download listings folder from this google drive link: \
https://drive.google.com/drive/u/0/folders/1xdP5FVGIzXVTc0AxVMtcdeZPAVRt3fmB, \
and replace it with current empty listings folder.


2. **Serve locally**
```bash
python -m http.server 8000
```

3. **Open in browser**
```
http://localhost:8000
```


## Overview

This scrollytelling visualization tells the story of Airbnb's transformation from a room-sharing platform to a force reshaping urban neighborhoods across Europe. Through seven data-driven acts, we explore:

- **The Scale** - 800,000+ listings across Europe, concentrated in major cities
- **The Pressure** - Why property owners choose tourists over residents (2-3× more income)
- **The Concentration** - Geographic patterns of tourist saturation in city centers
- **The Impact** - Population density analysis revealing 40+ Airbnbs per 1,000 residents in hotspots
- **Housing Crisis** - Direct measurement of housing stock converted to short-term rentals
- **Timeline** - Temporal evolution of Airbnb activity from 2015-2025
- **The Response** - How cities like Amsterdam, Barcelona, Berlin, and Paris are fighting back

## Features

### Interactive Visualizations
- **Dynamic Maps** - Leaflet maps with heatmaps and dot visualizations showing listing concentration
- **Animated Charts** - D3.js bar charts with grow-in animations and smooth transitions
- **Scroll-Triggered Storytelling** - GSAP-powered animations that respond to user scroll
- **Timeline Playback** - Interactive timeline showing how listings evolved over 10 years

### Data Analysis
- **800,000+ Airbnb listings** analyzed across 55+ European cities
- **Affordability ratios** comparing short-term rental income vs. long-term rent
- **Population density metrics** showing Airbnbs per 1,000 residents
- **Housing pressure gauges** measuring percentage of housing stock converted to Airbnb
- **Temporal data** tracking listing activity from 2015-2025

### Design
- **6-Layer Parallax Hero** - Open source SVG cityscape with depth-based scrolling
- **Smooth Animations** - GSAP + CSS transitions for polished interactions
- **Airbnb Brand Colors** - Consistent bright red theme throughout

## Technology Stack

### Core Libraries
- **[Leaflet.js](https://leafletjs.com/)** - Interactive maps
- **[Leaflet.heat](https://github.com/Leaflet/Leaflet.heat)** - Heatmap visualizations
- **[D3.js v7](https://d3js.org/)** - Data-driven charts and visualizations
- **[GSAP](https://greensock.com/gsap/)** - Animation engine with ScrollTrigger
- **Vanilla JavaScript** - No frameworks, pure JS for performance

### Data Processing
- **Python** - Data preprocessing and cleaning
- **Pandas** - Data manipulation and analysis
- **D3.csv** - Client-side CSV parsing

## Project Structure

```
airbnb-visualisation-project/
│
├── index.html                  # Main HTML file
├── style.css                   # All styling
├── app.js                      # Main application logic
├── gsap_animations.js          # GSAP animation definitions
│
├── data/
│   ├── 1.svg - 6.svg          # Parallax hero layers
│   │
│   ├── processed/
│   │   ├── heatmaps/                         # Compressed listings of cities
│   │   ├── cities_statistical_data.json      # City listing counts & prices
│   │   ├── cities_affordability_2023.json    # Rent vs. Airbnb income ratios
│   │   ├── city_population_density.json      # Airbnbs per 1,000 residents
│   │   ├── housing_pressure.json             # Housing stock displacement
│   │   ├── amsterdam_timeline_points.csv     # Timeline data (2015-2025)
│   │   ├── barcelona_timeline_points.csv
│   │   ├── berlin_timeline_points.csv
│   │   └── paris_timeline_points.csv
│   │
│   └── raw/
│       ├── listings/                 # Raw Airbnb listing data
│       ├── rentals/                  # Eurostat rental price data
│       ├── population/               # Eurostat population data
│       └── living_conditions/        # Housing stock data
│
└── scripts/
    ├── prepare_country_data.py         # Process listing data
    ├── get_rental_prices.py            # Match cities to rent data
    ├── prepare_population_density.py   # Calculate density metrics
    ├── prepare_housing_pressure.py     # Calculate housing displacement
    ├── make_smaller_listings.py        # Compress important listings
    └── make_city_timeline_data.py      # Generate timeline datasets
```


## Data Sources

### Primary Data
- **[Inside Airbnb](http://insideairbnb.com/)** - Airbnb listing data
  - Listing details, prices, locations, reviews
  - Coverage: 55+ European cities
  - Latest data: December 2024

### Supporting Data
- **[Eurostat](https://ec.europa.eu/eurostat)** - Official EU statistics
  - Rental prices by city (2023)
  - Population by urban area
  - Total housing stock by city
  
- **Wikipedia** - Population data for regions where Eurostat unavailable

## Contact

**Project Team:** Sinja Kočica, Kaja Gros, Nina Trivić \
**University:** Faculty of Computer Science and Information, University of Ljubljana  \
**Course:** Data Visualization And Interaction 

## 🎬 Demo

🔗 **[Live Demo](https://kajagr.github.io/airbnb-visualisation-project/)**

