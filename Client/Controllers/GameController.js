var modelResource = {};
var modelResourceRates = {};
var modelResourceVelocity = {};
var modelViews = {};
var modelJobs = {};
var model = {};

$(document).ready(function() {
    initModels();
    
    // Generate list of game nav buttons; add listeners to update view when clicked.
    var gameNavButtonArray = 
        [
            document.getElementById('resourceGenerationNavButton'),
            document.getElementById('manageTownNavButton'),
            document.getElementById('manageJobsNavButton')
        ];
    for (let i = 0; i < gameNavButtonArray.length; i++) {
        gameNavButtonArray[i].addEventListener('click', function() {updateSelectedView(gameNavButtonArray[i]);});
    }
    var addWorkerButtonArray = document.getElementsByClassName('add-worker');
    var removeWorkerButtonArray = document.getElementsByClassName('remove-worker');
    for (let i = 0; i < addWorkerButtonArray.length; i++) {
        addWorkerButtonArray[i].addEventListener('click', function() {
            allocateWorker(addWorkerButtonArray[i]);
        });
        removeWorkerButtonArray[i].addEventListener('click', function() {
            deallocateWorker(removeWorkerButtonArray[i]);
        });
    }
    
    var genericResourceButton = document.getElementById('genericResourceButton');
    genericResourceButton.addEventListener('click', function() {generateResource();});
    
    autosaveTimer();
    updateResourceValues();
});

// Initializes models with content.
function initModels() {
    // Init all resource values to 0.
    modelResource['resource'] = 0;
    modelResource['townspeopleAvailable'] = 1;
    modelResource['townspeopleMax'] = 1;
    modelResource['townspeopleResourceCollector'] = 0;
    // Init all resource generation rates (rate per worker).
    modelResourceRates['resourceCollector'] = 0.5;
    // Retrieve any stored user resource data.
    var storedResourceData = JSON.parse(localStorage.getItem('modelResource'));
    var storedResourceRatesData = JSON.parse(localStorage.getItem('modelResourceRates'));
    var storedJobsData = JSON.parse(localStorage.getItem('modelJobs'));
    // Replace default resource values with saved resource values.
    if (storedResourceData !== null) {
        modelResource['resource'] = storedResourceData['resource'];
        modelResource['townspeopleAvailable'] = storedResourceData['townspeopleAvailable'];
        modelResource['townspeopleMax'] = storedResourceData['townspeopleMax'];
        modelResource['townspeopleResourceCollector'] = storedResourceData['townspeopleResourceCollector'];
    }
    // Replace default resource rate values with saved resource rate values.
    if (storedResourceRatesData !== null) {
        modelResourceRates['resourceCollector'] = storedResourceRatesData['resourceCollector'];
    }
    // Init all resource generation velocities (current rate for the user)
    modelResourceVelocity['resourceCollector'] = 
        modelResourceRates['resourceCollector'] * modelResource['townspeopleResourceCollector'];
    // Init the views model.
    modelViews['resourceGenerationView'] = 
        {
            view: document.getElementById('resourceGenerationView'),
            navButton: document.getElementById('resourceGenerationNavButton')
        };
    modelViews['townView'] = 
        {
            view: document.getElementById('manageTownView'),
            navButton: document.getElementById('manageTownNavButton')
        };
    modelViews['jobsView'] =
        {
            view: document.getElementById('manageJobsView'),
            navButton: document.getElementById('manageJobsNavButton')
        };
    // Init the jobs model.
    modelJobs['resourceCollector'] = 
        {
            id: document.getElementById('jobResourceCollector').id,
            allocateButton: document.getElementById('jobResourceCollector').children[2],
            deallocateButton: document.getElementById('jobResourceCollector').children[3],
        }
}

