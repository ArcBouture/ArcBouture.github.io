// ----------------------------------------------- Constants -----------------------------------------------
// Store HTML elements.
const STARFIELDLAYERS = document.getElementsByClassName('starfield_layer');

// Define the number of star per fields.
const STARSPERLAYER = 30;

// Define the max width and height at which the stars can spawn.
const SPAWNWIDTH = 1920;
const SPAWNHEIGHT = 1080;
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Variables -----------------------------------------------
// ---------------------------------------------------------------------------------------------------------

// ----------------------------------------------- Functions -----------------------------------------------
// Create a function to generate each star in the star map
function GenerateStarMap(){
    // Define by how much to decrease the opacity for each layer.
    let opacityDecrease = 100 / (STARFIELDLAYERS.length+1); 
    // Itterate over all the star fields.
    for (let layerIndex = 0; layerIndex < STARFIELDLAYERS.length; layerIndex++) {
        // Save the current field in a variable.
        let currentLayer = STARFIELDLAYERS[layerIndex];
        for (let index = 0; index < STARSPERLAYER; index++) {
            // Create a list element, all the important properties are already set in css.
            let star = document.createElement("li");
            // set a random position for the star.
            star.style.setProperty('top', GetRandomInt(SPAWNHEIGHT) + 'px');
            star.style.setProperty('left', GetRandomInt(SPAWNWIDTH) + 'px');
            // Append the element to its parent unorded list.
            currentLayer.appendChild(star);
        }
        // Set the opacity of the field to get a depth of field effect.
        currentLayer.style.setProperty('opacity', (100 - (opacityDecrease * layerIndex)) + '%');
    };
};

// Create a function that returns a random number up to a certain maximum.
function GetRandomInt(max){
    // We use floor to get an int, and we multiply the maximum by the value that random returns. 
    // Since the value returned by random is between 0 and 1, it gives us a fraction of the maximum.
    return Math.floor(Math.random() * max);
  }
// ---------------------------------------------------------------------------------------------------------

// ------------------------------------------------- Calls -------------------------------------------------
GenerateStarMap();
// ---------------------------------------------------------------------------------------------------------