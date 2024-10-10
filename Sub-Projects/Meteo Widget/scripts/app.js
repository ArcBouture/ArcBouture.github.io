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
const CLOUDCONTAINER1 = document.getElementById('cloud_container_1');
const CLOUDCONTAINER2 = document.getElementById('cloud_container_2');
const BGGREYING = document.getElementById('bg_greying');

// Define the max number of clouds for the rain scene.
const CLOUDCOUNTMAX = 20;
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Variables -----------------------------------------------
// Store the last know rainfall value.
var lastRainfallValue = 0
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Functions -----------------------------------------------
// ---------------------------------- Meteo API ----------------------------------
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
    let newRainfallValue = meteoData[0].observation.rainfall.value
    // Grey out the background as a percentage of black.
    BGGREYING.style.opacity = newRainfallValue*10 + '%'
    // Ceil the value to avoid decimals, and multiply by 2 to see more of an impact on the cloud quantity, with this value hence transformed, we can use it directly in the clouds generation.
    let correctedRainfallValue = Math.ceil(newRainfallValue) * 2;

    OUTPUTTEST3.textContent = newRainfallValue + ', ' + correctedRainfallValue;

    // Compute the difference between the previous rainfall value and now. It represents the number of clouds to remove in case of a lowering rainfall.
    let rainfallDiff = correctedRainfallValue - lastRainfallValue;
    
    // Define a list of actions depending on the result of the value.
    // Less or equal to 0 is the absence of rainfall, we set the stage as "sunny".
    if (correctedRainfallValue <= 0) {
        // The sun's out. Move out the clouds if there are any.
        MoveOutClouds(Array.from(CLOUDCONTAINER2.children))
    // More or equal to 14 is heavy rain, we set the stage as "stormy".
    } else if (correctedRainfallValue >= 7) {
        // If the rainfall has lowered : 
        if (rainfallDiff < 0){
            // Remove the same amount of clouds as the difference between the previous and current corrected rainfall values.
            MoveOutClouds(Array.from(CLOUDCONTAINER2.children).slice(rainfallDiff));
        }
        // Generate the max ammount of clouds authorized, and set them in movement to cover the chat in a dynamic, animated way.
        var cloudsList = GenerateClouds(CLOUDCOUNTMAX)
        MoveInClouds(cloudsList)
    // Between ]0 and 7[, there is rain, we set the stage as "rainy".
    } else {
        // If the rainfall has lowered : 
        if (rainfallDiff < 0){
            // Remove the same amount of clouds as the difference between the previous and current corrected rainfall values.
            MoveOutClouds(Array.from(CLOUDCONTAINER2.children).slice(rainfallDiff));
        }
        // Generate the clouds if any are missing, and set them in movement to cover the chat in a dynamic, animated way.
        var cloudsList = GenerateClouds(correctedRainfallValue)
        MoveInClouds(cloudsList)
    }
    // Update the "lastRainfallValue" variable.
    lastRainfallValue = correctedRainfallValue;
}
// -------------------------------------------------------------------------------

// ------------------------------ Clouds Animations ------------------------------
// We'll use it a lot so make a function to generate a number in a specified interval.
function IntervalRand(min, max) {
    return Math.random() * (max - min) + min;
}

// Define a function that generates the clouds.
function GenerateClouds(cloudCount, fromScratch = 0) {
    // Check how many clouds there already are to differentiate new ones and old ones.
    var originalCloudsCount = CLOUDCONTAINER2.children.length;
    // Compute the number of clouds will be added, no matter if we start from nothing or if we add from an already existing list. If we ask for less clouds than there already are,
    // none will be generated.
    var newCloudsCount = cloudCount - originalCloudsCount;
    // Add new clouds, this use of the function covers all nescessities, but I prefere to keep the ability to start from scratch.
    if (!fromScratch){
        // For every new cloud we want :
        for (var i = 0; i < newCloudsCount; i++) {
            // Create the element.
            var newCloud = document.createElement('img');
            // Set the attributes we want.
            newCloud.setAttribute('class' , 'cloud');
            newCloud.setAttribute('src' , 'images\\cloud.png');
            // Append the new cloud to its parent Div.
            CLOUDCONTAINER2.appendChild(newCloud);
        }
    // Spawn every cloud.
    } else {
        // Set the inner html itself as a list of [cloudCount] clouds.
        CLOUDCONTAINER2.innerHTML = '<img class="cloud" src="images\\cloud.png">'.repeat(cloudCount);
    };
    // Get the array of new clouds by slicing the list of children of the container. If the clouds where the first to be created, the originalCloudsCount is 0 and thus the slice returns all.
    var newCloudsList = Array.from(CLOUDCONTAINER2.children).slice(originalCloudsCount);
    //  Spawn the new clouds, placing them in the actual screen.
    SpawnClouds(newCloudsList);
    // Return the list of newly generated clouds so as to be able to animate them seperatly from the rest.
    return newCloudsList;
};

