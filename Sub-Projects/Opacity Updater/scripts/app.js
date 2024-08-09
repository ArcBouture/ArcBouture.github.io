// ----------------------------------------------- Constants -----------------------------------------------
// Store API Queries.
const APIURL = 'https://api.meteo-concept.com/api/';
const TOKEN = 'c70e43130afab2f94be8b9e8fdbfe4488ca0b9ad33397d4eaf0001d35e8eaa01';
const STATION_KEY = '461cb6ad-8117-452a-bc8e-3327aead4c7b';// (48.1098, -1.6464, 30m)
const TOWN = '35000';
const INSEE = '35238';

// Store HTML elements.
const BACKGROUNDIMAGES = document.getElementsByClassName('background_image');
const DAYELEM = BACKGROUNDIMAGES[0];
const DUSKDAWNELEM = BACKGROUNDIMAGES[1];
const NIGHTELEM = BACKGROUNDIMAGES[2];

// Define the rate at which to update the background (in milliseconds).
const UPDATERATE = 5000;
// Define the amount of time before and after sunrise used for transitions (in milliseconds).
const TRANSITIONTIME = (30*60*1000);

// Store the opacity update step ammount by dividing the max opacity by the number of steps.
const UPDATESTEP = 100 / (TRANSITIONTIME/UPDATERATE);
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Variables -----------------------------------------------
// Store the opacity value of each key frame, css has a tendency to round down values so since our progress each step is smaller than 1, if we were to fetch the previous
// value in the current opacity of the element, we'd be stuck with no progress made. Hence we keep a "memo" as a JS array to keep the accurate, actual values. 
let opacityValuesMemo = [0, 0, 0]
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
    let todaysLeadToSunrise = new Date(todaysSunrise.getTime() - TRANSITIONTIME);
    let todaysMorning = new Date(todaysSunrise.getTime() + TRANSITIONTIME);
    let todaysSunset = new Date(currentDateHourLess + 'T' + ephemeridToday['sunset'] + ':00');
    let todaysDusk = new Date(todaysSunset.getTime() - TRANSITIONTIME);
    let todaysLeadToNight = new Date(todaysSunset.getTime() + TRANSITIONTIME);
    let tomorrowsSunrise = new Date(tomorrowsDateHourLess + 'T' + ephemeridTomorrow['sunrise'] + ':00');

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

// -------------------------------- Period Updating Functions --------------------------------
// Create a function to set each background. If the loop started at sunrise, then the "SetSunriseBG" function would be called, it would update the image accordingly
// and set a timeout untill the end of sunrise, meaning untill day time, that calls the SetDayBG function. Then when the SetDayBG is called through the timeout, it too 
// will set another timeout to wait untill the next step, etc...
// SetNightBG has two roles as it uses tomorrows's value for it's SetSunriseBG timeout, and it updates all values to switch days (without recomputing the "tomorrowsSunrise" value of course).
// And hence the loop continues from day to day.
function SetLeadToSunriseBG(todaysSunrise, todaysMorning, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, intervallId, launch){
    // Set the expected opacity values for this time.
    opacityValuesMemo = [0, 0, 100];
    // Get the current time.
    let currentTime = new Date();
    // Store the time between now and the next phase.
    let timeTillNext = (todaysSunrise - currentTime);

    // If we're launching the app in the middle of a period, compute how many steps in we are in the transition.
    if (launch) {
        let missedUpdates = (TRANSITIONTIME - timeTillNext) / UPDATERATE;
        // change the opacity values according to the number of missed steps. 
        let FFSteps = missedUpdates * UPDATESTEP;
        opacityValuesMemo = [0, FFSteps, 100-FFSteps];
    };
    // Update the background.
    DAYELEM.style.opacity = (opacityValuesMemo[0] + '%');
    DUSKDAWNELEM.style.opacity = (opacityValuesMemo[1] + '%')
    NIGHTELEM.style.opacity = (opacityValuesMemo[2] + '%');

    // Set an interval to update the background, and stop the old interval.
    if (intervallId) {
        clearInterval(intervallId);
    }
    let newIntervallId = setInterval(BackgroundUpdater, UPDATERATE, 'night', 'duskdawn');
    // Wait to call the next step's function.
    setTimeout(SetSunriseBG, timeTillNext, todaysMorning, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, newIntervallId, false);
};

