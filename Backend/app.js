const express = require('express');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/authRoutes');
const sensorDataRoutes = require('./routes/sensorDataRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const barangayRoutes = require('./routes/barangayRoutes');
const establishmentRoutes = require('./routes/establishmentRoutes');
const weatherRoutes = require('./routes/weatherRoutes');



const app = express();
app.use(bodyParser.json());

const cors = require('cors');
app.use(cors());

app.get('/', function(req, res) {
    res.send('Welcome to the ByteTech API!');
});

// Enpoint for authentication routes
app.use('/auth', authRoutes);
app.use('/api', sensorDataRoutes);
app.use('/api', sensorRoutes);
app.use('/api', barangayRoutes);
app.use('/api/establishments', establishmentRoutes);
app.use('/api/weather', weatherRoutes);


const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 