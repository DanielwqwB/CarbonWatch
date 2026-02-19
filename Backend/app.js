const express = require('express');
const bodyParser = require('body-parser');

const barangayRoutes = require('./routes/barangayRoutes');
const establishmentRoutes = require('./routes/establishmentRoutes');
const userRoutes = require('./routes/userRoutes');  
const sensorRoutes = require('./routes/sensorRoutes');
const sensorDataRoutes = require('./routes/sensorDataRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');  
const reportsRoutes = require('./routes/reportsRoutes');


const app = express();
app.use(bodyParser.json());

const cors = require('cors');
app.use(cors());

app.get('/', function(req, res) {
    res.send('Welcome to the ByteTech API!');
});

app.use('/', userRoutes);
app.use('/', barangayRoutes);
app.use('/', establishmentRoutes);
app.use('/', sensorRoutes);   
app.use('/', sensorDataRoutes);  
app.use('/', dashboardRoutes);
app.use('/', reportsRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