function SetSunriseBG(todaysMorning, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, intervallId, launch){
    // Set the expected opacity values for this time.
    opacityValuesMemo = [0, 100, 0];
    // Get the current time.
    let currentTime = new Date();
    // Store the time between now and the next phase.
    let timeTillNext = (todaysMorning - currentTime);

    // If we're launching the app in the middle of a period, compute how many steps in we are in the transition.
    if (launch) {
        let missedUpdates = (TRANSITIONTIME - timeTillNext) / UPDATERATE;
        // change the opacity values according to the number of missed steps. 
        let FFSteps = missedUpdates * UPDATESTEP;
        opacityValuesMemo = [FFSteps, 100-FFSteps, 0];
    };
    // Update the background.
    DAYELEM.style.opacity = (opacityValuesMemo[0] + '%');
    DUSKDAWNELEM.style.opacity = (opacityValuesMemo[1] + '%')
    NIGHTELEM.style.opacity = (opacityValuesMemo[2] + '%');

    // Set an interval to apply this colour change every second, and stop the old interval.
    if (intervallId) {
        clearInterval(intervallId);
    }
    let newIntervallId = setInterval(BackgroundUpdater, UPDATERATE, 'duskdawn', 'day');
    // Wait to call the next step's function.
    setTimeout(SetDayBG, timeTillNext, todaysDusk, todaysSunset, todaysLeadToNight, tomorrowsSunrise, newIntervallId);
};

function SetDayBG(todaysDusk, todaysSunset, todaysDusk, todaysLeadToNight, tomorrowsSunrise, intervallId){
    // Set the expected opacity values for this time.
    opacityValuesMemo = [100, 0, 0];
    // Update the background.
    DAYELEM.style.opacity = (opacityValuesMemo[0] + '%');
    DUSKDAWNELEM.style.opacity = (opacityValuesMemo[1] + '%')
    NIGHTELEM.style.opacity = (opacityValuesMemo[2] + '%');
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
    // Set the expected opacity values for this time.
    opacityValuesMemo = [100, 0, 0];
    // Get the current time.
    let currentTime = new Date();
    // Store the time between now and the next phase.
    let timeTillNext = (todaysSunset - currentTime);

    // If we're launching the app in the middle of a period, compute how many steps in we are in the transition.
    if (launch) {
        let missedUpdates = (TRANSITIONTIME - timeTillNext) / UPDATERATE;
        // change the opacity values according to the number of missed steps. 
        let FFSteps = missedUpdates * UPDATESTEP;
        opacityValuesMemo = [100-FFSteps, FFSteps, 0];
    };
    // Update the background.
    DAYELEM.style.opacity = (opacityValuesMemo[0] + '%');
    DUSKDAWNELEM.style.opacity = (opacityValuesMemo[1] + '%')
    NIGHTELEM.style.opacity = (opacityValuesMemo[2] + '%');

    // Set an interval to apply this colour change every second, and stop the old interval.
    if (intervallId) {
        clearInterval(intervallId);
    }
    let newIntervallId = setInterval(BackgroundUpdater, UPDATERATE, 'day', 'duskdawn');
    // Wait to call the next step's function.
    setTimeout(SetLeadToNightBG, timeTillNext, todaysLeadToNight, tomorrowsSunrise, newIntervallId, false);
};


