const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// OpenRouteService API Key
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZmOTllZmEyNjE3NDRjMjY4NDgxYTY1NjVlYmZjOWIyIiwiaCI6Im11cm11cjY0In0=';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/route', async (req, res) => {
    const { points, consumption = 8, fuelPrice = 6, avoidHighways = false } = req.body;
    if (!points || points.length < 2) return res.status(400).json({ error: 'Minimum 2 punkty' });

    try {
        const coords = points.map(p => [p.lng, p.lat]);
        const body = {
            coordinates: coords,
            instructions: true,
            options: { avoid_features: avoidHighways ? ["highways"] : [] }
        };

        const response = await axios.post(
            'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
            body,
            { headers: { Authorization: ORS_API_KEY } }
        );

        const geojson = response.data;

        // Oblicz segmenty (dystans i czas między punktami A→B, B→C…)
        let segments = [];
        geojson.features[0].properties.segments.forEach(seg => {
            segments.push({
                distanceKm: (seg.distance / 1000).toFixed(2),
                durationMin: Math.round(seg.duration / 60)
            });
        });

        // Całkowity dystans i czas
        const totalDistance = segments.reduce((a,b)=>a+parseFloat(b.distanceKm),0).toFixed(2);
        const totalDuration = segments.reduce((a,b)=>a+b.durationMin,0);

        // Koszt paliwa
        const fuelCost = (totalDistance * (consumption/100) * fuelPrice).toFixed(2);

        res.json({ geojson, segments, distanceKm: totalDistance, durationMin: totalDuration, fuelCost });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Błąd routingu ORS' });
    }
});

app.listen(PORT, () => console.log(`Server start na http://localhost:${PORT}`));
