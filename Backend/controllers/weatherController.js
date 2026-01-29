const axios = require('axios');
const pool = require('../config/database');

// ============================================
// Get weekly weather + AI carbon prediction
// ============================================
const getWeeklyPrediction = async (req, res) => {
  const { barangay_id } = req.params;

  // 1️⃣ Validate barangay_id
  if (!barangay_id) {
    return res.status(400).json({ error: 'barangay_id is required' });
  }

  try {
    // 2️⃣ Get barangay coordinates
    const [rows] = await pool.query(
      `SELECT name, latitude, longitude 
       FROM barangays 
       WHERE barangay_id = ?`,
      [barangay_id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Barangay not found' });
    }

    const { name, latitude, longitude } = rows[0];

    // 3️⃣ Open-Meteo API (7-day forecast)
    const url = `
      https://api.open-meteo.com/v1/forecast
      ?latitude=${latitude}
      &longitude=${longitude}
      &daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max
      &timezone=Asia%2FSingapore
    `.replace(/\s+/g, '');

    let daily = null;

    try {
      const { data } = await axios.get(url);
      if (data.daily && data.daily.time) {
        daily = data.daily;
      } else {
        console.warn('Open-Meteo returned no daily data, using fallback');
      }
    } catch (apiError) {
      console.warn('Open-Meteo API error, using fallback:', apiError.message);
    }

    // 4️⃣ Prepare forecast
    const forecast = [];

    if (daily) {
      daily.time.forEach((date, i) => {
        const tempMax = daily.temperature_2m_max?.[i] ?? null;
        const tempMin = daily.temperature_2m_min?.[i] ?? null;
        const rain = daily.precipitation_probability_max?.[i] ?? null;
        const wind = daily.wind_speed_10m_max?.[i] ?? null;

        let carbon = 'NORMAL'; // default enum value
        if (tempMax !== null && rain !== null && wind !== null) {
          if (tempMax >= 35 && rain < 20 && wind < 3) carbon = 'VERY HIGH';
          else if (tempMax >= 32 && rain < 40) carbon = 'HIGH';
          else if (rain >= 60 || wind >= 6) carbon = 'LOW';
        }

        forecast.push({
          date,
          temp_max: tempMax,
          temp_min: tempMin,
          rain_probability: rain,
          wind_speed: wind,
          predicted_carbon_density: carbon
        });
      });
    } else {
      // Fallback 7-day forecast with safe ENUM value
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        forecast.push({
          date: date.toISOString().split('T')[0],
          temp_max: null,
          temp_min: null,
          rain_probability: null,
          wind_speed: null,
          predicted_carbon_density: 'NORMAL' // ✅ must match ENUM
        });
      }
    }

    // 5️⃣ Save forecasts in weather_foreasts table
    try {
      for (const day of forecast) {
        await pool.query(
          `INSERT INTO weather_forecasts
           (barangay_id, forecast_date, temp_max, temp_min, rain_probability, wind_speed, predicted_carbon_density)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             temp_max = VALUES(temp_max),
             temp_min = VALUES(temp_min),
             rain_probability = VALUES(rain_probability),
             wind_speed = VALUES(wind_speed),
             predicted_carbon_density = VALUES(predicted_carbon_density)`,
          [
            barangay_id,
            day.date,
            day.temp_max,
            day.temp_min,
            day.rain_probability,
            day.wind_speed,
            day.predicted_carbon_density
          ]
        );
      }
    } catch (dbError) {
      console.warn('Failed to save forecast to DB:', dbError.message);
    }

    // 6️⃣ Return JSON response
    res.status(200).json({
      barangay_id,
      barangay_name: name,
      forecast_days: forecast.length,
      forecast
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      error: 'Weather prediction failed',
      
    });
  }
};

module.exports = {
  getWeeklyPrediction
};
