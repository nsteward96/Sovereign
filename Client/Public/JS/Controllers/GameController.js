/*global TooltipBuilder*/
/*global formatNumberToSignificantValue*/
/*global io*/
/*global $*/
/*global localStorage*/
var modelResource = {};
var modelResourceRates = {};
var modelViews = {};
var modelJobs = {};
var modelBuildings = {};
var modelUpgrades = {};
var modelGameProgress = {};
var socket;
var username = 'New User';
var game_password = '';
var is_host = true;
var is_in_a_server = false;

$(document).ready(function() {
    // Setup socket - connection to server (Do not move this from the document ready)
    socket = io('https://sovereign-nathansteward.c9users.io');

    initModels();
    populateTitleList();
    
    printIntroductoryMessage();
    
    setupDynamicEventListeners();
    setupStaticEventListeners();
    setupServerEmitListeners();
    
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
    var storedUsername = JSON.parse(localStorage.getItem('username'));
    var storedResourceRatesData = JSON.parse(localStorage.getItem('modelResourceRates'));
    var storedGameProgressData = JSON.parse(localStorage.getItem('modelGameProgress'));

    // Replace default values with saved resource values.
    if (storedResourceData !== null) {
        modelResource['resource'] = storedResourceData['resource'];
        modelResource['townspeopleAvailable'] = storedResourceData['townspeopleAvailable'];
        modelResource['townspeopleAlive'] = storedResourceData['townspeopleAlive'];
        modelResource['townspeopleMax'] = storedResourceData['townspeopleMax'];
        modelResource['townspeopleResourceCollector'] = storedResourceData['townspeopleResourceCollector'];
        modelResource['smallHousesOwned'] = storedResourceData['smallHousesOwned'];
    }
    if (storedUsername !== null) {
        username = storedUsername;
        socket.emit('set_username', { new_username: storedUsername });
    } else {
        revealOverlay('enterUsername');
    }
    if (storedResourceRatesData !== null) {
        modelResourceRates['resourceCollector'] = storedResourceRatesData['resourceCollector'];
        modelResourceRates['smallHouse'] = storedResourceRatesData['smallHouse'];
    }
    
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
    modelViews['upgradesView'] = 
        {
            view: document.getElementById('manageUpgradesView'),
            navButton: document.getElementById('manageUpgradesNavButton')
        };
    modelViews['jobsView'] =
        {
            view: document.getElementById('manageJobsView'),
            navButton: document.getElementById('manageJobsNavButton')
        };
    // Init the jobs model.
    modelJobs['resourceCollector'] = 
        {
            id: 'jobResourceCollector',
            resourceType: ['resource'],
            velocity: {'resource': modelResourceRates['resourceCollector'] * modelResource['townspeopleResourceCollector']},
            allocateButtonId: 'resourceCollectorAddWorker',
            deallocateButtonId: 'resourceCollectorRemoveWorker'
        };
    // Init the buildings model.
    modelBuildings['smallHouse'] = 
        {
            id: 'buildingSmallHouse',
            basePrice: {'resource': 50},
            resourceType: ['resource'],
            price: determineCurrentPriceBuilding({'resource': 50}, modelResource['smallHousesOwned']),
            buyButtonId: 'buildingSmallHouseBuyButton',
            sellButtonId: 'buildingSmallHouseSellButton'
        };

    initModelGameProgress(storedGameProgressData);
    initModelUpgrades();

    createTooltips();
}

// Inits the player's current progress in the game, altering what they can see.
function initModelGameProgress(gameProgress) {
    gameProgress = gameProgress || false;
    
    for (let progressModel in modelGameProgress) {
        for (let i = 0; i < modelGameProgress[progressModel].elementIds.length; i++) {
            document.getElementById(modelGameProgress[progressModel].elementIds[i]).style = 'display: none;';
        }
    }

    if (gameProgress) {
        modelGameProgress = gameProgress;
        for (let progressModel in modelGameProgress) {
            if (modelGameProgress[progressModel].activated === true) {
                for (let i = 0; i < modelGameProgress[progressModel].elementIds.length; i++) {
                    document.getElementById(modelGameProgress[progressModel].elementIds[i]).style = 'display: inline-block;';
                }
            }
        }
    } else {
        modelGameProgress['displayBuildings'] = {
            activated: false,
            elementIds: ['manageTownNavButton', 'upgradeSmallHouse']
        };
        modelGameProgress['displayUpgrades'] = {
            activated: false,
            elementIds: ['manageUpgradesNavButton']
        };
        modelGameProgress['displayJobs'] = {
            activated: false,
            elementIds: ['manageJobsNavButton', 'upgradeResourceCollector']
        };
    }

    if ($('.selected.btn')[0].offsetHeight === 0) {
        updateSelectedView(document.getElementById('resourceGenerationNavButton'));
    }
}

// Init the upgrades model.
function initModelUpgrades(data) {
    data = data || false;
    destroyUpgrades();

    var createUpgrade = function(elementToAppendTo, className, id) {
        var element = document.createElement('div');
        element.className = className;
        element.id = id;
        elementToAppendTo.appendChild(element);
    };
    
    var storedModelUpgrades = null;
    if (is_host) {
        storedModelUpgrades = JSON.parse(localStorage.getItem('modelUpgrades'));
    } else if (data !== false) {
        storedModelUpgrades = data;
    }

    if (storedModelUpgrades !== null) {
        modelUpgrades['smallHouse'] = storedModelUpgrades['smallHouse'];
        modelUpgrades['resourceCollector'] = storedModelUpgrades['resourceCollector'];
    } else {
        modelUpgrades['smallHouse'] =
            {
                reinforcedHousing:
                    {
                        containerId: 'upgradeSmallHouse',
                        titleId: 'upgradeContainerTitleSmallHouse',
                        parentId: 'upgradeListBoxSmallHouse',
                        buyButtonId: 'upgradeDisplayBoxReinforcedHousing',
                        purchasedId: 'upgradesPurchasedDisplayBoxReinforcedHousing',
                        purchasedContainerId: 'upgradesPurchasedListBoxSmallHouse',
                        purchasedContainerParentId: 'upgradesPurchasedSmallHouse',
                        price: {'resource': 200},
                        purchased: false
                    }
            };
        modelUpgrades['resourceCollector'] = 
            {
                agriculturalEducation:
                    {
                        containerId: 'upgradeResourceCollector',
                        titleId: 'upgradeContainerTitleResourceCollector',
                        parentId: 'upgradeListBoxResourceCollector',
                        buyButtonId: 'upgradeDisplayBoxAgriculturalEducation',
                        purchasedId: 'upgradesPurchasedDisplayBoxAgriculturalEducation',
                        purchasedContainerId: 'upgradesPurchasedListBoxResourceCollector',
                        purchasedContainerParentId: 'upgradesPurchasedResourceCollector',
                        price: {'resource': 500},
                        purchased: false
                    }
            };
    }
    for (let modelCategory in modelUpgrades) {
        for (let model in modelUpgrades[modelCategory]) {
            var elementParent = document.getElementById(modelUpgrades[modelCategory][model]['parentId']);
            createUpgrade(elementParent, 'upgrade-display-box', modelUpgrades[modelCategory][model]['buyButtonId']);
            document.getElementById(modelUpgrades[modelCategory][model]['containerId']).style = 'display: block;';
            if (modelUpgrades[modelCategory][model]['purchased']) {
                removeUpgrade(modelUpgrades[modelCategory][model]);
            }
        }
    }
    updateNoUpgradesAvailableDisplay();
    
    setupUpgradeEventListeners();
}

// Gets rid of all upgrade elements in each category.
function destroyUpgrades() {
    $('.upgrade-display-box').remove();
    $('.upgrade-container').hide();
    $('.upgrades-purchased-container').hide();
}

// Displays the 'no upgrades available' div, or hides it, based on if upgrades are available for purchase.
function updateNoUpgradesAvailableDisplay() {
    var upgradesContainers = $('.upgrade-container');
    var hasUpgradesAvailable = true;
    for (let i = 0; i < upgradesContainers.length; i++) {
        if (upgradesContainers[i].style.display === 'block') {
            hasUpgradesAvailable = false;
        }
    }
    if (hasUpgradesAvailable) {
        $(document.getElementById('noUpgradesAvailableContainer')).fadeIn(300);
    } else {
        document.getElementById('noUpgradesAvailableContainer').style = 'display: none;';
    }   
}

function revealOverlay(id) {
    var overlayContainer = document.getElementById('overlayContainer');
    var overlayContainerChildren = overlayContainer.children;
    for (var i = 0; i < overlayContainerChildren.length; i++) {
        overlayContainerChildren[i].classList.remove('selected');
        overlayContainerChildren[i].style = 'display: none;';
    }
    var selectedDiv = document.getElementById(id);
    selectedDiv.classList.add('selected');
    selectedDiv.style = 'display: block;';
    overlayContainer.style = 'display: block;';
}

// Returns the current price of a building.
function determineCurrentPriceBuilding(basePrice, numOwned) {
    var finalPrice = {};
    for (let resourceType in basePrice) {
        finalPrice[resourceType] = basePrice[resourceType];
    }
    for (let i = 0; i < numOwned; i++) {
        for (let resourceType in finalPrice) {
            finalPrice[resourceType] *= modelResourceRates['incrementalGrowthRateBuildings'];
        }
    }
    return finalPrice;
}

// Creates the tooltips for the game.
function createTooltips() {
    $('.tooltip-container').remove();
    var createSmallHouseBuyButtonTooltip = function() {
        var price = {};
        for (let resourceType in modelBuildings['smallHouse']['price']) {
            price[resourceType] = modelBuildings['smallHouse']['price'][resourceType];
        }
        var hashOptions = {
            'title': 'Small shack',
            'description': 'A humble shelter for the weary. It is small and cramped, but it\'s better than the Wilds.',
            'effects': '<div class="tooltip-effects">Provides a space for <span id="smallHouseBuyTooltipEffects">'+modelResourceRates['smallHouse']+'</span> townspeople to live in.</div>',
            'buyprice': price
        };
        document.getElementById(modelBuildings['smallHouse']['buyButtonId']).appendChild(TooltipBuilder(hashOptions));
    };
    var createSmallHouseSellButtonTooltip = function() {
        var sellprice = {};
        for (let resourceType in modelBuildings['smallHouse']['price']) {
            sellprice[resourceType] = ((modelBuildings['smallHouse']['price'][resourceType]) / 1.15) * .75;
        }
        var hashOptions = {
            'title': 'Small shack',
            'description': 'A humble shelter for the weary. It is small and cramped, but it\'s better than the Wilds.',
            'effects': '<div class="tooltip-effects">Sell a shack. Must have <span id="smallHouseSellTooltipEffects">'+modelResourceRates['smallHouse']+'</span> available (unemployed) townspeople in order to sell.</div>',
            'sellprice': sellprice
        };
        document.getElementById(modelBuildings['smallHouse']['sellButtonId']).appendChild(TooltipBuilder(hashOptions));
    };
    var createResourceCollectorAllocateTooltip = function() {
        var hashOptions = {
            'title': 'Resource collector',
            'description': 'More resources for the lord!',
            'effects': '<div class="tooltip-effects">Each worker gives <span id="resourceCollectorAllocateTooltipEffects">'+modelResourceRates['resourceCollector']+'</span> resources a second</div>',
            'workervelocity': modelJobs['resourceCollector']['velocity']
        };
        document.getElementById(modelJobs['resourceCollector']['allocateButtonId']).appendChild(TooltipBuilder(hashOptions));
    };
    var createResourceCollectorDeallocateTooltip = function() {
        var hashOptions = {
            'title': 'Resource collector',
            'description': 'More resources for the lord!',
            'effects': '<div class="tooltip-effects">Each worker gives <span id="resourceCollectorDeallocateTooltipEffects">'+modelResourceRates['resourceCollector']+'</span> resources a second</div>',
            'workervelocity': modelJobs['resourceCollector']['velocity']
        };
        document.getElementById(modelJobs['resourceCollector']['deallocateButtonId']).appendChild(TooltipBuilder(hashOptions));
    };
    if (document.getElementById(modelUpgrades['resourceCollector']['agriculturalEducation']['buyButtonId']) !== null) {
        var createUpgradeAgriculturalEducationTooltip = function() {
            var hashOptions = {
                'title': 'Agricultural Education',
                'description': 'Give your settlers a few tips on effective farming methods.',
                'effects': '<div class="tooltip-effects">Increases gather rate by 0.5 resources per second.</div>',
                'buyprice': modelUpgrades['resourceCollector']['agriculturalEducation']['price']
            };
            document.getElementById(modelUpgrades['resourceCollector']['agriculturalEducation']['buyButtonId']).appendChild(TooltipBuilder(hashOptions));
        };
        createUpgradeAgriculturalEducationTooltip();
    }
    if (document.getElementById(modelUpgrades['smallHouse']['reinforcedHousing']['buyButtonId']) !== null) {
        var createUpgradeReinforcedHousingTooltip = function() {
            var hashOptions = {
                'title': 'Reinforced Housing',
                'description': 'Improves the structural integrity of your shacks. Also, conveniently adds just enough room for another resident!',
                'effects': '<div class="tooltip-effects">Adds +1 max townspeople per Small Shack</div>',
                'buyprice': modelUpgrades['smallHouse']['reinforcedHousing']['price']
            };
            document.getElementById(modelUpgrades['smallHouse']['reinforcedHousing']['buyButtonId']).appendChild(TooltipBuilder(hashOptions));
        };
        createUpgradeReinforcedHousingTooltip();
    }

    createSmallHouseBuyButtonTooltip();
    createSmallHouseSellButtonTooltip();
    createResourceCollectorAllocateTooltip();
    createResourceCollectorDeallocateTooltip();
    
    setupTooltipEventListeners();
}

// Sets up the event listeners to display and hide the tooltips.
function setupTooltipEventListeners() {
    var displayTooltip = function(tooltip) {
        return function() {
            tooltip.style = 'display: block;';
        };
    };

    var hideTooltip = function(tooltip) {
        return function() {
            tooltip.style = 'display: none;';
        };
    };
    
    var tooltips = document.getElementsByClassName('tooltip-container');
    for (let i = 0; i < tooltips.length; i++) {
        tooltips[i].parentElement.removeEventListener('mouseenter', displayTooltip(tooltips[i]));
        tooltips[i].parentElement.addEventListener('mouseenter', displayTooltip(tooltips[i]));
        tooltips[i].parentElement.removeEventListener('mouseout', hideTooltip(tooltips[i]));
        tooltips[i].parentElement.addEventListener('mouseout', hideTooltip(tooltips[i]));
    }
}

// Sets up the list of titles that a user can select from in the name-setup process.
function populateTitleList() {
    var titleList = [
        'the Absolute', 'the Anarchist', 'the Antsy', 'the Archivist', 'the Archon',
        'the Beautiful', 'the Bold', 'the Bookworm', 'the Brash', 'the Carver', 'the Charmer',
        'the Clarity', 'the Corrupter', 'the Cracked', 'the Crazed', 'the Creator', 'the Cretin',
        'the Dank', 'the Dark', 'the Dear', 'of the Deep', 'the Deranged', 'the Desperate',
        'the Destructor', 'the Determined', 'the Dirk', 'the Doombringer', 'the Doppleganger',
        'the Dude', 'the Duke', 'the Dumb', 'the Eager', 'the Eccentric', 'the Einstein',
        'the Energetic', 'the Entertainer', 'the Extreme',
        'the Expert', 'the Fair', 'the Fancy', 'the Fence', 'the Fickle', 
        'the Fiddler', 'the Fine', 'the Fake', 'the Gambler', 'the Gatsby', 
        'the Gorgeous', 'the Great', 'the Green', 'the Grey', 'the Hated', 'the Hatred', 
        'the Hack', 'the Heckler', 'the Herring', 'the Horrible', 'the Hunter', 
        'the Idle', 'the Insane', 'the Jack', 'the Joker', 'the Joe', 
        'the Kaiser', 'the Kid', 'the King', 'the Knack', 'the Linguist', 
        'the Listener', 'the Little', 'the Lamb', 'the Manly', 'the Master', 
        'the Mean', 'the Meek', 'the Mentor', 'the Misanthrope', 'the Miserly', 
        'the Minx', 'the Mook', 'the Moxie', 'the Named', 'the Nameless', 
        'the Natty', 'the Naughty', 'of the Nether', 'the Needler', 'the Odd', 
        'the Opponent', 'the Opportunist', 'the Philanthropist', 'the Pig', 
        'the Poor', 'the Pretty', 'the Queen', 'the Queasy', 'the Ranger', 
        'the Rapper', 'the Red', 'the Regular', 'the Ridiculous', 
        'the Rude', 'the Runt', 'the Rustler', 'the Spawn', 
        'the Strange', 'the Swan', 'the Thorn', 'the Tormentor', 
        'the Traitor', 'the Trite', 'the Underhanded', 'the Untamed', 
        'the Viper', 'the Vixen', 'the Wanted', 'the Witty', 'the Yapper', 'the Zealous'
    ];
    var titleOptionContainer = document.getElementById('usernameTitles');
    for (var i = 0; i < titleList.length; i++) {
        var optionObject = document.createElement('option');
        optionObject.setAttribute('value', titleList[i]);
        optionObject.innerText = titleList[i];
        titleOptionContainer.appendChild(optionObject);
    }
    randomizeSelectedTitle();
}

function randomizeSelectedTitle() {
    var usernameTitles = document.getElementById('usernameTitles');
    var options = $(usernameTitles).find('option');
    var randomId = Math.floor(Math.random() * options.length);
    
    $(options).filter(':selected').removeAttr('selected');
    options[randomId].setAttribute('selected', true);
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

// Output text to the flavor text area.
function outputToFlavorTextArea(text) {
    if (is_host && is_in_a_server) {
        socket.emit('host_broadcast_output_to_flavor_text_area', text);
    }
    var flavorTextArea = document.getElementById('flavorTextArea');
    var message = document.createElement('div');
    message.classList = 'flavor-text-area-message';
    var messageContent = document.createElement('p');
    messageContent.innerText = text;
    
    // Adds highlighting to new message; removed when user hovers over it.
    // User can enable/disable this feature in options in a future update.
    $(messageContent).addClass('flavor-text-area-message-new');
    messageContent.addEventListener('mouseover', function removeHighlight() {
        $(messageContent).switchClass('flavor-text-area-message-new', 'flavor-text-area-message-old', 200);
        messageContent.removeEventListener('mouseover', removeHighlight);
    });
    
    message.appendChild(messageContent);
    $(flavorTextArea).prepend(message);
    var messageJustAppended = flavorTextArea.childNodes[0];
    $(messageJustAppended).fadeIn(350);
}

// Event listeners that need to be dynamic - they operate differently based on
// whether or not the user is in a server with another player.
function setupDynamicEventListeners() {
    for (let key in modelJobs) {
        document.getElementById(modelJobs[key]['allocateButtonId']).addEventListener('click', function() {
            if (is_host) {
                allocateWorker(modelJobs[key]);
            } else {
                socket.emit('allocate_worker', modelJobs[key]);
            }
        });
        document.getElementById(modelJobs[key]['deallocateButtonId']).addEventListener('click', function() {
            if (is_host) {
                deallocateWorker(modelJobs[key]);
            } else {
                socket.emit('deallocate_worker', modelJobs[key]);
            }
        });
    }
    for (let key in modelBuildings) {
        document.getElementById(modelBuildings[key]['buyButtonId']).addEventListener('click', function() {
            if (is_host) {
                buyBuilding(modelBuildings[key]);
            } else {
                socket.emit('buy_building', modelBuildings[key]);
            }
        });
        document.getElementById(modelBuildings[key]['sellButtonId']).addEventListener('click', function() {
            if (is_host) {
                sellBuilding(modelBuildings[key]);
            } else {
                socket.emit('sell_building', modelBuildings[key]);
            }
        });
    }

    var genericResourceButton = document.getElementById('genericResourceButton');
    genericResourceButton.addEventListener('click', function() {
        if (is_host) {
            generateResource();
        } else {
            socket.emit('generate_resource');
        }
    });
    
    // Listener to check if user clicks 'send' button on chat
    var sendMessageButton = document.getElementById('submitChatText');
    sendMessageButton.addEventListener('click', function() {
        var messageField = document.getElementById('chatboxTextField');
        var message;
        if (is_in_a_server) {
            message = { username: username, message: messageField.value };
            socket.emit('chat_message', message);
        } else {
            message = 'Nobody else is here!';
            createChatMessage(message);
        }
        messageField.value = '';
    });
    
    // User submits a game password in the menu to set game password
    var setGamePasswordSubmitButton = document.getElementById('setGamePasswordSubmit');
    var setGamePasswordField = document.getElementById('setGamePasswordField');
    setGamePasswordSubmitButton.addEventListener('click', function() {
        if (game_password != setGamePasswordField.value) {
            game_password = setGamePasswordField.value;
            joinGameSession(game_password);
            hideOverlay();
        } else {
            outputErrorMessageToErrorDisplay('You are already in that server!', 'red');
            console.log('You are already in that server!');
        }
    });
    
    // User clicks the reset game password button
    var resetGamePasswordButton = document.getElementById('resetGamePassword');
    resetGamePasswordButton.addEventListener('click', function() {
        if (is_in_a_server) {
            leaveGameSession();
            is_in_a_server = false;
            game_password = '';
        } else {
            outputErrorMessageToErrorDisplay('You don\'t have a password set!', 'red');
            console.log('You don\'t have a password set!');   
        }
    });
    
    var resetGameButton = document.getElementById('resetGameButton');
    resetGameButton.addEventListener('click', function() {
        if (is_in_a_server) {
            outputErrorMessageToErrorDisplay('Please leave the game server if you wish to reset your game.', 'orange');
            console.log('Please leave the game server if you wish to reset your game.');
        } else {
            revealOverlay('resetGameConfirmationContainer');
        }
    });
    
    var resetGameConfirmationButton = document.getElementById('resetGameConfirmationButton');
    resetGameConfirmationButton.addEventListener('click', function() {
        if (is_in_a_server) {
            outputErrorMessageToErrorDisplay('Please leave the game server if you wish to reset your game.', 'orange');
            console.log('Please leave the game server if you wish to reset your game.');
        } else {
            eraseGameProgress();
        }
    });
}

// User assigns a job to an available townsperson.
function allocateWorker(worker) {
    if (modelResource['townspeopleAvailable'] > 0) {
        if (worker['id'] === 'jobResourceCollector') {
            modelResource['townspeopleResourceCollector']++;
            modelResource['townspeopleAvailable']--;
            updateResourceVelocity();
        }
    } else {
        // Flashing red effect to let user know they can't add more workers.
        var totalWorkersDisplay = document.getElementById('workerStatsDisplayTotalWorkers');
        totalWorkersDisplay.style = 'color: red;';
        window.setTimeout(function() {
            totalWorkersDisplay.style = 'color: #212529;';
        }, 350);
    }
}

// Updates the rate at which resources are added to your total.
function updateResourceVelocity() {
    modelJobs['resourceCollector']['velocity'] = 
        {'resource': modelResource['townspeopleResourceCollector'] * modelResourceRates['resourceCollector']};
    updateTooltipWorkerVelocity(modelJobs['resourceCollector']);
    socket.emit('update_resource_velocity', modelJobs['resourceCollector']);
}

// Updates the tooltip for workers telling you how much they make per second.
function updateTooltipWorkerVelocity(worker) {
    var tooltips = 
        [
            document.getElementById(worker['allocateButtonId']).children[0], 
            document.getElementById(worker['deallocateButtonId']).children[0]
        ];
    var tooltipVelocities = 
        [
            $(tooltips[0]).find('.tooltip-worker-velocity')[0], 
            $(tooltips[1]).find('.tooltip-worker-velocity')[0]
        ];

    for (let i = 0; i < tooltipVelocities.length; i++) {
        $(tooltipVelocities[i]).empty();

        for (let resourceType in worker['velocity']) {
            var velocity = document.createElement('div');
            velocity.classList = 'tooltip-buy-price-component';
            velocity.innerText = worker['velocity'][resourceType] + ' ' + resourceType;
            tooltipVelocities[i].appendChild(velocity);
        }
        var velocityString = document.createElement('span');
        velocityString.innerText = 'Total per second: ';
        velocityString.style = 'position: absolute; left: 7.5px;';
        tooltipVelocities[i].firstChild.prepend(velocityString);
    }
}

// User takes away a job assigned to an available townsperson (creating an available townsperson).
function deallocateWorker(worker) {
    if (worker['id'] === 'jobResourceCollector' && modelResource['townspeopleResourceCollector'] > 0) {
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

function buyBuilding(building) {
    if (building['id'] === 'buildingSmallHouse' && building['price']['resource'] <= modelResource['resource']) {
        modelResource['resource'] -= building['price']['resource'];
        modelResource['smallHousesOwned']++;
        building['price'] = determineCurrentPriceBuilding(building['basePrice'], modelResource['smallHousesOwned']);

        updateTooltipBuyPrice(building);
        updateTooltipSellPrice(building);
        socket.emit('update_tooltip_building_buy_price', building);
        socket.emit('update_tooltip_building_sell_price', building);
        updateMaxTownspeople();
    }
}

function updateTooltipBuyPrice(building) {
    var tooltip = document.getElementById(building['buyButtonId']).children[0];
    var tooltipPrice = $(tooltip).find('.tooltip-buy-price')[0];
    $(tooltipPrice).empty();
    
    for (let resourceType in building['price']) {
        var cost = document.createElement('div');
        cost.classList = 'tooltip-buy-price-component';
        cost.innerText = formatNumberToSignificantValue(building['price'][resourceType]) + ' ' + resourceType;
        tooltipPrice.appendChild(cost);
    }
    
    var costString = document.createElement('span');
    costString.innerText = 'Cost: ';
    costString.style = 'position: absolute; left: 7.5px;';
    tooltipPrice.firstChild.prepend(costString);
}

function updateTooltipSellPrice(building) {
    var tooltip = document.getElementById(building['sellButtonId']).children[0];
    var tooltipSellPrice = $(tooltip).find('.tooltip-sell-price')[0];
    $(tooltipSellPrice).empty();
    
    for (let resourceType in building['price']) {
        var sellpriceDiv = document.createElement('div');
        sellpriceDiv.classList = 'tooltip-sell-price-component';
        sellpriceDiv.innerText = formatNumberToSignificantValue((building['price'][resourceType] / 1.15) * .75) + ' ' + resourceType;
        tooltipSellPrice.appendChild(sellpriceDiv);
    }
    
    var sellpriceString = document.createElement('span');
    sellpriceString.innerText = 'Sells for: ';
    sellpriceString.style = 'position: absolute; left: 7.5px;';
    tooltipSellPrice.firstChild.prepend(sellpriceString);
}

function updateTooltipEffects(spanId, newEffectsText) {
    var tooltipEffectsSubsection = document.getElementById(spanId);
    tooltipEffectsSubsection.innerText = newEffectsText;
}

// Keeps track of how many townspeople you can have max.
function updateMaxTownspeople() {
    modelResource['townspeopleMax'] = modelResource['smallHousesOwned'] * modelResourceRates['smallHouse'];
    if (modelResource['townspeopleAlive'] > modelResource['townspeopleMax']) {
        modelResource['townspeopleAlive'] = modelResource['townspeopleMax'];
    }
    if (modelResource['townspeopleAvailable'] > modelResource['townspeopleMax']) {
        modelResource['townspeopleAvailable'] = modelResource['townspeopleMax'];
    }
}

function sellBuilding(building) {
    if (building['id'] === 'buildingSmallHouse') {
        if (modelResource['smallHousesOwned'] > 0 && modelResource['townspeopleAvailable'] >= modelResourceRates['smallHouse']) {
            modelResource['smallHousesOwned']--;
            modelResource['townspeopleAlive'] -= modelResourceRates['smallHouse'];
            modelResource['townspeopleAvailable'] -= modelResourceRates['smallHouse'];
            building['price'] = determineCurrentPriceBuilding(building['basePrice'], modelResource['smallHousesOwned']);
            modelResource['resource'] += (building['price']['resource'])*.75;
            
            updateTooltipBuyPrice(building);
            updateTooltipSellPrice(building);
            socket.emit('update_tooltip_building_buy_price', building);
            socket.emit('update_tooltip_building_sell_price', building);
            updateMaxTownspeople();
        }
    }
}

// Functionality: Iterates the generic 'resource' resource by 1.
//                  Remove later. Merely to test functionality.
function generateResource() {
    modelResource['resource']++;
}

// Creates a message in the chat box.
function createChatMessage(message) {
    if (checkChatMessagePresence(message)) {
        var chatboxTextDisplay = document.getElementById('chatboxTextDisplay');
        var chatMessage = document.createElement('p');
        if (message.username && message.message) {
            chatMessage.innerText = message.username + ': ' + message.message;
        } else {
            chatMessage.innerText = message;
        }
        $(chatboxTextDisplay).prepend(chatMessage);
    }
}

// Checks that a chat message is not empty
function checkChatMessagePresence(message) {
    if (typeof message === 'object' && $.trim(message.message) !== '') {
        return true;
    } else if (typeof message === 'string' && $.trim(message) !== '') {
        return true;
    }
    return false;
}

// Joins a game room after the user has entered in a password and submitted it.
function joinGameSession(game_password) {
    showServerButtons();
    socket.emit('namespace_change', { room: game_password, player_name: username });
    window.setTimeout(function() {
        socket.emit('update_current_room_name');
        updateDisplayedGameProgress();
        initModelUpgrades(modelUpgrades);
        createTooltips();
    }, 250);
}

// Shows buttons related to server actions on the page nav.
function showServerButtons() {
    $(document.getElementById('serverButtonsContainer')).fadeIn(350);
}

function hideOverlay() {
    document.getElementById('overlayContainer').style = 'display; none;';
}

function outputErrorMessageToErrorDisplay(error, effect) {
    var errorDisplayDiv = document.getElementById('pageNavbarErrorDisplay');
    if (errorDisplayDiv.innerText !== error) {
        errorDisplayDiv.innerText = error;
        
        var color1 = '#AAAAAA';
        var color2 = '#555555';
        if (effect === 'red') {
            color1 = '#FF0000';
            color2 = '#880000';
        } else if (effect === 'orange') {
            color1 = '#CC5500';
            color2 = '#883300';
        }
        $(errorDisplayDiv).css({color: color1});

        $(errorDisplayDiv).fadeIn(500);
        for (let i = 0; i < 6; i++) {
            $(errorDisplayDiv).animate({color: i % 2 === 0 ? color2 : color1}, 500);
        }
        $(errorDisplayDiv).fadeOut(500, function() {
            errorDisplayDiv.innerText = '';
        });
    }
}

// Leaves a game room after the user disconnects.
function leaveGameSession() {
    socket.emit('reset_namespace', username);
    if (is_host && is_in_a_server) {
        save();
    }
    revealOverlay('kickedFromRoomContainer');
    window.setTimeout(function() {
        if (!(is_host)) {
            emptyFlavorTextArea();
        }
        is_host = true;
        is_in_a_server = false;
        game_password = '';
        initModels();
        hideServerButtons();
    }, 250);
}

// Remove messages from flavor text area.
function emptyFlavorTextArea() {
    $(document.getElementById('flavorTextArea')).empty();
}

// Hides buttons related to server actions on the page nav.
function hideServerButtons() {
    $(document.getElementById('serverButtonsContainer')).fadeOut();
}

function eraseGameProgress() {
    localStorage.removeItem('modelResource');
    localStorage.removeItem('modelResourceRates');
    localStorage.removeItem('modelUpgrades');
    localStorage.removeItem('modelGameProgress');
    localStorage.removeItem('username');
    randomizeSelectedTitle();
    var blackout = function() {
        var options1 = {
            duration: 750,
            easing: 'linear',
            step: function() {
                $('body').css({
                    '-webkit-filter': 'brightness('+this.brightness+'%)',
                    'filter': 'brightness('+this.brightness+'%)'
                });
            },
            complete: function(){
                hideOverlay();
                emptyFlavorTextArea();
                printIntroductoryMessage();
                initModels();
                setupUpgradeEventListeners();
            }
        };
        var options2 = {
            duration: 1250,
            easing: 'linear',
            step: function() {
                $('body').css({
                    '-webkit-filter': 'brightness('+this.brightness+'%)',
                    'filter': 'brightness('+this.brightness+'%)'
                });
            },
            complete: function() {
                $('body').css({'filter': 'brightness(100%);'});
            }
        };
        $({brightness: 100}).animate({brightness: 0}, options1).animate({brightness: 100}, options2);
    };
    blackout();
}

function setupUpgradeEventListeners() {
    if (document.getElementById(modelUpgrades['smallHouse']['reinforcedHousing']['buyButtonId']) !== null) {
        var upgradeReinforcedHousingButton = document.getElementById(modelUpgrades['smallHouse']['reinforcedHousing']['buyButtonId']);
        upgradeReinforcedHousingButton.addEventListener('click', function(){ buyUpgrade(modelUpgrades['smallHouse']['reinforcedHousing']); });
    }
    
    if (document.getElementById(modelUpgrades['resourceCollector']['agriculturalEducation']['buyButtonId']) !== null) {
        var upgradeAgriculturalEducationButton = document.getElementById(modelUpgrades['resourceCollector']['agriculturalEducation']['buyButtonId']);
        upgradeAgriculturalEducationButton.addEventListener('click', function(){ buyUpgrade(modelUpgrades['resourceCollector']['agriculturalEducation']); });
    }
}

function buyUpgrade(upgrade) {
    if (is_host) {
        if (modelResource['resource'] >= upgrade['price']['resource'] && upgrade['purchased'] !== true) {
            modelResource['resource'] -= upgrade['price']['resource'];
            applyUpgradeEffect(upgrade);
            socket.emit('remove_upgrade_from_list', upgrade);
        }
    } else {
        socket.emit('buy_upgrade', upgrade);
    }
}

function applyUpgradeEffect(upgrade) {
    if (upgrade['buyButtonId'] === 'upgradeDisplayBoxAgriculturalEducation') {
        modelResourceRates['resourceCollector'] += 0.5;
        updateResourceVelocity();
        modelUpgrades['resourceCollector']['agriculturalEducation']['purchased'] = true;
    } else if (upgrade['buyButtonId'] === 'upgradeDisplayBoxReinforcedHousing') {
        modelResourceRates['smallHouse'] += 1;
        updateMaxTownspeople();
        modelUpgrades['smallHouse']['reinforcedHousing']['purchased'] = true;
    }
    updateTooltipsAfterUpgrade();
    if (is_host) {
        save();
        if (is_in_a_server) {
            socket.emit('update_tooltips_after_upgrade');
        }
    }
    removeUpgrade(upgrade);
}

function updateTooltipsAfterUpgrade() {
    updateTooltipWorkerVelocity(modelJobs['resourceCollector']);
    updateTooltipEffects('resourceCollectorAllocateTooltipEffects', modelResourceRates['resourceCollector']);
    updateTooltipEffects('resourceCollectorDeallocateTooltipEffects', modelResourceRates['resourceCollector']);
    updateTooltipEffects('smallHouseBuyTooltipEffects', modelResourceRates['smallHouse']);
    updateTooltipEffects('smallHouseSellTooltipEffects', modelResourceRates['smallHouse']);
}

function removeUpgrade(upgrade) {
    var upgradeElement = document.getElementById(upgrade['buyButtonId']);
    if (upgradeElement) {
        upgradeElement.removeEventListener('click', buyUpgrade);
        moveUpgradeToPurchasedBox(upgrade);
        
        if (document.getElementById(upgrade['parentId']).offsetHeight === 0) {
            document.getElementById(upgrade['containerId']).style = 'display: none;';
        }
        updateNoUpgradesAvailableDisplay();
    }
}

function moveUpgradeToPurchasedBox(upgrade) {
    var upgradeElement = document.getElementById(upgrade['buyButtonId']);
    var purchasedBox = document.getElementById(upgrade['purchasedContainerId']);
    upgradeElement.style = 'display: block; cursor: default;';
    
    var popped = $(upgradeElement).detach();
    popped.appendTo(purchasedBox);
    document.getElementById(upgrade['purchasedContainerParentId']).style = 'display: block;';
    document.getElementById('upgradesPurchasedContainer').style = 'display: block;';
}

// Event listeners that are static - they operate independently of the user's
// presence in a server.
function setupStaticEventListeners() {
    // Generate list of game nav buttons; the view is changed when they are clicked.
    var gameNavButtonArray = 
        [
            document.getElementById('resourceGenerationNavButton'),
            document.getElementById('manageTownNavButton'),
            document.getElementById('manageUpgradesNavButton'),
            document.getElementById('manageJobsNavButton')
        ];
    for (let i = 0; i < gameNavButtonArray.length; i++) {
        gameNavButtonArray[i].addEventListener('click', function() {
            updateSelectedView(gameNavButtonArray[i]);
        });
    }
    
    var setUsernameButtonOriginal = document.getElementById('enterUsernameSubmit');
    var setUsernameField = document.getElementById('enterUsernameField');
    setUsernameButtonOriginal.addEventListener('click', function() {
        setUsername();
        setUsernameField.value = '';
    });
    
    // Check to see if user dismissed the cookies warning.
    var cookieLawBanner = document.getElementById('cookieLawWarning');
    var userDismissedCookiesWarning = localStorage.getItem('cookiesWarningDismissed');
    if (userDismissedCookiesWarning === null) {
        cookieLawBanner.style = 'display: flex;';
        var cookieLawDismissButton = document.getElementById('cookieDismiss');
        cookieLawDismissButton.addEventListener('click', function() {
            $(cookieLawBanner).fadeOut(250);
            localStorage.setItem('cookiesWarningDismissed', true);
        });
    }
    
    // User clicks button to view menu to set game password
    var setGamePasswordButton = document.getElementById('setGamePassword');
    setGamePasswordButton.addEventListener('click', function() {
        revealOverlay('setGamePasswordContainer');
    });
    
    // User dismisses the menu to set game password
    var setGamePasswordCancelButton = document.getElementById('setGamePasswordCancel');
    setGamePasswordCancelButton.addEventListener('click', function() {
        hideOverlay();
    });
    
    // User clicks the view room occupants button
    var viewRoomOccupantsButton = document.getElementById('viewRoomOccupants');
    viewRoomOccupantsButton.addEventListener('click', function() {
        getUsersInCurrentRoom();
        window.setTimeout(function() {
            revealOverlay('viewRoomOccupantsContainer');
        }, 50);
    });
    
    // User dismisses the menu to view room occupants
    var viewRoomOccupantsCloseButton = document.getElementById('viewRoomOccupantsClose');
    viewRoomOccupantsCloseButton.addEventListener('click', function() {
        hideOverlay();
    });
    
    var resetGameConfirmationCancel = document.getElementById('resetGameConfirmationCancel');
    resetGameConfirmationCancel.addEventListener('click', function() {
        hideOverlay();
    });
    
    var kickedFromRoomOkButton = document.getElementById('kickedFromRoomClose');
    kickedFromRoomOkButton.addEventListener('click', function() {
        hideOverlay(); 
    });
}

// Changes the currently-displayed view.
function updateSelectedView(divBeingSelected) {
    // Update which button is currently selected.
    var currentlySelectedDiv = document.getElementsByClassName('selected')[0];
    if (currentlySelectedDiv !== divBeingSelected) {
        document.getElementsByClassName('selected')[0].classList.remove('selected');
        divBeingSelected.classList.add('selected');
    }

    for (let viewObject in modelViews) {
        if (modelViews[viewObject].navButton === divBeingSelected) {
            modelViews[viewObject].view.style = 'display: block;';
        } else {
            modelViews[viewObject].view.style = 'display: none;';
        }
    }
}

// Changes the user's username based on their name entry and selected title.
function setUsername() {
    var new_name = document.getElementById('enterUsernameField').value;
    var new_title = $('#usernameTitles option:selected')[0].value;
    var new_username = new_name + ' ' + new_title; 
    
    if (verifyUsername(new_name)) {
        socket.emit('set_username', { new_username: new_username, previous_username: username });
        username = new_username;
        
        var overlayContainer = document.getElementById('overlayContainer');
        overlayContainer.style = 'display: none;';
        localStorage.setItem('username', JSON.stringify(username));
    } else {
        outputErrorMessageToErrorDisplay('That username is too short.', 'orange');
        console.log('That username is too short.');
    }
}

// Verifies that a username follows some basic rules. Returns false if an invalid username is submitted.
function verifyUsername(name) {
    if (name.length == 0 || name.length > 32) {
        return false;
    }
    return true;
}

// Shows user a list of the users in the current room.
function getUsersInCurrentRoom() {
    socket.emit('retrieve_list_of_players');
}

// Sets up event listeners on the socket that trigger when receiving
// certain messages from the server.
function setupServerEmitListeners() {
    socket.on('chat_message_from_server', function(message) {
        createChatMessage(message);
    });
    
    socket.on('new_player_joined_game', function(player_name) {
        var player_joined_message = player_name + ' has joined the game!';
        createChatMessage(player_joined_message);
    });
    
    socket.on('player_left_game', function(username) {
        var player_left_message = username + ' has left the game!'; 
        createChatMessage(player_left_message);
    });
    
    socket.on('server_output_to_flavor_text_area', function(message) {
        outputToFlavorTextArea(message); 
    });
    
    socket.on('become_client', function(data) {
        is_host = false;
        is_in_a_server = true;
    });
    socket.on('become_host', function() {
        is_host = true;
        is_in_a_server = true;
    });
    
    socket.on('server_says_allocate_worker', function(data) {
        allocateWorker(data);
    });
    socket.on('update_resource_velocity_server', function(data) {
        updateTooltipWorkerVelocity(data); 
    });
    socket.on('server_says_deallocate_worker', function(data) {
        deallocateWorker(data);
    });
    socket.on('server_says_buy_building', function(data) {
        buyBuilding(data);
    });
    socket.on('server_says_sell_building', function(data) {
        sellBuilding(data);
    });
    socket.on('server_says_buy_upgrade', function(data) {
        buyUpgrade(data);
    });
    socket.on('server_says_remove_upgrade_from_list', function(data) {
        removeUpgrade(data); 
    });
    socket.on('server_says_update_tooltips_after_upgrade', function() {
        window.setTimeout(function() {
            updateTooltipsAfterUpgrade();
        }, 250);
        
    });
    socket.on('update_tooltip_building_buy_price_server', function(data) {
        updateTooltipBuyPrice(data); 
    });
    socket.on('update_tooltip_building_sell_price_server', function(data) {
        updateTooltipSellPrice(data);
    });
    socket.on('server_says_generate_resource', function() {
        generateResource();
    });
    
    socket.on('server_update_data', function(data) {
        updateWithDataFromServer(data);
    });
    
    socket.on('kick_from_room', function(data) {
        leaveGameSession();
    });
    
    socket.on('list_of_players', function(data) {
        var playerListContainer = document.getElementById('viewRoomOccupantsOccupants');
        // Empty list of players
        while (playerListContainer.firstChild) {
            playerListContainer.removeChild(playerListContainer.firstChild);
        }
        
        var playerListStartString = document.createElement('p');
        playerListStartString.innerText = 'Players in this room:';
        playerListContainer.appendChild(playerListStartString);
        // Generate new list of players
        for (var i = 0; i < data['username_list'].length; i++) {
            var playerContainer = document.createElement('div');
            var playerName = document.createElement('p');
            playerName.innerText = data['username_list'][i];
            if (playerName.innerText === data['host_username']) {
                $(playerName).addClass('host-user');
                playerName.title = 'This user is currently the host';
            }
            playerContainer.appendChild(playerName);
            playerListContainer.appendChild(playerContainer);
        }
    });
    
    socket.on('server_return_current_room_name', function(data) {
        var viewRoomOccupantsRoomName = document.getElementById('viewRoomOccupantsRoomName');
        viewRoomOccupantsRoomName.innerText = 'Current Room: ' + data;
    });
}

// Updates the current game interface with data from another player's hosted game.
function updateWithDataFromServer(data) {
    var playerResourceData = data.resource_data;
    var playerResourceRatesData = data.resource_rates_data;
    var playerModelUpgrades = data.upgrade_model;
    var playerModelGameProgress = data.progress_model;
    // Replace default resource values with host player's resource values.
    if (playerResourceData !== null) {
        modelResource['resource'] = playerResourceData['resource'];
        modelResource['townspeopleAvailable'] = playerResourceData['townspeopleAvailable'];
        modelResource['townspeopleAlive'] = playerResourceData['townspeopleAlive'];
        modelResource['townspeopleMax'] = playerResourceData['townspeopleMax'];
        modelResource['townspeopleResourceCollector'] = playerResourceData['townspeopleResourceCollector'];
        modelResource['smallHousesOwned'] = playerResourceData['smallHousesOwned'];
    }
    // Replace default resource rate values with host player's resource rate values.
    if (playerResourceRatesData !== null) {
        modelResourceRates['resourceCollector'] = playerResourceRatesData['resourceCollector'];
        modelResourceRates['smallHouse'] = playerResourceRatesData['smallHouse'];
    }
    // Replace default upgrade data with host player's upgrade models.
    if (playerModelUpgrades) {
        modelUpgrades['smallHouse'] = playerModelUpgrades['smallHouse'];
        modelUpgrades['resourceCollector'] = playerModelUpgrades['resourceCollector'];
    }
    if (playerModelGameProgress) {
        modelGameProgress['displayBuildings'] = playerModelGameProgress['displayBuildings'];
        modelGameProgress['displayUpgrades'] = playerModelGameProgress['displayUpgrades'];
        modelGameProgress['displayJobs'] = playerModelGameProgress['displayJobs'];
    }
    // Init all resource generation velocities (current rate for the user)
    modelJobs['resourceCollector']['velocity'] = 
        {'resource': modelResourceRates['resourceCollector'] * modelResource['townspeopleResourceCollector']};
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
            id: 'jobResourceCollector',
            resourceType: ['resource'],
            velocity: {'resource': modelResourceRates['resourceCollector'] * modelResource['townspeopleResourceCollector']},
            allocateButtonId: 'resourceCollectorAddWorker',
            deallocateButtonId: 'resourceCollectorRemoveWorker'
        };
    // Init the buildings model.
    modelBuildings['smallHouse'] = 
        {
            id: 'buildingSmallHouse',
            basePrice: {'resource': 50},
            resourceType: ['resource'],
            price: determineCurrentPriceBuilding({'resource': 50}, modelResource['smallHousesOwned']),
            buyButtonId: 'buildingSmallHouseBuyButton',
            sellButtonId: 'buildingSmallHouseSellButton'
        };
}

// Initializes the autosave timer to ensure user data persistence.
//                  User data is autosaved every 15 seconds.
function autosaveTimer() {
    save();
    window.setTimeout(autosaveTimer, 15000);
}

// Performs the function of the autosaveTimer without the repetition.
function save() {
    if (is_host) {
        localStorage.setItem('modelResource', JSON.stringify(modelResource));
        localStorage.setItem('modelResourceRates', JSON.stringify(modelResourceRates));
        localStorage.setItem('modelUpgrades', JSON.stringify(modelUpgrades));
        localStorage.setItem('modelGameProgress', JSON.stringify(modelGameProgress));
    }
}

// Initializes a timer that will result in new townspeople arriving in town.
function townspeopleArrivalTimer() {
    if (is_host && modelResource['townspeopleAlive'] < modelResource['townspeopleMax']) {
        var message = '';
        var incomingTownspeople = Math.round(Math.random() * 3);
        if (modelResource['townspeopleAlive'] + incomingTownspeople > modelResource['townspeopleMax']) {
            incomingTownspeople = modelResource['townspeopleMax'] - modelResource['townspeopleAlive'];
        }
        
        var randomChanceMessage = Math.random();
        if (incomingTownspeople === 1) {
            if (Math.ceil(randomChanceMessage*4) === 1) {
                message = 'A young lad, barely a man, approaches. He asks if he can work ' + 
                    'in exchange for a place to call "home".';
            } else if (Math.ceil(randomChanceMessage*4) === 2) {
                message = 'An older gentleman saunters into view. He smiles at the sight ' + 
                    'of friendly faces. He offers his services in exchange for shelter.';
            } else if (Math.ceil(randomChanceMessage*4) === 3) {
                message = 'A young woman strides towards the camp. She\'s been exploring the ' + 
                    'area and now seeks respite.';
            } else if (Math.ceil(randomChanceMessage*4) === 4) {
                message = 'An older woman, seasoned by hard times, shuffles towards you. ' +
                    'She offers her wisdom and experience in exchange for safety.';
            }
        } else if (incomingTownspeople === 2) {
            if (Math.ceil(randomChanceMessage*3) === 1) {
                message = 'A weathered gentleman and his son venture into your camp. ' + 
                'He desires shelter for himself and his boy, offering honest work.';
            } else if (Math.ceil(randomChanceMessage*3) === 2) {
                message = 'A woman and her daughter approach. They seek respite from ' + 
                    'the elements, and know some invaluable trade skills.';
            } else if (Math.ceil(randomChanceMessage*3) === 3) {
                message = 'A woman and her son approach. The woman is tired, and requires ' + 
                'some medical attention. With some time, they prove to be valuable allies.';
            }
        } else if (incomingTownspeople === 3) {
            if (Math.ceil(randomChanceMessage*3) === 1) {
                message = 'A man, woman, and their daughter race into town. ' + 
                    'They discovered some raging wildlife and ran for the last mile or so. ' + 
                    'After they catch their breath, you point them to an unfilled house and they ' + 
                    'offer their abilities with gratitude.';
            } else if (Math.ceil(randomChanceMessage*3) === 2) {
                message = 'Three women come into town without a word. ' + 
                    'Despite your prying, they do not say a word. But they do take up ' + 
                    'residence in one of your open homes, and willingly accept work.';
            } else if (Math.ceil(randomChanceMessage*3) === 3) {
                message = 'Three men stride into town, seeking work. ' + 
                    '\'If anything needs lifting, just call us!\' Good labor is always ' + 
                    'welcome to come by.';
            }
        }
        
        if (message !== '') {
            outputToFlavorTextArea(message);
        }
        modelResource['townspeopleAlive'] += incomingTownspeople;
        modelResource['townspeopleAvailable'] += incomingTownspeople;
    }
    window.setTimeout(townspeopleArrivalTimer, 12500);
}

// Functionality: Update page-displayed resource values on an interval.
function updateResourceValues() {
    calculateResourceValuePerTick();
    var resourceName = document.getElementById('resource-name');
    if (modelJobs['resourceCollector']['velocity']['resource'] > 0) {
        resourceName.innerText = 'Resource (+' + formatNumberToSignificantValue(modelJobs['resourceCollector']['velocity']['resource']) + ')';
    } else if (modelJobs['resourceCollector']['velocity']['resource'] < 0) {
        resourceName.innerText = 
            'Resource (-' + formatNumberToSignificantValue(modelJobs['resourceCollector']['velocity']['resource']) + ')';
    } else {
        resourceName.innerText = 'Resource';
    }
    document.getElementById('resource-value').innerText = formatNumberToSignificantValue(modelResource['resource']);
    document.getElementById('maxNumTownspeople').innerText = modelResource['townspeopleMax'];
    document.getElementById('numWorkers').innerText = modelResource['townspeopleAvailable'] + '/' 
        + modelResource['townspeopleAlive'];
    document.getElementById('numWorkersResourceCollector').innerText = modelResource['townspeopleResourceCollector'];
    document.getElementById('numOwnedSmallHouses').innerText = modelResource['smallHousesOwned'];
    
    if (is_host && is_in_a_server) {
        var data = { resource_data: modelResource, resource_rates_data: modelResourceRates, upgrade_model: modelUpgrades, progress_model: modelGameProgress };
        socket.emit('data_update', data);
    }
    
    if (!modelGameProgress.displayBuildings.activated && modelResource['resource'] >= 20) {
        applyGameProgressEffect(modelGameProgress.displayBuildings);
    }
    if (!modelGameProgress.displayUpgrades.activated && modelResource['resource'] >= 90) {
        applyGameProgressEffect(modelGameProgress.displayUpgrades);
    }
    if (!modelGameProgress.displayJobs.activated && modelResource['townspeopleAlive'] >= 1) {
        applyGameProgressEffect(modelGameProgress.displayJobs);
    }
    
    window.setTimeout(updateResourceValues, 100);
}

// Displays new content to a player as part of the user experience.
function applyGameProgressEffect(milestone) {
    milestone.activated = true;
    for (let i = 0; i < milestone.elementIds.length; i++) {
        $(document.getElementById(milestone.elementIds[i])).fadeIn(500);
    }
}

// Updates displayed game progress based on activated features when you join a game.
// Only meant to be used once on server join.
function updateDisplayedGameProgress() {
    for (let progressModel in modelGameProgress) {
        for (let i = 0; i < modelGameProgress[progressModel].elementIds.length; i++) {
            document.getElementById(modelGameProgress[progressModel].elementIds[i]).style = 'display: none;';
        }
    }
    
    if (modelGameProgress.displayBuildings.activated && modelResource['resource'] >= 20) {
        applyGameProgressEffect(modelGameProgress.displayBuildings);
    }
    if (modelGameProgress.displayUpgrades.activated && modelResource['resource'] >= 90) {
        applyGameProgressEffect(modelGameProgress.displayUpgrades);
    }
    if (modelGameProgress.displayJobs.activated && modelResource['townspeopleAlive'] >= 1) {
        applyGameProgressEffect(modelGameProgress.displayJobs);
    }
}

// Update the actual values of resources.
function calculateResourceValuePerTick() {
    //Ticks are 10 times a second, or every .1s, thus the magic number .1.
    var allocatedresources = modelJobs['resourceCollector']['velocity']['resource']*.1;
    modelResource['resource'] += allocatedresources;
}