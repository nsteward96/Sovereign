var modelResource = {};
var model = {};

$(document).ready(function() {
    // Generate list of game nav buttons; add listeners to update view when clicked.
    var gameNavButtonArray = [
                                document.getElementById('resourceGenerationNavBtn'),
                                document.getElementById('manageTownNavBtn')
                              ];
    for (let i = 0; i < gameNavButtonArray.length; i++) {
        gameNavButtonArray[i].addEventListener('click', function() {updateSelectedView(gameNavButtonArray[i]);});
    }
    
    var genericResourceBtn = document.getElementById('genericResourceBtn');
    genericResourceBtn.addEventListener('click', function() {generateResource();});
    
    initModels();
    autosaveTimer();
    updateResourceValues();
});

// Changes the currently-displayed view.
function updateSelectedView(divBeingSelected) {
    // Update which button is currently selected.
    var currentlySelectedDiv = document.getElementsByClassName('selected')[0];
    if (currentlySelectedDiv !== divBeingSelected) {
        document.getElementsByClassName('selected')[0].classList.remove('selected');
        divBeingSelected.classList.add('selected');
    }
    // Hide all views
    var viewDivs = document.getElementsByClassName('view');
    for (let i = 0; i < viewDivs.length; i++) {
        viewDivs[i].style = 'display: none;';
    }
    // Display the correct view
    if (divBeingSelected.id === 'resourceGenerationNavBtn') {
        document.getElementById('resourceGenerationView').style = 'display: block;';
    } else if (divBeingSelected.id === 'manageTownNavBtn') {
        document.getElementById('manageTownView').style = 'display: block;';
    }
}

// Functionality: Iterates the generic 'resource' resource by 1.
//                  Remove later. Merely to test functionality.
function generateResource() {
    modelResource['resource']++;
}

// Initializes models with content.
function initModels() {
    // Init all resource values to 0.
    modelResource['resource'] = 0;
    
    // Retrieve any stored user resource data.
    var storedResourceData = JSON.parse(localStorage.getItem('resourceData'));
    
    // Replace default resource values with saved resource values if applicable.
    if(storedResourceData !== null) {
        if (storedResourceData['resource']) {
            modelResource['resource'] = storedResourceData['resource'];
        } 
    }
}

// Initializes the autosave timer to ensure user data persistence.
//                  User data is autosaved every 15 seconds.
function autosaveTimer() {
    localStorage.setItem('resourceData', JSON.stringify(modelResource));
    window.setTimeout(autosaveTimer, 15000);
}

// Functionality: Update page values (resources) on an interval.
function updateResourceValues() {
    if (modelResource['resource'] !== null) {
        document.getElementById('resource-value').innerText = modelResource['resource'];
    }
    window.setTimeout(updateResourceValues, 50);
}