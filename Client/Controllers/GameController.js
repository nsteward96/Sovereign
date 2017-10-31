var modelResource = {};
var model = {};

$(document).ready(function() {
    // Generate list of game nav buttons; add listeners to update view when clicked.
    var gameNavButtonArray = [];
    gameNavButtonArray.push(document.getElementById('resourceGenerationBtn'));
    gameNavButtonArray.push(document.getElementById('viewTownBtn'));
    for (let i = 0; i < gameNavButtonArray.length; i++) {
        gameNavButtonArray[i].addEventListener('click', function() {updateSelectedView(gameNavButtonArray[i]);});
    }
    
    var genericResourceBtn = document.getElementById('genericResourceBtn');
    genericResourceBtn.addEventListener('click', function() {generateResource();});
    
    initModels();
    updateResourceValues();
});

// Initializes models with content.
function initModels() {
    var resource = 0;
    modelResource['resource'] = resource;
    console.log(modelResource['resource']);
}

// Updates the style on the navbar to show the user they have clicked a new tab.
function updateSelectedView(divBeingSelected) {
    var currentlySelectedDiv = document.getElementsByClassName('selected')[0];
    if (currentlySelectedDiv !== divBeingSelected) {
        document.getElementsByClassName('selected')[0].classList.remove('selected');
        divBeingSelected.classList.add('selected');
    }
}

// Functionality: Iterates the generic 'resource' resource by 1.
//                  Remove later. Merely to test functionality.
function generateResource() {
    modelResource['resource']++;
}

// Functionality: Update page values (resources) on an interval.
function updateResourceValues() {
    if (modelResource['resource'] !== null) {
        document.getElementById('resource-value').innerText = modelResource['resource'];
    }
    console.log(modelResource['resource']);
    window.setTimeout(updateResourceValues, 25);
}