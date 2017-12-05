var modelResource = {};
var modelResourceRates = {};
var modelResourceVelocity = {};
var modelViews = {};
var modelJobs = {};
var modelBuildings = {};
var model = {};

$(document).ready(function() {
    initModels();
    printIntroductoryMessage();
    
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
    var buyBuildingButtonArray = document.getElementsByClassName('buy-building');
    for (let i = 0; i < buyBuildingButtonArray.length; i++) {
        buyBuildingButtonArray[i].addEventListener('click', function() {
            buyBuilding(buyBuildingButtonArray[i]);
        });
    }
    
    var genericResourceButton = document.getElementById('genericResourceButton');
    genericResourceButton.addEventListener('click', function() {generateResource();});
    
    autosaveTimer();
    townspeopleArrivalTimer();
    updateResourceValues();
});

// Initializes models with content.
function initModels() {
    // Init all resource values to 0.
    modelResource['resource'] = 0;
    modelResource['townspeopleAvailable'] = 0;
    modelResource['townspeopleAlive'] = 0;
    modelResource['townspeopleMax'] = 0;
    modelResource['townspeopleResourceCollector'] = 0;
    modelResource['smallHousesOwned'] = 0;
    // Init all resource generation rates (rate per worker).
    modelResourceRates['resourceCollector'] = 0.5; // Resource generated per Resource collector
    modelResourceRates['incrementalGrowthRateBuildings'] = 1.15; // Cost increase per building
    modelResourceRates['smallHouse'] = 2; // Increase of max residents per house
    // Retrieve any stored user resource data.
    var storedResourceData = JSON.parse(localStorage.getItem('modelResource'));
    var storedResourceRatesData = JSON.parse(localStorage.getItem('modelResourceRates'));
    // Replace default resource values with saved resource values.
    if (storedResourceData !== null) {
        modelResource['resource'] = storedResourceData['resource'];
        modelResource['townspeopleAvailable'] = storedResourceData['townspeopleAvailable'];
        modelResource['townspeopleAlive'] = storedResourceData['townspeopleAlive'];
        modelResource['townspeopleMax'] = storedResourceData['townspeopleMax'];
        modelResource['townspeopleResourceCollector'] = storedResourceData['townspeopleResourceCollector'];
        modelResource['smallHousesOwned'] = storedResourceData['smallHousesOwned'];
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
            deallocateButton: document.getElementById('jobResourceCollector').children[3]
        }
    // Init the buildings model.
    modelBuildings['smallHouse'] = 
        {
            id: document.getElementById('buildingSmallHouse').id,
            basePrice: 50,
            price: determineCurrentPriceBuilding(50, modelResource['smallHousesOwned']),
            buyButton: document.getElementById('buildingSmallHouseBuyButton'),
            sellButton: document.getElementById('buildingSmallHouseSellButton')
        }
    // Init the flavor text area view.
    var flavorTextArea = document.getElementById('flavorTextArea');
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

// User buys a building
function buyBuilding(buyBuildingButton) {
    var buildingId = buyBuildingButton.parentElement.id;
    for (let building in modelBuildings) {
        if (modelBuildings[building].id === buildingId && modelBuildings[building].price <= modelResource['resource']) {
            modelResource['resource'] -= modelBuildings[building].price;
            modelResource['smallHousesOwned']++;
            modelBuildings[building].price = 
                determineCurrentPriceBuilding(modelBuildings[building].basePrice, modelResource['smallHousesOwned']);
            updateMaxResources();
        }
    }
}

// User sells a building - currently put aside, complications with townspeople

// function sellBuilding(sellBuildingButton) {
//     var buildingId = sellBuildingButton.parentElement.id;
//     if (buildingId === 'buildingSmallHouse' && modelResource['smallHousesOwned'] > 0) {
//         modelResource['resource'] += ((1/2)*modelBuildings['smallHouse'].price*.87);
//         modelResource['smallHousesOwned']--;
//         modelBuildings['smallHouse'].price = determineCurrentPriceBuilding(modelBuildings['smallHouse'], modelResource['smallHousesOwned']);
//     }
// }

// Returns the current price of a building.
function determineCurrentPriceBuilding(basePrice, numOwned) {
    var finalPrice = basePrice;
    for (let i = 0; i < numOwned; i++) {
        finalPrice *= modelResourceRates['incrementalGrowthRateBuildings'];
    }
    return finalPrice;
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
    window.setTimeout(autosaveTimer, 15000);
}

// Initializes a timer that will result in new townspeople arriving in town.
function townspeopleArrivalTimer() {
    if (modelResource['townspeopleAlive'] < modelResource['townspeopleMax']) {
        var incomingTownspeople = Math.round(Math.random() * 3);
        if (modelResource['townspeopleAlive'] + incomingTownspeople > modelResource['townspeopleMax']) {
            incomingTownspeople = modelResource['townspeopleMax'] - modelResource['townspeopleAlive'];
        }
        var randomChanceMessage = Math.random();
        if (incomingTownspeople === 1) {
            if (Math.ceil(randomChanceMessage*4) === 1) {
                outputToFlavorTextArea('A young lad, barely a man, approaches. He asks if he can work ' + 
                    'in exchange for a place to call "home".');
            } else if (Math.ceil(randomChanceMessage*4) === 2) {
                outputToFlavorTextArea('An older gentleman saunters into view. He smiles at the sight ' + 
                    'of friendly faces. He offers his services in exchange for shelter.');
            } else if (Math.ceil(randomChanceMessage*4) === 3) {
                outputToFlavorTextArea('A young woman strides towards the camp. She\'s been exploring the ' + 
                    'area and now seeks respite.');
            } else if (Math.ceil(randomChanceMessage*4) === 4) {
                outputToFlavorTextArea('An older woman, seasoned by hard times, shuffles towards you. ' +
                    'She offers her wisdom and experience in exchange for safety.');
            }
        } else if (incomingTownspeople === 2) {
            if (Math.ceil(randomChanceMessage*3) === 1) {
                outputToFlavorTextArea('A weathered gentleman and his son venture into your camp. ' + 
                'He desires shelter for himself and his boy, offering honest work.');
            } else if (Math.ceil(randomChanceMessage*3) === 2) {
                outputToFlavorTextArea('A woman and her daughter approach. They seek respite from ' + 
                    'the elements, and know some invaluable trade skills.');
            } else if (Math.ceil(randomChanceMessage*3) === 3) {
                outputToFlavorTextArea('A woman and her son approach. The woman is tired, and requires ' + 
                'some medical attention. With some time, they prove to be valuable allies.');
            }
        } else if (incomingTownspeople === 3) {
            if (Math.ceil(randomChanceMessage*3) === 1) {
                outputToFlavorTextArea('A man, woman, and their daughter race into town. ' + 
                    'They discovered some raging wildlife and ran for the last mile or so. ' + 
                    'After they catch their breath, you point them to an unfilled house and they ' + 
                    'offer their abilities with gratitude.');
            } else if (Math.ceil(randomChanceMessage*3) === 2) {
                outputToFlavorTextArea('Three women come into town without a word. ' + 
                    'Despite your prying, they do not say a word. But they do take up ' + 
                    'residence in one of your open homes, and willingly accept work.');
            } else if (Math.ceil(randomChanceMessage*3) === 3) {
                outputToFlavorTextArea('Three men stride into town, seeking work. ' + 
                    '\'If anything needs lifting, just call us!\' Good labor is always ' + 
                    'welcome to come by.');
            }
        }
        modelResource['townspeopleAlive'] += incomingTownspeople;
        modelResource['townspeopleAvailable'] += incomingTownspeople;
    }
    window.setTimeout(townspeopleArrivalTimer, 12500);
}

function updateResourceVelocity() {
    modelResourceVelocity['resourceCollector'] = 
        modelResource['townspeopleResourceCollector'] * modelResourceRates['resourceCollector'];
}

function updateMaxResources() {
    modelResource['townspeopleMax'] = modelResource['smallHousesOwned'] * modelResourceRates['smallHouse'];
}

// Functionality: Update page-displayed resource values on an interval.
function updateResourceValues() {
    calculateResourceValuePerTick();
    resourceName = document.getElementById('resource-name');
    if (modelResourceVelocity['resourceCollector'] > 0) {
        resourceName.innerText = 'Resource (+' + formatNumberToSignificantValue(modelResourceVelocity['resourceCollector']) + ')';
    } else if (modelResourceVelocity < 0) {
        resourceName.innerText = 
            'Resource (' + formatNumberToSignificantValue(modelResourceVelocity['resourceCollector']) + ')';
    } else {
        resourceName.innerText = 'Resource';
    }
    document.getElementById('resource-value').innerText = formatNumberToSignificantValue(modelResource['resource']);
    document.getElementById('maxNumTownspeople').innerText = modelResource['townspeopleMax'];
    document.getElementById('numWorkers').innerText = modelResource['townspeopleAvailable'] + '/' 
        + modelResource['townspeopleAlive'];
    document.getElementById('numWorkersResourceCollector').innerText = modelResource['townspeopleResourceCollector'];
    document.getElementById('numOwnedSmallHouses').innerText = modelResource['smallHousesOwned'];
    window.setTimeout(updateResourceValues, 50);
}

// Update the actual values of resources.
function calculateResourceValuePerTick() {
    //Ticks are 20 times a second, or every .05s, thus the magic number .05.
    modelResource['resource'] += modelResourceVelocity['resourceCollector']*.05;
}

// Output text to the flavor text area.
function outputToFlavorTextArea(text) {
    var message = document.createElement('div');
    message.classList = 'flavor-text-area-message';
    var messageContent = document.createElement('p');
    messageContent.innerText = text;
    var messageBorderBottom = document.createElement('div');
    messageBorderBottom.classList = 'flavor-text-area-message-border-bottom';
    message.appendChild(messageContent);
    message.appendChild(messageBorderBottom);
    $(flavorTextArea).prepend(message);
    var messageJustAppended = flavorTextArea.childNodes[0];
    $(messageJustAppended).fadeIn(350);
}

// Print some flavor text to the console when the user starts a new session.
function printIntroductoryMessage() {
    if (modelResource['smallHousesOwned'] === 0) {
        outputToFlavorTextArea('You awaken in a grassy field. Foggy and forgetful of your origins, you wonder what to do. ' + 
            'Shelter is unseen in a couple mile radius. You should probably collect some resources and fashion yourself ' + 
            'a form of safety, such as a small hut.');
    } else if (modelResource['smallHousesOwned'] > 0 && modelResource['smallHousesOwned'] < 15) {
        outputToFlavorTextArea('You are surrounded by a small community. Some describe the land as one previously inhabited ' + 
            'by a prosperous kingdom. However, there are no consistent answers of how it fell.');
    }
}