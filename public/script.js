(function(){
    // Enhanced helper functions
    const $ = sel => document.querySelector(sel);
    const $$ = sel => document.querySelectorAll(sel);
    
    // Backend URL definition
    const backendAPI = (window.location.origin && window.location.origin !== 'null') 
        ? window.location.origin + '/api' 
        : 'http://localhost:8000/api';

    // Create floating particles
    function createParticles() {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles';
        document.body.appendChild(particlesContainer);
        
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 2 + 1;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 10}s`;
            particle.style.animationDuration = `${10 + Math.random() * 10}s`;
            particlesContainer.appendChild(particle);
        }
    }

    // Create cosmic background
    function createCosmicBackground() {
        const cosmicBg = document.createElement('div');
        cosmicBg.className = 'cosmic-bg';
        document.body.appendChild(cosmicBg);
    }

    // Toast notification system
    function showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        $$('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold;">${getToastIcon(type)}</span>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    function getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || 'ℹ';
    }

    // Initialize enhanced UI
    createCosmicBackground();
    createParticles();

    // Controls
    const landing = $('#landing');
    const mapDiv = $('#map');
    const controlsCard = $('.top-controls');
    const sidebar = $('#sidebar');
    const annList = $('#annList');
    const coordHud = $('.footer-hud');
    const modal = $('#modal');
    const modalClose = $('#modalClose');
    const modalCancel = $('#modalCancel');
    const modalSave = $('#modalSave');

    let map, currentLayer, worldviewLayer, moonLayer, marsLayer, currentDataset = 'worldview';
    let placingMarker = false;
    let currentShapeType = 'marker';
    let drawingShape = false;
    let currentShape = null;
    let lastClickLatLng = null;
    let socket = null;
    let annotationsCache = [];
    let markersLayerGroup = null;
    let nasaLayers = [];
    let currentNasaLayer = null;

    // Enhanced date handling
    function formatDate(d){ 
        const y = d.getFullYear();
        const m = ('0'+(d.getMonth()+1)).slice(-2);
        const dd = ('0'+d.getDate()).slice(-2);
        return `${y}-${m}-${dd}`;
    }
    
    // Initialize date input safely
    let dateInput;
    setTimeout(() => {
        dateInput = $('#imageryDate');
        if(dateInput) {
            dateInput.value = formatDate(new Date());
            dateInput.max = formatDate(new Date());
        }
    }, 100);

    // NASA Tile Layer function
    function createNasaTileLayer(layerId, date) {
        const layerConfig = nasaLayers.find(l => l.id === layerId);
        if (!layerConfig) return null;

        const url = layerConfig.wmtsUrl.replace('{time}', date);
        return L.tileLayer(url, {
            attribution: 'NASA GIBS',
            maxZoom: 9,
            detectRetina: true,
            crossOrigin: true
        });
    }

    function moonTile(){
        return L.tileLayer(
            'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
            { 
                attribution: "NASA LRO", 
                maxZoom: 8,
                crossOrigin: true
            }
        );
    }

    function marsTile(){
        return L.tileLayer(
            "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
            { 
                attribution: "NASA Mars Trek", 
                maxZoom: 7, 
                crossOrigin: true
            }
        );
    }

    // Initialize enhanced map
    async function initMap(dataset){
        console.log('Initializing map for dataset:', dataset);
        
        // Show map and controls
        mapDiv.classList.add('show');
        controlsCard.style.display = 'block';
        sidebar.style.display = 'block';

        if(map) {
            console.log('Map already exists, switching dataset');
            setDataset(dataset);
            return;
        }

        // Enhanced map configuration
        map = L.map('map', { 
            center: dataset === 'moon' ? [0, 0] : [20, 0],
            zoom: dataset === 'moon' ? 2 : 3,
            worldCopyJump: true,
            zoomControl: false,
            preferCanvas: true
        });

        // Add zoom control with better positioning
        L.control.zoom({
            position: 'topright'
        }).addTo(map);

        // Add scale bar
        L.control.scale({
            imperial: false,
            position: 'bottomleft'
        }).addTo(map);

        // Initialize layers
        moonLayer = moonTile();
        marsLayer = marsTile();

        // Load NASA layers for Earth
        if (dataset === 'worldview') {
            await loadNasaLayers();
            currentNasaLayer = createNasaTileLayer('VIIRS_SNPP_CorrectedReflectance_TrueColor', dateInput.value);
            if (currentNasaLayer) {
                currentNasaLayer.addTo(map);
            }
        } else {
            currentLayer = getLayerForDataset(dataset);
            if(currentLayer) {
                currentLayer.addTo(map);
            }
        }

        // Enhanced markers layer
        markersLayerGroup = L.layerGroup().addTo(map);

        // Enhanced coordinate display
        map.on('mousemove', function(e){
            if(coordHud) {
                coordHud.textContent = `Lat: ${e.latlng.lat.toFixed(5)} , Lng: ${e.latlng.lng.toFixed(5)}`;
            }
        });

        // Enhanced right-click context menu
        map.on('contextmenu', function(e){
            e.originalEvent.preventDefault();
            lastClickLatLng = e.latlng;
            openModal();
        });

        // Map load event
        map.whenReady(() => {
            showToast(`${getDatasetName(currentDataset)} map loaded successfully!`, 'success');
        });

        // Load annotations
        loadAnnotations(dataset);

        // Enhanced Socket.IO connection
        initializeSocketIO();

        // Enhanced keyboard shortcuts
        initializeKeyboardShortcuts();
        
        console.log('Map initialization complete');
    }

    async function loadNasaLayers() {
        try {
            const response = await fetch(`${backendAPI}/nasa-layers`);
            nasaLayers = await response.json();
            renderNasaLayers();
        } catch (error) {
            console.error('Failed to load NASA layers:', error);
            showToast('Failed to load NASA layers', 'error');
        }
    }

    function renderNasaLayers() {
        const layerControls = $('.layer-controls');
        if (!layerControls) return;

        const layerList = layerControls.querySelector('.layer-list');
        layerList.innerHTML = '';

        nasaLayers.forEach(layer => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            if (layer.id === 'VIIRS_SNPP_CorrectedReflectance_TrueColor') {
                layerItem.classList.add('active');
            }
            layerItem.innerHTML = `
                <div class="layer-name">${layer.name}</div>
                <div class="layer-desc">${layer.description}</div>
            `;
            layerItem.addEventListener('click', () => switchNasaLayer(layer.id));
            layerList.appendChild(layerItem);
        });
    }

    function switchNasaLayer(layerId) {
        if (currentDataset !== 'worldview' || !map) return;

        // Remove current NASA layer
        if (currentNasaLayer) {
            map.removeLayer(currentNasaLayer);
        }

        // Add new NASA layer
        currentNasaLayer = createNasaTileLayer(layerId, dateInput.value);
        if (currentNasaLayer) {
            currentNasaLayer.addTo(map);
            showToast(`Switched to ${nasaLayers.find(l => l.id === layerId).name}`, 'success');
        }

        // Update active layer in UI
        $$('.layer-item').forEach(item => item.classList.remove('active'));
        $$('.layer-item').forEach(item => {
            if (item.querySelector('.layer-name').textContent === nasaLayers.find(l => l.id === layerId).name) {
                item.classList.add('active');
            }
        });
    }

    function getLayerForDataset(dataset) {
        switch(dataset) {
            case 'moon': return moonLayer;
            case 'mars': return marsLayer;
            default: return null;
        }
    }

    function getDatasetName(dataset) {
        switch(dataset) {
            case 'worldview': return 'Earth';
            case 'moon': return 'Moon';
            case 'mars': return 'Mars';
            default: return 'Earth';
        }
    }

    // Clean and set dataset (switch layer)
    function setDataset(dataset){
    console.log('Switching to dataset:', dataset);
        const previousDataset = currentDataset;
        currentDataset = dataset;

        if(!map) {
            console.error('Map not initialized');
            return;
        }

        // Remove current tile layers
        map.eachLayer(layer => {
            if(layer && layer._url && layer !== markersLayerGroup) {
                map.removeLayer(layer);
            }
        });

        // Add base layer
        if (dataset === 'worldview') {
            if (currentNasaLayer) {
                currentNasaLayer.addTo(map);
            }
        } else {
            currentLayer = getLayerForDataset(dataset);
            if(currentLayer) {
                currentLayer.addTo(map);
            }
        }

        // Re-add markers layer
        markersLayerGroup.addTo(map);

        // Update UI visibility
        const dateControl = $('#dateControl');
        const layerControls = $('#layerControls');
        if(dateControl) {
            dateControl.style.display = dataset === 'worldview' ? 'block' : 'none';
        }
        if(layerControls) {
            layerControls.style.display = dataset === 'worldview' ? 'block' : 'none';
        }

        // Reload annotations for new dataset
        loadAnnotations(dataset);

        showToast(`Switched to ${getDatasetName(dataset)} view`, 'info');
    }
    // Initialize Socket.IO with enhanced features
    function initializeSocketIO() {
        try {
            socket = io();
            socket.on('connect', () => {
                console.log('Socket connected:', socket.id);
            });
            
            socket.on('disconnect', () => {
                console.log('Socket disconnected');
            });
            
            socket.on('new_annotation', function(annotation){
                // Check if we already have this annotation (avoid duplicates)
                const existingIndex = annotationsCache.findIndex(a => a.id === annotation.id);
                if (existingIndex === -1) {
                    annotationsCache.push(annotation);
                    if(annotation.dataset === currentDataset) {
                        addAnnotationMarker(annotation, false);
                        renderAnnList(); // Re-render entire list to avoid duplicates
                    }
                }
            });

            socket.on('annotation_deleted', function(annotationId){
                // Remove from cache
                annotationsCache = annotationsCache.filter(a => a.id !== annotationId);
                // Clear and re-render markers
                markersLayerGroup.clearLayers();
                annotationsCache.forEach(a => addAnnotationMarker(a));
                // Re-render list
                renderAnnList();
            });
            
        } catch(e) {
            console.warn('Socket.IO not available:', e);
        }
    }

    // Enhanced keyboard shortcuts
    function initializeKeyboardShortcuts() {
        document.addEventListener('keydown', e => {
            // Toggle sidebar with H
            if(e.key.toLowerCase() === 'h' && sidebar) {
                sidebar.classList.toggle('hidden');
            }
            
            // Escape key cancels marker placement
            if(e.key === 'Escape' && (placingMarker || drawingShape)) {
                cancelDrawing();
            }

            // Home key to return to landing
            if(e.key === 'Home' || (e.altKey && e.key === 'h')) {
                returnToHome();
            }
        });
    }

    // Cancel drawing mode
    function cancelDrawing() {
        placingMarker = false;
        drawingShape = false;
        if(map) map.getContainer().style.cursor = '';
        if(currentShape) {
            map.removeLayer(currentShape);
            currentShape = null;
        }
        showToast('Drawing cancelled', 'info');
    }

    // Return to home screen
    function returnToHome() {
        if(map) {
            map.remove();
            map = null;
        }
        if(landing) {
            landing.style.display = 'flex';
            landing.style.opacity = '1';
            landing.style.transform = 'translateY(0) scale(1)';
        }
        if(controlsCard) controlsCard.style.display = 'none';
        if(sidebar) sidebar.style.display = 'none';
        if(mapDiv) mapDiv.classList.remove('show');
        
        showToast('Returned to home screen', 'info');
    }

    // UI interactions: landing buttons
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for DOM to be fully loaded before attaching event listeners
        setTimeout(() => {
            const btnEarth = $('#btn-earth');
            const btnMoon = $('#btn-moon');
            const btnMars = $('#btn-mars');
            
            if(btnEarth) {
                btnEarth.addEventListener('click', () => {
                    animateLandingExit();
                    setTimeout(() => {
                        initMap('worldview');
                    }, 400);
                });
            }
            
            if(btnMoon) {
                btnMoon.addEventListener('click', () => {
                    animateLandingExit();
                    setTimeout(() => {
                        initMap('moon');
                    }, 400);
                });
            }
            
            if(btnMars) {
                btnMars.addEventListener('click', () => {
                    animateLandingExit();
                    setTimeout(() => {
                        initMap('mars');
                    }, 400);
                });
            }
            
            // Initialize other event listeners
            initializeEventListeners();
        }, 100);
    });

    function animateLandingExit() {
        if(landing) {
            landing.style.opacity = '0';
            landing.style.transform = 'translateY(-20px) scale(0.95)';
            setTimeout(() => {
                landing.style.display = 'none';
            }, 500);
        }
    }

    function initializeEventListeners() {
        // Dataset selector
        const datasetSelect = $('#dataset');
        if(datasetSelect) {
            datasetSelect.addEventListener('change', (e) => setDataset(e.target.value));
        }

        // Date selector for Earth view
        if(dateInput) {
            dateInput.addEventListener('change', () => {
                if(currentDataset === 'worldview') {
                    switchNasaLayer('VIIRS_SNPP_CorrectedReflectance_TrueColor');
                }
            });
        }

        // Add marker button
        const addMarkerBtn = $('#btn-add-marker');
        if(addMarkerBtn) {
            addMarkerBtn.addEventListener('click', () => {
                if(!map) {
                    showToast('Please wait for map to load', 'warning');
                    return;
                }
                startMarkerPlacement();
            });
        }

        // Shape type selector
        const shapeSelect = $('#shapeType');
        if(shapeSelect) {
            shapeSelect.addEventListener('change', (e) => {
                currentShapeType = e.target.value;
                showToast(`Selected: ${e.target.selectedOptions[0].text}`, 'info');
            });
        }

        // Home button
        const homeBtn = $('#btn-home');
        if(homeBtn) {
            homeBtn.addEventListener('click', returnToHome);
        }

        // Modal handlers
        if(modalClose) modalClose.addEventListener('click', closeModal);
        if(modalCancel) modalCancel.addEventListener('click', closeModal);
        if(modalSave) modalSave.addEventListener('click', saveAnnotation);

        // Search functionality
        const searchBtn = $('#btn-search');
        const searchBox = $('#searchBox');
        if(searchBtn && searchBox) {
            searchBtn.addEventListener('click', performSearch);
            searchBox.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') performSearch();
            });
        }

        // Export/Import buttons
        const exportBtn = $('#btn-export');
        const importBtn = $('#btn-import');
        if(exportBtn) exportBtn.addEventListener('click', exportAnnotations);
        if(importBtn) importBtn.addEventListener('click', importAnnotations);

        // Sidebar toggle
        const toggleSidebar = $('#btn-toggle-sidebar');
        if(toggleSidebar) {
            toggleSidebar.addEventListener('click', () => {
                if(sidebar) sidebar.classList.toggle('hidden');
            });
        }
    }

    // Start marker placement based on shape type
    function startMarkerPlacement() {
        cancelDrawing(); // Reset any previous drawing

        switch(currentShapeType) {
            case 'marker':
                startSimpleMarker();
                break;
            case 'circle':
                startCircleDrawing();
                break;
            case 'rectangle':
                startRectangleDrawing();
                break;
            // Polygon removed as requested
        }
    }

    function startSimpleMarker() {
        placingMarker = true;
        map.getContainer().style.cursor = 'crosshair';
        showToast('Click on the map to place a marker', 'info');
        
        const onceHandler = (e) => {
            map.off('click', onceHandler);
            placingMarker = false;
            map.getContainer().style.cursor = '';
            lastClickLatLng = e.latlng;
            openModal();
        };
        map.on('click', onceHandler);
    }

    function startCircleDrawing() {
        drawingShape = true;
        map.getContainer().style.cursor = 'crosshair';
        showToast('Click on the map to place circle center, then move to set radius', 'info');
        
        let center = null;
        let circle = null;

        const clickHandler = (e) => {
            if (!center) {
                center = e.latlng;
                circle = L.circle(center, {
                    radius: 0,
                    color: '#ff0000',
                    fillColor: '#ff0000',
                    fillOpacity: 0.2,
                    weight: 2
                }).addTo(map);
                currentShape = circle;
            } else {
                const radius = map.distance(center, e.latlng);
                circle.setRadius(radius);
                
                map.off('click', clickHandler);
                map.off('mousemove', moveHandler);
                drawingShape = false;
                map.getContainer().style.cursor = '';
                
                lastClickLatLng = center;
                openModal();
            }
        };

        const moveHandler = (e) => {
            if (center && circle) {
                const radius = map.distance(center, e.latlng);
                circle.setRadius(radius);
            }
        };

        map.on('click', clickHandler);
        map.on('mousemove', moveHandler);
    }

    function startRectangleDrawing() {
        drawingShape = true;
        map.getContainer().style.cursor = 'crosshair';
        showToast('Click and drag to draw a rectangle', 'info');
        
        let startPoint = null;
        let rectangle = null;

        const clickHandler = (e) => {
            if (!startPoint) {
                startPoint = e.latlng;
                rectangle = L.rectangle([startPoint, startPoint], {
                    color: '#00ff00',
                    fillColor: '#00ff00',
                    fillOpacity: 0.2,
                    weight: 2
                }).addTo(map);
                currentShape = rectangle;
            } else {
                map.off('click', clickHandler);
                map.off('mousemove', moveHandler);
                drawingShape = false;
                map.getContainer().style.cursor = '';
                
                const bounds = rectangle.getBounds();
                lastClickLatLng = bounds.getCenter();
                openModal();
            }
        };

        const moveHandler = (e) => {
            if (startPoint && rectangle) {
                const bounds = L.latLngBounds([startPoint, e.latlng]);
                rectangle.setBounds(bounds);
            }
        };

        map.on('click', clickHandler);
        map.on('mousemove', moveHandler);
    }

    // Enhanced modal handling
    function openModal(){
        if(modal) {
            modal.classList.add('show');
            const username = $('#username');
            if(username) username.focus();
        }
    }

    function closeModal(){ 
        if(modal) {
            modal.classList.remove('show'); 
            lastClickLatLng = null;
            currentShapeType = 'marker';
            // Clean up any temporary shapes
            if (currentShape) {
                map.removeLayer(currentShape);
                currentShape = null;
            }
        }
    }

    // Enhanced modal save with validation - FIXED DUPLICATE ISSUE
    async function saveAnnotation() {
        const userInput = $('#username');
        const noteInput = $('#note');
        
        if(!userInput || !noteInput) return;
        
        const user = userInput.value.trim() || 'Anonymous';
        const note = noteInput.value.trim() || '';
        
        if(!lastClickLatLng){ 
            showToast('No location selected. Please click on the map first.', 'error');
            return;
        }

        const shapeData = getShapeData();
        
        const payload = {
            user,
            note,
            lat: lastClickLatLng.lat,
            lng: lastClickLatLng.lng,
            shape_type: currentShapeType,
            shape_data: shapeData,
            dataset: currentDataset
        };

        console.log('Saving annotation:', payload);

        // Clean up temporary shape before saving
        if (currentShape) {
            map.removeLayer(currentShape);
            currentShape = null;
        }

        closeModal();

        // POST to backend - NO OPTIMISTIC UI TO AVOID DUPLICATES
        try {
            const res = await fetch(`${backendAPI}/annotations`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            
            if(res.ok){
                const saved = await res.json();
                console.log('Saved successfully:', saved);
                showToast('Annotation saved successfully!', 'success');
                // The socket event will handle adding to UI
            } else {
                const errorText = await res.text();
                console.error('Server error:', errorText);
                throw new Error(errorText);
            }
        } catch(err) {
            console.error('Error saving annotation:', err);
            showToast('Failed to save annotation. Please try again.', 'error');
        }
    }

    function getShapeData() {
        // Return shape-specific data
        switch(currentShapeType) {
            case 'circle':
                if (currentShape && currentShape.getRadius) {
                    return {
                        radius: currentShape.getRadius(),
                        center: [lastClickLatLng.lat, lastClickLatLng.lng]
                    };
                }
                break;
            case 'rectangle':
                if (currentShape && currentShape.getBounds) {
                    return {
                        bounds: currentShape.getBounds().toBBoxString()
                    };
                }
                break;
            default: // marker
                return {
                    lat: lastClickLatLng.lat,
                    lng: lastClickLatLng.lng
                };
        }
        return {};
    }

    // Enhanced annotation marker with different shapes - FIXED DELETION
    function addAnnotationMarker(annotation, panTo = false){
        let layer;
        const shapeData = annotation.shape_data || {};

        switch(annotation.shape_type) {
            case 'circle':
                const center = shapeData.center || [annotation.lat, annotation.lng];
                layer = L.circle(center, {
                    radius: shapeData.radius || 100000,
                    color: '#ff0000',
                    fillColor: '#ff0000',
                    fillOpacity: 0.2,
                    weight: 2
                });
                break;
            case 'rectangle':
                if(shapeData.bounds) {
                    const [west, south, east, north] = shapeData.bounds.split(',').map(Number);
                    layer = L.rectangle([[south, west], [north, east]], {
                        color: '#00ff00',
                        fillColor: '#00ff00',
                        fillOpacity: 0.2,
                        weight: 2
                    });
                } else {
                    // Fallback to marker if bounds are invalid
                    layer = L.marker([annotation.lat, annotation.lng]);
                }
                break;
            default: // marker
                layer = L.marker([annotation.lat, annotation.lng]);
                break;
        }

        if(layer) {
            layer.addTo(markersLayerGroup);
            
            // Store annotation ID on the layer for deletion
            layer._annId = annotation.id;
            
            layer.bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0;">${escapeHtml(annotation.user)}</h4>
                    <p style="margin: 0 0 8px 0;">${escapeHtml(annotation.note)}</p>
                    <small style="color: #666;">${new Date(annotation.created_at).toLocaleString()}</small>
                    <div style="margin-top: 8px;">
                        <button onclick="window.deleteAnnotation(${annotation.id})" style="
                            background: #ef4444;
                            border: none;
                            color: white;
                            padding: 4px 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">Delete</button>
                    </div>
                </div>
            `);

            if(panTo && map) {
                map.setView([annotation.lat, annotation.lng], Math.max(map.getZoom(), 8));
                setTimeout(() => layer.openPopup(), 300);
            }
        }

        return layer;
    }

    // Delete annotation function - COMPLETELY FIXED
    window.deleteAnnotation = async function(id) {
        if(!confirm('Are you sure you want to delete this annotation?')) return;
        
        try {
            const res = await fetch(`${backendAPI}/annotations/${id}`, {
                method: 'DELETE'
            });
            
            if(res.ok) {
                // The socket event will handle the actual removal from UI and map
                showToast('Annotation deleted', 'success');
            } else {
                throw new Error('Delete failed');
            }
        } catch(err) {
            console.error('Error deleting annotation:', err);
            showToast('Failed to delete annotation', 'error');
        }
    };

    // Load annotations from backend
    async function loadAnnotations(dataset){
        if(markersLayerGroup) markersLayerGroup.clearLayers();
        if(annList) annList.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">Loading annotations...</div>';
        
        try {
            const res = await fetch(`${backendAPI}/annotations?dataset=${encodeURIComponent(dataset)}`);
            if(!res.ok) throw new Error('Failed to fetch annotations');
            
            const data = await res.json();
            // Clear cache and reload
            annotationsCache = data.filter(a => a.dataset === dataset);
            
            if(annList) {
                if(annotationsCache.length === 0) {
                    annList.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">No annotations yet. Be the first to add one!</div>';
                } else {
                    renderAnnList();
                    annotationsCache.forEach(a => addAnnotationMarker(a));
                }
            }
        } catch(e) {
            console.warn('Could not load annotations:', e);
            if(annList) {
                annList.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">Unable to load annotations</div>';
            }
        }
    }

    // Enhanced sidebar list rendering - FIXED DUPLICATES
    function renderAnnList(){
        if(!annList) return;
        
        annList.innerHTML = '';
        const sorted = [...annotationsCache]
            .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
            .filter(x => x.dataset === currentDataset);
            
        if(sorted.length === 0) {
            annList.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">No annotations yet</div>';
            return;
        }
        
        sorted.forEach(annotation => {
            const item = document.createElement('div');
            item.className = 'ann-item';
            item.innerHTML = `
                <div>
                    <b>${escapeHtml(annotation.user)}</b>
                    <div style="font-size: 13px; color: #94a3b8; margin: 4px 0;">${escapeHtml(annotation.note)}</div>
                    <small style="color: #94a3b8;">${new Date(annotation.created_at).toLocaleString()}</small>
                    <div class="ann-actions">
                        <button onclick="window.deleteAnnotation(${annotation.id})" class="btn-small btn-danger">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            
            item.style.cursor = 'pointer';
            item.addEventListener('click', (e) => {
                // Don't trigger if delete button was clicked
                if (!e.target.closest('button')) {
                    if(map) {
                        map.setView([annotation.lat, annotation.lng], Math.max(map.getZoom(), 8));
                        // Find and open the corresponding marker popup
                        markersLayerGroup.eachLayer(layer => {
                            if(layer._annId === annotation.id) {
                                layer.openPopup();
                            }
                        });
                    }
                }
            });
            
            annList.appendChild(item);
        });
    }

    // Enhanced export functionality
    async function exportAnnotations() {
        try {
            const res = await fetch(`${backendAPI}/annotations/export?dataset=${encodeURIComponent(currentDataset)}`);
            if(!res.ok) throw new Error('Export failed');
            
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nasa_annotations_${currentDataset}_${formatDate(new Date())}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            
            showToast('Annotations exported successfully!', 'success');
        } catch(e) {
            console.error('Export failed', e);
            showToast('Export failed. Please try again.', 'error');
        }
    }

    // Enhanced import functionality
    async function importAnnotations() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (ev) => {
            const file = ev.target.files[0];
            if(!file) return;
            
            try {
                const text = await file.text();
                const annotations = JSON.parse(text);
                
                if(!Array.isArray(annotations)) {
                    throw new Error('Expected an array of annotations');
                }
                
                let importedCount = 0;
                for(const annotation of annotations.slice(0, 10)) { // Limit imports
                    try {
                        const payload = {
                            user: annotation.user || 'Imported User',
                            note: annotation.note || '',
                            lat: annotation.lat,
                            lng: annotation.lng,
                            shape_type: annotation.shape_type || 'marker',
                            shape_data: annotation.shape_data || {},
                            dataset: currentDataset
                        };
                        
                        await fetch(`${backendAPI}/annotations`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(payload)
                        });
                        importedCount++;
                    } catch(e) {
                        console.warn('Failed to import annotation:', e);
                    }
                }
                
                showToast(`Successfully imported ${importedCount} annotations`, 'success');
                // Socket events will handle updating the UI
                
            } catch(e) {
                console.error('Import failed:', e);
                showToast('Invalid file format. Please select a valid JSON file.', 'error');
            }
        };
        input.click();
    }

    // Enhanced search functionality
    async function performSearch() {
        const searchBox = $('#searchBox');
        if(!searchBox) return;
        
        const query = searchBox.value.trim();
        if(!query) {
            showToast('Please enter a search term', 'warning');
            return;
        }

        // Coordinate search (lat,lng)
        if(/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(query)) {
            const [lat, lng] = query.split(',').map(x => parseFloat(x.trim()));
            if(Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && map) {
                map.setView([lat, lng], Math.max(map.getZoom(), 8));
                showToast(`Navigated to coordinates: ${lat}, ${lng}`, 'success');
                return;
            } else {
                showToast('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.', 'error');
                return;
            }
        }

        // Place name search using Nominatim
        showToast('Searching...', 'info');
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
                { headers: {'Accept': 'application/json'} }
            );
            const data = await res.json();
            if(data && data.length > 0 && map) {
                const place = data[0];
                map.setView([parseFloat(place.lat), parseFloat(place.lon)], 8);
                showToast(`Found: ${place.display_name}`, 'success');
            } else {
                showToast('No results found for your search', 'warning');
            }
        } catch(e) {
            console.error('Geocode error', e);
            showToast('Search failed. Please check your connection.', 'error');
        }
    }

    // Utility function
    function escapeHtml(text) {
        if(!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize on load
    window.addEventListener('load', () => {
        console.log('🚀 NASA SpaceApp Explorer initialized');
        
        // Focus search box when available
        setTimeout(() => {
            const searchBox = $('#searchBox');
            if(searchBox) searchBox.focus();
        }, 1000);
    });

    function renderNasaLayers() {
        const layerControls = $('#layerControls');
            if (!layerControls) return;

        const layerList = layerControls.querySelector('.layer-list');
        layerList.innerHTML = '';

        nasaLayers.forEach(layer => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            if (layer.id === 'VIIRS_SNPP_CorrectedReflectance_TrueColor') {
                layerItem.classList.add('active');
            }
            layerItem.innerHTML = `
                <div class="layer-name">${layer.name}</div>
                <div class="layer-desc">${layer.description}</div>
            `;
            layerItem.addEventListener('click', () => switchNasaLayer(layer.id));
            layerList.appendChild(layerItem);
    });

    // Show layer controls
    layerControls.style.display = 'block';
}

})();