require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index', { error: null });
});

app.get('/results', async (req, res) => {
  const { city, page = 1 } = req.query;
  const roadEventsPerPage = 5;
  if (!city) {
    return res.render('index', { error: 'City is required' });
  }

  try {
    const weather = await getWeather(city);
    const roadEvents = await getRoadEvents(city);

    const roadEventsPage = roadEvents.slice((page - 1) * roadEventsPerPage, page * roadEventsPerPage);

    res.render('results', { weather, roadEvents: roadEventsPage, city, page: parseInt(page), totalRoadEvents: roadEvents.length });
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.render('index', { error: 'Failed to fetch data. Try again later.' });
  }
});

async function getWeather(city) {
  const geocodeUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHERMAP_API_KEY}`;
  const geoResponse = await axios.get(geocodeUrl);

  const { lat, lon } = geoResponse.data.coord;

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=America%2FToronto`;
  const forecastResponse = await axios.get(forecastUrl);

  console.log('Forecast Response:', forecastResponse.data);

  if (!forecastResponse.data.daily) {
    throw new Error('Daily forecast data is missing.');
  }

  const forecastData = forecastResponse.data.daily.time.map((time, index) => ({
    date: time,
    tempMax: forecastResponse.data.daily.temperature_2m_max[index],
    tempMin: forecastResponse.data.daily.temperature_2m_min[index],
    precipitation: forecastResponse.data.daily.precipitation_sum[index],
    description: forecastResponse.data.daily.weathercode[index],
  }));

  return forecastData;
}

async function getRoadEvents(city) {
  const roadEventsUrl = `https://api.open511.gov.bc.ca/events`;
  const response = await axios.get(roadEventsUrl, {
    params: { location: city }
  });
  return response.data.events;
}

// Export the app to be used by Vercel's serverless function
module.exports = app;
