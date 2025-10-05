const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 8000;
const DB_FILE = path.join(__dirname, 'annotations.db');

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('❌ Failed to open DB:', err);
        process.exit(1);
    } else {
        console.log('✅ Database opened successfully:', DB_FILE);
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        db.run(`DROP TABLE IF EXISTS annotations`, (err) => {
            if (err) console.error('Error dropping table:', err);
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS annotations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user TEXT,
                note TEXT,
                lat REAL,
                lng REAL,
                shape_type TEXT DEFAULT 'marker',
                shape_data TEXT,
                dataset TEXT,
                created_at TEXT
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error creating table:', err);
            } else {
                console.log('✅ Database table initialized successfully');
            }
        });
    });
}

app.get('/api/annotations', (req, res) => {
    const dataset = req.query.dataset;
    const sql = dataset ?
        'SELECT * FROM annotations WHERE dataset = ? ORDER BY created_at DESC' :
        'SELECT * FROM annotations ORDER BY created_at DESC';
    const params = dataset ? [dataset] : [];

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const parsedRows = rows.map(row => ({
            ...row,
            shape_data: row.shape_data ? JSON.parse(row.shape_data) : {}
        }));
        
        res.json(parsedRows);
    });
});

app.post('/api/annotations', (req, res) => {
    const { user, note, lat, lng, shape_type = 'marker', shape_data, dataset } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'lat and lng must be numbers' });
    }

    const created_at = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO annotations (user, note, lat, lng, shape_type, shape_data, dataset, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
        user || 'Anonymous',
        note || '',
        lat,
        lng,
        shape_type,
        JSON.stringify(shape_data || {}),
        dataset || 'worldview',
        created_at
    ], function (err) {
        if (err) {
            console.error('❌ Database insert error:', err);
            return res.status(500).json({ error: err.message });
        }

        const inserted = {
            id: this.lastID,
            user: user || 'Anonymous',
            note: note || '',
            lat,
            lng,
            shape_type,
            shape_data: shape_data || {},
            dataset: dataset || 'worldview',
            created_at
        };

        // Broadcast via Socket.IO
        io.emit('new_annotation', inserted);
        console.log('✅ Annotation saved:', inserted.id);
        res.json(inserted);
    });

    stmt.finalize();
});

app.delete('/api/annotations/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid annotation ID' });
    }

    db.run('DELETE FROM annotations WHERE id = ?', [id], function (err) {
        if (err) {
            console.error('❌ Database delete error:', err);
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Annotation not found' });
        }

        io.emit('annotation_deleted', id);
        console.log('✅ Annotation deleted:', id);
        res.json({ success: true, message: 'Annotation deleted successfully' });
    });
});

app.get('/api/nasa-layers', (req, res) => {
    const layers = [
        {
            id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
            name: 'VIIRS SNPP True Color',
            description: 'Natural color imagery from VIIRS Suomi NPP satellite',
            wmtsUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg'
        },
        {
            id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
            name: 'MODIS Terra True Color',
            description: 'Natural color imagery from MODIS Terra satellite',
            wmtsUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg'
        },
        {
            id: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
            name: 'VIIRS NOAA-20 True Color',
            description: 'High-resolution natural color imagery from VIIRS',
            wmtsUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg'
        },
        {
            id: 'MODIS_Terra_Land_Surface_Temp_Day',
            name: 'Land Surface Temperature (Day)',
            description: 'Daytime land surface temperature measurements',
            wmtsUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/{time}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png'
        },
        {
            id: 'BlueMarble_NextGeneration',
            name: 'Blue Marble',
            description: 'Composite global imagery mosaic',
            wmtsUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/{time}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg'
        }
    ];
    res.json(layers);
});

app.get('/api/celestial-info/:body', (req, res) => {
    const body = req.params.body;
    const info = {
        earth: {
            name: "Earth",
            description: "Our home planet with diverse ecosystems and abundant water",
            diameter: "12,742 km",
            gravity: "9.8 m/s²",
            distance: "N/A",
            features: ["Oceans", "Continents", "Atmosphere", "Life"]
        },
        moon: {
            name: "Moon",
            description: "Earth's only natural satellite with cratered surface",
            diameter: "3,474 km",
            gravity: "1.6 m/s²",
            distance: "384,400 km",
            features: ["Craters", "Maria", "Highlands", "No atmosphere"]
        },
        mars: {
            name: "Mars",
            description: "The Red Planet with polar ice caps and ancient riverbeds",
            diameter: "6,779 km",
            gravity: "3.7 m/s²",
            distance: "225M km avg",
            features: ["Olympus Mons", "Valles Marineris", "Polar Ice Caps", "Dust Storms"]
        }
    };

    res.json(info[body] || { error: 'Celestial body not found' });
});

// Export annotations
app.get('/api/annotations/export', (req, res) => {
    const dataset = req.query.dataset;
    const sql = dataset ?
        'SELECT * FROM annotations WHERE dataset = ? ORDER BY created_at DESC' :
        'SELECT * FROM annotations ORDER BY created_at DESC';
    const params = dataset ? [dataset] : [];

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Export error:', err);
            return res.status(500).json({ error: err.message });
        }

        const filename = `annotations_${dataset || 'all'}_${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(rows, null, 2));
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

app.get('/moon', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'moon.html'));
});

app.get('/mars', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mars.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', socket.id, 'Reason:', reason);
    });

    socket.on('error', (error) => {
        console.error('🔌 Socket error:', socket.id, error);
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('🚨 Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database closed');
        }
        process.exit(0);
    });
});

// Start server
http.listen(PORT, () => {
    console.log(`\n🚀 NASA SpaceApp Explorer Server Started`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`💾 Database: ${DB_FILE}`);
    console.log(`🔌 Ready for connections...\n`);

});
