// ----------------------------------------------- Constants -----------------------------------------------
// Store API Queries.
const APIURL = 'https://api.meteo-concept.com/api/';
const TOKEN = 'c70e43130afab2f94be8b9e8fdbfe4488ca0b9ad33397d4eaf0001d35e8eaa01';
const STATION_KEY = '461cb6ad-8117-452a-bc8e-3327aead4c7b';// (48.1098, -1.6464, 30m)
const TOWN = '35000';
const INSEE = '35238';

// Store HTML elements.
const BACKGROUNDIMAGES = document.getElementsByClassName('background_image');
const RENDERCANVAS = document.getElementById('render_canvas');
const CANVASCONTEXT = RENDERCANVAS.getContext("2d");

// Define image format for the rendering.
const GLOBALHEIGHT = 1080;
const GLOBALWIDTH = 1920;

// Define the rate at which to update the background (in milliseconds).
const UPDATERATE = 5000;
// Define the amount of time before and after sunrise used for transitions (in milliseconds).
const TRANSITIONTIME = (30*60*1000);
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Variables -----------------------------------------------
// Keep the array version of the currently displayed image so as not to fetch it from the canvas every time.
var renderedImageArrayCopy;

// Store the matrix versions of key frames;
var DAYMATRIX;
var DUSKDAWNMATRIX;
var NIGHTMATRIX;
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Functions -----------------------------------------------
// -------------------------------------- Main Function --------------------------------------
// Since we'll be working with the fetch API, we'll encapsulate the program in a function so as to levrage the async functionnalities.
async function main(){
    // Get the current date as well as tomorrow's.
    let currentDate = new Date();
    let tomorrowsDate = new Date(currentDate.getTime() + (24*60*60*1000));
    // Get today's time and keep only the year-day-month part.
    let currentDateHourLess = currentDate.toISOString().split('T')[0];
    let tomorrowsDateHourLess = tomorrowsDate.toISOString().split('T')[0];
    // Get today's and tomorrow's ephemerid.
    let ephemeridToday = (await GetEphemeride(currentDate)).ephemeride;
    let ephemeridTomorrow = (await GetEphemeride(tomorrowsDate)).ephemeride;
    // Get the hour of sunrise, dawn, sunset and dusk.
    let todaysSunrise = new Date(currentDateHourLess + 'T' + ephemeridToday['sunrise'] + ':00');
    let todaysMorning = new Date(todaysSunrise.getTime() + TRANSITIONTIME);
    let todaysLeadToSunrise = new Date(todaysSunrise.getTime() - TRANSITIONTIME);
    let todaysSunset = new Date(currentDateHourLess + 'T' + ephemeridToday['sunset'] + ':00');
    let todaysDusk = new Date(todaysSunset.getTime() - TRANSITIONTIME);
    let todaysLeadToNight = new Date(todaysSunset.getTime() + TRANSITIONTIME);
    let tomorrowsSunrise = new Date(tomorrowsDateHourLess + 'T' + ephemeridTomorrow['sunrise'] + ':00');

    // Update the matrix versions of key frames.
    DAYMATRIX = await GetMatrixFromImage(BACKGROUNDIMAGES[0]);
    DUSKDAWNMATRIX = await GetMatrixFromImage(BACKGROUNDIMAGES[1]);
    NIGHTMATRIX = await GetMatrixFromImage(BACKGROUNDIMAGES[2]);

    // This router is used to initialize the event chain no matter when the program starts.
    // If the current time is between the end of dawn and the start of dusk, then it's the day.
    // For each path, the necessary timeframes are given, as well as a null ID for an interval.
    // If the current time is between sunrise and TRANSITIONTIME minutes before sunrise, then it's the transition period between night and sunrise.
    if (currentDate >= todaysLeadToSunrise & currentDate < todaysSunrise){
        SetLeadToSunriseBG(todaysSunrise, todaysMorning, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, 0, true);
    // If the current time is between the start of sunrise and the end of dawn, then the sun is currently rising (early morning).
    } else if (currentDate >= todaysSunrise & currentDate < todaysMorning){
        SetSunriseBG(todaysMorning, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, 0, true);
    // If the current time is between the end of the sunrise sequence and before the sunset sequence, then it's mid-day
    } else if (currentDate >= todaysMorning & currentDate < todaysDusk){
        SetDayBG(todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, 0);
    // If the current time is between the start of dusk and the end of sunset, then the sun is in the process of setting (late evening).
    } else if (currentDate >= todaysDusk & currentDate < todaysSunset){
        SetSunsetBG(todaysSunset, todaysLeadToNight, tomorrowsSunrise, 0, true);
    // If the current time is between sunset and TRANSITIONTIME minutes after sunset, then it's the transition period between sunset and night.
    } else if (currentDate >= todaysSunset & currentDate < todaysLeadToNight){ 
        SetLeadToNightBG(todaysLeadToNight, tomorrowsSunrise, 0, true);
    // If the current time is earlier than today's lead-to-sunrise point, then it's the night between today and yesterday.
    } else if (currentDate < todaysLeadToSunrise){
        SetNightBG(tomorrowsSunrise, 0);
    // If the current time is later than today's lead-to-night point, then it's the night between today and tomorrow.
    } else if (currentDate >= todaysLeadToNight){
        SetNightBG(tomorrowsSunrise, 0);
    // otherwise an error occured.
    } else {
        console.log('huh?');
    };
};
// -------------------------------------------------------------------------------------------