function SetLeadToNightBG(todaysLeadToNight, tomorrowsSunrise, intervallId, launch){
    // Set the expected opacity values for this time.
    opacityValuesMemo = [0, 100, 0];
    // Get the current time.
    let currentTime = new Date();
    // Store the time between now and the next phase.
    let timeTillNext = (todaysLeadToNight - currentTime);

     // If we're launching the app in the middle of a period, compute how many steps in we are in the transition.
     if (launch) {
        let missedUpdates = (TRANSITIONTIME - timeTillNext) / UPDATERATE;
        // change the opacity values according to the number of missed steps. 
        let FFSteps = missedUpdates * UPDATESTEP;
        opacityValuesMemo = [0, 100-FFSteps, FFSteps];
    };
    // Update the background.
    DAYELEM.style.opacity = (opacityValuesMemo[0] + '%');
    DUSKDAWNELEM.style.opacity = (opacityValuesMemo[1] + '%')
    NIGHTELEM.style.opacity = (opacityValuesMemo[2] + '%');

    // Set an interval to apply this colour change every second, and stop the old interval.
    if (intervallId) {
        clearInterval(intervallId);
    }
    let newIntervallId = setInterval(BackgroundUpdater, UPDATERATE, 'duskdawn', 'night');
    // Wait to call the next step's function.
    setTimeout(SetNightBG, timeTillNext, tomorrowsSunrise, newIntervallId);
};

async function SetNightBG(tomorrowsSunrise, intervallId){
    // Set the expected opacity values for this time.
    opacityValuesMemo = [0, 0, 100];
    // Update the background.
    DAYELEM.style.opacity = (opacityValuesMemo[0] + '%');
    DUSKDAWNELEM.style.opacity = (opacityValuesMemo[1] + '%')
    NIGHTELEM.style.opacity = (opacityValuesMemo[2] + '%');
    // Get the current time.
    let currentTime = new Date();

    // --------------------------- Ephemeride Update ---------------------------
    // Get tomorrow's and the day after's date.
    let tomorrowsDate = new Date(currentTime.getTime() + (24*60*60*1000));
    let tomorrowsTommorowDate = new Date(currentTime.getTime() + (48*60*60*1000));
    // Get today's time and keep only the year-day-month part.
    let tomorrowsDateHourLess = tomorrowsDate.toISOString().split('T')[0];
    let tomorrowstomorrowDateHourLess = tomorrowsTommorowDate.toISOString().split('T')[0];
    // Get today's and tomorrow's ephemerid.
    let ephemeridTomorrow = (await GetEphemeride(tomorrowsDate)).ephemeride;
    let ephemeridTomorrowsTomorrow = (await GetEphemeride(tomorrowsTommorowDate)).ephemeride;
    // Get the hour of sunrise, dawn, sunset and dusk.
    let tomorrowsLeadToSunrise = new Date(tomorrowsSunrise.getTime() - TRANSITIONTIME);
    let tomorrowsMorning = new Date(tomorrowsSunrise.getTime() + TRANSITIONTIME);
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

// Create a function whose goal is to update the background to flow from one period state to another.
function BackgroundUpdater(fromFrame, toFrame){
    // We reduce the opacity of the keyframe we're leaving, updating the actual accurate values from the memo.
    switch (fromFrame) {
        case 'day':
            opacityValuesMemo[0] -= UPDATESTEP;
            DAYELEM.style.opacity = (opacityValuesMemo[0] + '%');
            break;
        case 'duskdawn':
            opacityValuesMemo[1] -= UPDATESTEP;
            DUSKDAWNELEM.style.opacity = (opacityValuesMemo[1] + '%');
            break;
        case 'night':
            opacityValuesMemo[2] -= UPDATESTEP;
            NIGHTELEM.style.opacity = (opacityValuesMemo[2] + '%');
            break;    
        default:
            break;
    }
    // and We increase the opacity of the keyframe we're targeting, updating the actual accurate values from the memo.
    switch (toFrame) {
        case 'day':
            opacityValuesMemo[0] += UPDATESTEP;
            DAYELEM.style.opacity = (opacityValuesMemo[0] + '%');
            break;
        case 'duskdawn':
            opacityValuesMemo[1] += UPDATESTEP;
            DUSKDAWNELEM.style.opacity = (opacityValuesMemo[1] + '%');
            break;
        case 'night':
            opacityValuesMemo[2] += UPDATESTEP;
            NIGHTELEM.style.opacity = (opacityValuesMemo[2] + '%');
            break;    
        default:
            break;
    }
};
// -------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------

// ------------------------------------------------- Calls -------------------------------------------------
main()
// ---------------------------------------------------------------------------------------------------------