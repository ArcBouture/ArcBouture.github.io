// ----------------------------------------------- Constants -----------------------------------------------
// Store API Queries
const APIURL = 'https://api.meteo-concept.com/api/';
const TOKEN = 'c70e43130afab2f94be8b9e8fdbfe4488ca0b9ad33397d4eaf0001d35e8eaa01';
const STATION_KEY = '461cb6ad-8117-452a-bc8e-3327aead4c7b';// (48.1098, -1.6464, 30m)
const TOWN = '35000';
const INSEE = '35238';

// Store HTML elements.
const OUTPUTTEST3 = document.getElementById('output_test3');
const RAINWIDGET = document.getElementById('rain_widget');
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Variables -----------------------------------------------
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Functions -----------------------------------------------
// Create request functions.
function GetAPIData(response){
    if (!response.ok) {
        throw new Error('API call failed successfully.');
    }
    return response.json();
};
// Define main function that will run every 10 minutes.
async function meteoCheck(){
    // Get current date.
    let timeNow = new Date();
    // Only keep the year-day-month T hours:minutes format.
    let correctTimeFormat = timeNow.toISOString().substring(0, 16);
    // Make a request for the list of nearby available stations and their metorological data.
    let meteoData = await fetch(APIURL + 'observations/around?token='+TOKEN+'&insee='+INSEE+'&datetime='+correctTimeFormat+'&radius=5')
                            .then(response => GetAPIData(response))
                            .catch(error => console.error('Error: ', error));
    // Select only the rainfall value.
    let rainfallValue = meteoData[0].observation.rainfall.value

    // Define a list of actions depending on the result of the value.
    // Less or equal to 0 is the absence of rainfall, we set the stage as "sunny".
    if (rainfallValue <= 0) {
        RAINWIDGET.setAttribute('src', 'images/DAYBG.png');
        OUTPUTTEST3.textContent = 'sunny';
    // More or equal to 6 is heavy rain, we set the stage as "stormy".
    } else if (rainfallValue >= 6) {
        RAINWIDGET.setAttribute('src', 'https://www.grupooneair.com/wp-content/uploads/2023/02/why-are-storms-given-names.jpg');
        OUTPUTTEST3.textContent = 'stormy';
    // Between ]0 and 6[, there is rain, we set the stage as "rainy".
    } else {
        RAINWIDGET.setAttribute('src', 'https://img.freepik.com/photos-gratuite/texture-surface-metallique-rugueuse_23-2148953930.jpg?size=626&ext=jpg&ga=GA1.1.2008272138.1722038400&semt=sph');
        OUTPUTTEST3.textContent = 'rainy';
    }
}
// ---------------------------------------------------------------------------------------------------------

// ------------------------------------------------- Calls -------------------------------------------------
// Run meteo check every 10 minutes.
setInterval(meteoCheck(), 600000);
// ---------------------------------------------------------------------------------------------------------