// -------------------------------------- API Functions --------------------------------------
// Create request functions
async function GetAPIData(response){
    if (!response.ok) {
        throw new Error('API call failed successfully.');
    }
    return response.json();
};

// Create a function to fetch the ephemeride given a date.
async function GetEphemeride(date){
    let ephemeridToday = await fetch(APIURL + 'ephemeride/0?token='+TOKEN+'&cp='+TOWN, date)
                        .then(response => GetAPIData(response))
                        .catch(error => console.error('Error: ', error));
    
    return ephemeridToday;
};
// -------------------------------------------------------------------------------------------

// ------------------------------- Matrix Operations Functions -------------------------------
// Create a function to transform a given image html element to a math matrix.
async function GetMatrixFromImage(image){
    // Switch the cross origin of the image to anonymous to guarantee access.
    image.crossOrigin  = 'Anonymous';
    // We have to wait for the image to be loaded, so we create a promise to get the data from the img.onload function.
    let imageRGBData = await new Promise((resolve) => {
        // Ensure that the image is well loaded before going further.
        image.onload = () => {
            // Create an empty canvas element.
            let canvas = document.createElement("canvas");
            canvas.width = GLOBALWIDTH;
            canvas.height = GLOBALHEIGHT;

            // Copy the image contents to the canvas.
            let ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);

            // Get the image data.
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Remove the temporary canvas element.
            canvas.remove();
            // Resolve the promise, sending the data back to the GetMatrixFromImage function scope.
            resolve(imageData);
        };
    });
    // Convert the imageData to a standard array.
    let imageStandardArray = Array.from(imageRGBData.data);
    // Reshape the array into a suitable matrix.
    let imageMatrix = math.reshape(imageStandardArray, [(GLOBALWIDTH*GLOBALHEIGHT), 4]);
    let imageMatrixTranspose = math.transpose(imageMatrix);

    // Return the matrix.
    return imageMatrixTranspose;
};

// Create a function that returns the matrix to add to a starting matrix over a number of steps to reach a target matrix.
function GetDisplacementMatrix(startingMatrix, targetMatrix){
    // Subtract the starting matrix to the target one to get the total displacement between the two (one can visualize a list of vectors going from the starting matrix points
    // to the target ones )
    let differenceMatrix = math.subtract(targetMatrix, startingMatrix);
    // divide the total amount of time before the target has to be reached by the time between steps to get the total number of steps.
    let updateRateDividend = (TRANSITIONTIME / UPDATERATE);
    // divide the total difference by the number of steps to get the displacement matrix for each step.
    let displacementMatrix = math.divide(differenceMatrix, updateRateDividend);

    return displacementMatrix;    
};

// Create a function that reverses the image to matrix pipeline in order to set a matrix as an image inside a canvas.
function SetMatrixToCanvas(ctx, matrix){
    // First step is to undo the transpose.
    let imageMatrixUntranspose = math.transpose(matrix);
    // Then flatten the matrix, the canvas takes care of reading the flattened array as 4 channels of x and y specified dimensions.
    let flattenedMatrix = math.flatten(imageMatrixUntranspose);
    // Then we change the array into a Uint8ClampedArray object.
    let clampedArray = new Uint8ClampedArray(flattenedMatrix);
    // Convert the clamped array into an image data object which is readable by the canvas.
    let imageDataObject = new ImageData(clampedArray, GLOBALWIDTH, GLOBALHEIGHT);

    // finally, set the image into the specified canvas starting at the 0, 0 coordinates (whole image).
    ctx.putImageData(imageDataObject, 0, 0);
    // Also save the matrix into the copy.
    renderedImageArrayCopy = matrix;
};
// -------------------------------------------------------------------------------------------