// Define a function that places the clouds at random upon spawn.
function SpawnClouds(cloudsList) {
    for (var i = 0; i < cloudsList.length; i++) {
        // Select current cloud.
        var currentCloud = cloudsList[i];

        // Randomize cloud size.
        var sizeMult = IntervalRand(1, 2);
        currentCloud.style.width = currentCloud.clientWidth * sizeMult + 'px';

        // Generate the coordinates in such a way that the clouds y position are spread over the whole area, adjusted for the cloud height.
        currentCloud.style.top = ((Math.random() * BGGREYING.clientHeight) - currentCloud.clientHeight/1.5) + 'px';
        // and that the x positions are situated left and right of the area (such that the left and right spawning areas are of the same size).
        // 50/50 chance to generate the cloud at the left or right of the area to cover during rain.
        if ((Math.floor(Math.random() * 2) + 1) % 2 == 0) {
            // If it's on the left, the spawn area is between 0 and the chat area (bggreying), we don't want any overlapping with the chat so we subtract the width of the cloud.
            currentCloud.style.left = Math.random() * (BGGREYING.offsetLeft - currentCloud.clientWidth) + 'px';
        } else {
            // If it's on the right, we want the overall width of the spawning zone to be the same as on the left, so we multiply by the same amount 
            // (minus the cloud width subtraction since the position is upper left based). we then add the displacement value equal to the left spawning area + the width of the chat area.
            currentCloud.style.left = IntervalRand((BGGREYING.offsetLeft + BGGREYING.clientWidth), (BGGREYING.offsetLeft * 2 + BGGREYING.clientWidth - currentCloud.clientWidth)) + 'px';
        };
    };
}

// Define a function that animate the clouds t'wardst the chat to give the impression of a rainy day.
function MoveInClouds(cloudsList) {
    // Start an animation for each cloud.
    for (var i = 0; i < cloudsList.length; i++) {
        // Select current cloud.
        var currentCloud = cloudsList[i];

        // Set the random parameters for the moving animations of the current cloud.
        var keyframeMoveInParams = {
            delay : IntervalRand(0, 4) * 1000,
            duration : IntervalRand(6, 10) * 1000,
            easing : 'cubic-bezier(.40,.84,.44,1)',
            fill :'forwards',
        }
        // Set the keyframes for the moving animations of clouds towards any part of the chat (bggreying) (adjusted for cloud size).
        var keyframeMoveIn = [
            {

            },
            {
                left : IntervalRand(BGGREYING.offsetLeft - currentCloud.clientWidth/3, BGGREYING.offsetLeft + BGGREYING.clientWidth - currentCloud.clientWidth/2) + 'px',
            }
        ];

        // Animate the cloud.
        currentCloud.animate(keyframeMoveIn, keyframeMoveInParams);
    };
};

// Define a function that animate the clouds out of the chat to give the impression of rain stopping.
function MoveOutClouds(cloudsList) {
    // Store the ID of the last animation played to remove the elements once all is done.
    let animationID = 0;
    // Start an animation for each cloud.
    for (var i = 0; i < cloudsList.length; i++) {
        // Select current cloud.
        var currentCloud = cloudsList[i];

        // Set the random parameters for the moving animations of the current cloud.
        var keyframeMoveOutParams = {
            delay : IntervalRand(0, 4) * 1000,
            duration : IntervalRand(6, 10) * 1000,
            easing : 'cubic-bezier(.40,.84,.44,1)',
            fill :'forwards',
        }
        // Simply reuse the code that splits left and right spawn areas, and mix in keyframes to move towards what used to be spawning area, hence animatin the clouds leaving the chatbox.
        if ((Math.floor(Math.random() * 2) + 1) % 2 == 0) {
            var keyframeMoveOut = [
                {

                },
                {
                    left : Math.random() * (BGGREYING.offsetLeft - currentCloud.clientWidth) + 'px',
                }
            ];
        } else {
            var keyframeMoveOut = [
                {

                },
                {
                    left : IntervalRand((BGGREYING.offsetLeft + BGGREYING.clientWidth), (BGGREYING.offsetLeft * 2 + BGGREYING.clientWidth - currentCloud.clientWidth)) + 'px',
                }
            ];
        };

        // Animate the cloud.
        animationID = currentCloud.animate(keyframeMoveOut, keyframeMoveOutParams);
    };
    // Remove all the clouds that have been moved out.
    animationID.onfinish = () =>{
        cloudsList.map((cloud) => {
            cloud.remove();
        });
    };
};
// ---------------------------------------------------------------------------------------------------------

// ------------------------------------------------- Calls -------------------------------------------------
// Run meteo check every 10 minutes.
setInterval(meteoCheck(), 600000);
// var tempClouds = GenerateClouds(6)
// MoveInClouds(tempClouds)
// MoveOutClouds(tempClouds.slice(-2))

// ---------------------------------------------------------------------------------------------------------