// Changes the currently-displayed view.
function updateSelectedView(divBeingSelected) {
    // Update which button is currently selected.
    var currentlySelectedDiv = document.getElementsByClassName('selected')[0];
    if (currentlySelectedDiv !== divBeingSelected) {
        document.getElementsByClassName('selected')[0].classList.remove('selected');
        divBeingSelected.classList.add('selected');
    }
    
    /* We iterate over the array in this way since we cannot refer
        to the individual indexes by number (it's a dictionary of sorts). */
    for (let viewObject in modelViews) {
        if (modelViews[viewObject].navButton === divBeingSelected) {
            modelViews[viewObject].view.style = 'display: block;';
        } else {
            modelViews[viewObject].view.style = 'display: none;';
        }
    }
}

// User assigns a job to an available townsperson.
function allocateWorker(addWorkerButton) {
    if (modelResource['townspeopleAvailable'] > 0) {
        var jobId = addWorkerButton.parentElement.id;
        if (jobId === 'jobResourceCollector') {
            modelResource['townspeopleResourceCollector']++;
        }
        modelResource['townspeopleAvailable']--;
        updateResourceVelocity();
    } else {
        // Flashing red effect to let user know they can't add more workers.
        var totalWorkersDisplay = document.getElementById('workerStatsDisplayTotalWorkers');
        totalWorkersDisplay.style = 'color: red;';
        window.setTimeout(function() {
            totalWorkersDisplay.style = 'color: #212529;';
        }, 350);
    }
}

// User takes away a job assigned to an available townsperson (creating an available townsperson).
function deallocateWorker(removeWorkerButton) {
    var jobId = removeWorkerButton.parentElement.id;
    if (jobId === 'jobResourceCollector' && modelResource['townspeopleResourceCollector'] > 0) {
        modelResource['townspeopleResourceCollector']--;
        modelResource['townspeopleAvailable']++;
        updateResourceVelocity();
    } else {
        // Flashing red effect to let user know they can't remove nonexistant workers.
        var totalWorkersDisplay = document.getElementById('workerStatsDisplayTotalWorkers');
        totalWorkersDisplay.style = 'color: red;';
        window.setTimeout(function() {
            totalWorkersDisplay.style = 'color: #212529;';
        }, 350);
    }
}

// Functionality: Iterates the generic 'resource' resource by 1.
//                  Remove later. Merely to test functionality.
function generateResource() {
    modelResource['resource']++;
}

// Initializes the autosave timer to ensure user data persistence.
//                  User data is autosaved every 15 seconds.
function autosaveTimer() {
    localStorage.setItem('modelResource', JSON.stringify(modelResource));
    localStorage.setItem('modelResourceRates', JSON.stringify(modelResourceRates));
    localStorage.setItem('modelJobs', JSON.stringify(modelJobs));
    window.setTimeout(autosaveTimer, 15000);
}

function updateResourceVelocity() {
    modelResourceVelocity['resourceCollector'] = 
        modelResource['townspeopleResourceCollector'] * modelResourceRates['resourceCollector'];
}

// Functionality: Update page-displayed resource values on an interval.
function updateResourceValues() {
    calculateResourceValuePerTick();
    resourceName = document.getElementById('resource-name');
    if (modelResourceVelocity['resourceCollector'] > 0) {
        resourceName.innerText = 'Resource (+' + modelResourceVelocity['resourceCollector'].toFixed(1) + ')';
    } else if (modelResourceVelocity < 0) {
        resourceName.innerText = 
            'Resource (' + modelResourceVelocity['resourceCollector'].toFixed(1) + ')';
    } else {
        resourceName.innerText = 'Resource';
    }
    document.getElementById('resource-value').innerText = modelResource['resource'].toFixed(2);
    document.getElementById('num-workers').innerText = 
        (modelResource['townspeopleMax'] - modelResource['townspeopleAvailable']) + 
        '/' + modelResource['townspeopleMax'];
    document.getElementById('numWorkersResourceCollector').innerText = modelResource['townspeopleResourceCollector'];
    window.setTimeout(updateResourceValues, 50);
}

// Update the actual values of resources.
function calculateResourceValuePerTick() {
    //Ticks are 20 times a second, or every .05s, thus the magic number .05.
    modelResource['resource'] += modelResourceVelocity['resourceCollector']*.05;
}