// -------------------------------- Period Updating Functions --------------------------------
// Create a function to set each background. If the loop started at sunrise, then the "SetSunriseBG" function would be called, it would update the image accordingly
// and set a timeout untill the end of sunrise, meaning untill day time, that calls the SetDayBG function. Then when the SetDayBG is called through the timeout, it too 
// will set another timeout to wait untill the next step, etc...
// SetNightBG has two roles as it uses tomorrows's value for it's SetSunriseBG timeout, and it updates all values to switch days (without recomputing the "tomorrowsSunrise" value of course).
// And hence the loop continues from day to day.
function SetLeadToSunriseBG(todaysSunrise, todaysMorning, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, intervallId, launch){
    // Set the default matrix to switch to as the night scene, we're not switching to it yet in case this is the first instanciation.
    let currentMatrix = NIGHTMATRIX;
    // Get the current time.
    let currentTime = new Date();
    // Store the time between now and the next phase.
    let timeTillNext = (todaysSunrise - currentTime);
    // Get the displacement matrix.
    let displacementMatrix = GetDisplacementMatrix(NIGHTMATRIX, DUSKDAWNMATRIX);

    // If we're launching the app in the middle of a period, compute how many steps in we are in the transition.
    if (launch) {
        let missedUpdates = (TRANSITIONTIME - timeTillNext) / UPDATERATE;
        // add to the defined current matrix, as many steps as were missed before initialization.
        currentMatrix = math.add(currentMatrix, math.multiply(displacementMatrix, missedUpdates));
    };
    // Update the background.
    SetMatrixToCanvas(CANVASCONTEXT, currentMatrix);

    // Set an interval to update the canvas, and stop the old interval.
    if (intervallId) {
        clearInterval(intervallId);
    }
    let newIntervallId = setInterval(BackgroundUpdater, UPDATERATE, displacementMatrix);
    // Wait to call the next step's function.
    setTimeout(SetSunriseBG, timeTillNext, todaysMorning, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, newIntervallId, false);
};

function SetSunriseBG(todaysMorning, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, intervallId, launch){
    // Set the default matrix to switch to as the dawn scene, we're not switching to it yet in case this is the first instanciation.
    let currentMatrix = DUSKDAWNMATRIX;
    // Get the current time.
    let currentTime = new Date();
    // Store the time between now and the next phase.
    let timeTillNext = (todaysMorning - currentTime);
    // Get the displacement matrix.
    let displacementMatrix = GetDisplacementMatrix(DUSKDAWNMATRIX, DAYMATRIX);

    // If we're launching the app in the middle of a period, compute how many steps in we are in the transition.
    if (launch) {
        let missedUpdates = (TRANSITIONTIME - timeTillNext) / UPDATERATE;
        // add to the defined current matrix, as many steps as were missed before initialization.
        currentMatrix = math.add(currentMatrix, math.multiply(displacementMatrix, missedUpdates));
    };
    // Update the background.
    SetMatrixToCanvas(CANVASCONTEXT, currentMatrix);

    // Set an interval to apply this colour change every second, and stop the old interval.
    if (intervallId) {
        clearInterval(intervallId);
    }
    let newIntervallId = setInterval(BackgroundUpdater, UPDATERATE, displacementMatrix);
    // Wait to call the next step's function.
    setTimeout(SetDayBG, timeTillNext, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, newIntervallId);
};

function SetDayBG(todaysDusk, todaysSunset, todaysDusk, todaysLeadToNight, tomorrowsSunrise, intervallId){
    // Update the background to the day scene.
    SetMatrixToCanvas(CANVASCONTEXT, DAYMATRIX);
    // Get the current time.
    let currentTime = new Date();
    // If there is a interval currently running, terminate it.
    if (intervallId) {
        clearInterval(intervallId);
    }
    // Wait to call the next step's function.
    setTimeout(SetSunsetBG, (todaysDusk - currentTime), todaysSunset, todaysLeadToNight, tomorrowsSunrise, 0, false);
};

function SetSunsetBG(todaysSunset, todaysLeadToNight, tomorrowsSunrise, intervallId, launch){
    // Set the default matrix to switch to as the day scene, we're not switching to it yet in case this is the first instanciation.
    let currentMatrix = DAYMATRIX;
    // Get the current time.
    let currentTime = new Date();
    // Store the time between now and the next phase.
    let timeTillNext = (todaysSunset - currentTime);
    // Get the displacement matrix.
    let displacementMatrix = GetDisplacementMatrix(DAYMATRIX, DUSKDAWNMATRIX);

    // If we're launching the app in the middle of a period, compute how many steps in we are in the transition.
    if (launch) {
        let missedUpdates = (TRANSITIONTIME - timeTillNext) / UPDATERATE;
        // add to the defined current matrix, as many steps as were missed before initialization.
        currentMatrix = math.add(currentMatrix, math.multiply(displacementMatrix, missedUpdates));
    };
    // Update the background.
    SetMatrixToCanvas(CANVASCONTEXT, currentMatrix);

    // Set an interval to apply this colour change every second, and stop the old interval.
    if (intervallId) {
        clearInterval(intervallId);
    }
    let newIntervallId = setInterval(BackgroundUpdater, UPDATERATE, displacementMatrix);
    // Wait to call the next step's function.
    setTimeout(SetLeadToNightBG, timeTillNext, todaysLeadToNight, tomorrowsSunrise, newIntervallId, false);
};


function SetLeadToNightBG(todaysLeadToNight, tomorrowsSunrise, intervallId, launch){
    // Set the default matrix to switch to as the dusk scene, we're not switching to it yet in case this is the first instanciation.
    let currentMatrix = DUSKDAWNMATRIX;
    // Get the current time.
    let currentTime = new Date();
    // Store the time between now and the next phase.
    let timeTillNext = (todaysLeadToNight - currentTime);
    // Get the displacement matrix.
    let displacementMatrix = GetDisplacementMatrix(DUSKDAWNMATRIX, NIGHTMATRIX);

    // If we're launching the app in the middle of a period, compute how many steps in we are in the transition.
    if (launch) {
        let missedUpdates = (TRANSITIONTIME - timeTillNext) / UPDATERATE;
        // add to the defined current matrix, as many steps as were missed before initialization.
        currentMatrix = math.add(currentMatrix, math.multiply(displacementMatrix, missedUpdates));
    };
    // Update the background.
    SetMatrixToCanvas(CANVASCONTEXT, currentMatrix);

    // Set an interval to apply this colour change every second, and stop the old interval.
    if (intervallId) {
        clearInterval(intervallId);
    }
    let newIntervallId = setInterval(BackgroundUpdater, UPDATERATE, displacementMatrix);
    // Wait to call the next step's function.
    setTimeout(SetNightBG, timeTillNext, tomorrowsSunrise, newIntervallId);
};

async function SetNightBG(tomorrowsSunrise, intervallId){
    // Update the background to the night scene.
    SetMatrixToCanvas(CANVASCONTEXT, NIGHTMATRIX);
    // Get the current time.
    let currentTime = new Date();

    // --------------------------- Ephemeride Update ---------------------------
    let tomorrowsDate = new Date(currentTime.getTime() + (24*60*60*1000));
    let tomorrowsTommorowDate = new Date(currentTime.getTime() + (48*60*60*1000));
    // Get today's time and keep only the year-day-month part.
    let tomorrowsDateHourLess = tomorrowsDate.toISOString().split('T')[0];
    let tomorrowstomorrowDateHourLess = tomorrowsTommorowDate.toISOString().split('T')[0];
    // Get today's and tomorrow's ephemerid.
    let ephemeridTomorrow = (await GetEphemeride(tomorrowsDate)).ephemeride;
    let ephemeridTomorrowsTomorrow = (await GetEphemeride(tomorrowsTommorowDate)).ephemeride;
    // Get the hour of sunrise, dawn, sunset and dusk.
    let tomorrowsMorning = new Date(tomorrowsSunrise.getTime() + TRANSITIONTIME);
    let tomorrowsLeadToSunrise = new Date(tomorrowsSunrise.getTime() - TRANSITIONTIME);
    let tomorrowsSunset = new Date(tomorrowsDateHourLess + 'T' + ephemeridTomorrow['sunset'] + ':00');
    let tomorrowsDusk = new Date(tomorrowsSunset.getTime() - TRANSITIONTIME);
    let tomorrowsLeadToNight = new Date(tomorrowsSunset.getTime() + TRANSITIONTIME);
    let tomorrowstomorrowsSunrise = new Date(tomorrowstomorrowDateHourLess + 'T' + ephemeridTomorrowsTomorrow['sunrise'] + ':00');
    // -------------------------------------------------------------------------

    // If there is a interval currently running, terminate it.
    if (intervallId) {
        clearInterval(intervallId);
    }
    // Wait to call the next step's function.
    setTimeout(SetLeadToSunriseBG, (tomorrowsLeadToSunrise - currentTime), tomorrowsSunrise, tomorrowsMorning, tomorrowsDusk, tomorrowsSunset, tomorrowsLeadToNight, tomorrowstomorrowsSunrise, 0, false);
};

// Create a function whose goal is to update the background matrix to flow from one period state to another.
function BackgroundUpdater(displacementMatrix){
    // Add the displacement matrix to the currently saved array copy, the SetMatrixToCanvas function will take care of updating the copy itself. 
    updatedMatrix = math.add(renderedImageArrayCopy, displacementMatrix);
    // Update the canvas.
    SetMatrixToCanvas(CANVASCONTEXT, updatedMatrix);
};
// -------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------

// ------------------------------------------------- Calls -------------------------------------------------
main()
// ---------------------------------------------------------------------------------------------------------