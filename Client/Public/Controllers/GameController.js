var modelResource = {};
var modelResourceRates = {};
var modelResourceVelocity = {};
var modelViews = {};
var modelJobs = {};
var modelBuildings = {};
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
    // Replace default resource values with saved resource values.
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
        };
    // Init the buildings model.
    modelBuildings['smallHouse'] = 
        {
            id: document.getElementById('buildingSmallHouse').id,
            basePrice: 50,
            price: determineCurrentPriceBuilding(50, modelResource['smallHousesOwned']),
            buyButton: document.getElementById('buildingSmallHouseBuyButton'),
            sellButton: document.getElementById('buildingSmallHouseSellButton')
        };
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
    var finalPrice = basePrice;
    for (let i = 0; i < numOwned; i++) {
        finalPrice *= modelResourceRates['incrementalGrowthRateBuildings'];
    }
    return finalPrice;
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
    var randomTitleNumber = Math.floor(Math.random() * titleList.length);
    var titleOptionContainer = document.getElementById('usernameTitles');
    for (var i = 0; i < titleList.length; i++) {
        var optionObject = document.createElement('option');
        optionObject.setAttribute('value', titleList[i]);
        optionObject.innerText = titleList[i];
        if (i === randomTitleNumber) {
            optionObject.setAttribute('selected', 'selected');
        }
        titleOptionContainer.appendChild(optionObject);
    }
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
    var messageBorderBottom = document.createElement('div');
    messageBorderBottom.classList = 'flavor-text-area-message-border-bottom';
    message.appendChild(messageContent);
    message.appendChild(messageBorderBottom);
    $(flavorTextArea).prepend(message);
    var messageJustAppended = flavorTextArea.childNodes[0];
    $(messageJustAppended).fadeIn(350);
}

// Event listeners that need to be dynamic - they operate differently based on
// whether or not the user is in a server with another player.
function setupDynamicEventListeners() {
    var addWorkerButtonArray = document.getElementsByClassName('add-worker');
    var addWorkerButtonIdArray = [];
    for (let i = 0; i < addWorkerButtonArray.length; i++) {
        addWorkerButtonIdArray[i] = addWorkerButtonArray[i].parentElement.id;
    }
    var removeWorkerButtonArray = document.getElementsByClassName('remove-worker');
    var removeWorkerButtonIdArray = [];
    for (let i = 0; i < removeWorkerButtonArray.length; i++) {
        removeWorkerButtonIdArray[i] = removeWorkerButtonArray[i].parentElement.id;
    }
    for (let i = 0; i < addWorkerButtonArray.length; i++) {
        addWorkerButtonArray[i].addEventListener('click', function() {
            if (is_host) {
                allocateWorker(addWorkerButtonIdArray[i]);
            } else {
                socket.emit('allocate_worker', addWorkerButtonIdArray[i]);
            }
        });
        removeWorkerButtonArray[i].addEventListener('click', function() {
            if (is_host) {
                deallocateWorker(removeWorkerButtonIdArray[i]);
            } else {
                socket.emit('deallocate_worker', removeWorkerButtonIdArray[i]);
            }
        });
    }
    var buyBuildingButtonArray = document.getElementsByClassName('buy-building');
    var buyBuildingButtonIdArray = [];
    for (let i = 0; i < buyBuildingButtonArray.length; i++) {
        buyBuildingButtonIdArray[i] = buyBuildingButtonArray[i].parentElement.id;
    }
    for (let i = 0; i < buyBuildingButtonArray.length; i++) {
        buyBuildingButtonArray[i].addEventListener('click', function() {
            if (is_host) {
                buyBuilding(buyBuildingButtonIdArray[i]);
            } else {
                socket.emit('buy_building', buyBuildingButtonIdArray[i]);
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
            console.log('You don\'t have a password set!');   
        }
    });
}

// User assigns a job to an available townsperson.
function allocateWorker(addWorkerButton) {
    if (modelResource['townspeopleAvailable'] > 0) {
        if (addWorkerButton === 'jobResourceCollector') {
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

// Updates the rate at which resources are added to your total.
function updateResourceVelocity() {
    modelResourceVelocity['resourceCollector'] = 
        modelResource['townspeopleResourceCollector'] * modelResourceRates['resourceCollector'];
}

// User takes away a job assigned to an available townsperson (creating an available townsperson).
function deallocateWorker(removeWorkerButton) {
    if (removeWorkerButton === 'jobResourceCollector' && modelResource['townspeopleResourceCollector'] > 0) {
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
    for (let building in modelBuildings) {
        if (modelBuildings[building].id === buyBuildingButton && modelBuildings[building].price <= modelResource['resource']) {
            modelResource['resource'] -= modelBuildings[building].price;
            modelResource['smallHousesOwned']++;
            modelBuildings[building].price = 
                determineCurrentPriceBuilding(modelBuildings[building].basePrice, modelResource['smallHousesOwned']);
            updateMaxTownspeople();
        }
    }
}

// Keeps track of how many townspeople you can have max.
function updateMaxTownspeople() {
    modelResource['townspeopleMax'] = modelResource['smallHousesOwned'] * modelResourceRates['smallHouse'];
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
    }, 250);
}

// Shows buttons related to server actions on the page nav.
function showServerButtons() {
    $(document.getElementById('serverButtonsContainer')).fadeIn(350);
}

function hideOverlay() {
    document.getElementById('overlayContainer').style = 'display; none;';
}

// Leaves a game room after the user disconnects.
function leaveGameSession() {
    socket.emit('reset_namespace', username);
    if (is_host && is_in_a_server) {
        localStorage.setItem('modelResource', JSON.stringify(modelResource));
        localStorage.setItem('modelResourceRates', JSON.stringify(modelResourceRates));
    }
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
    $(document.getElementById('flavorTextArea').children).remove();
}

// Hides buttons related to server actions on the page nav.
function hideServerButtons() {
    $(document.getElementById('serverButtonsContainer')).fadeOut();
}

// Event listeners that are static - they operate independently of the user's
// presence in a server.
function setupStaticEventListeners() {
    // Generate list of game nav buttons; the view is changed when they are clicked.
    var gameNavButtonArray = 
        [
            document.getElementById('resourceGenerationNavButton'),
            document.getElementById('manageTownNavButton'),
            document.getElementById('manageJobsNavButton')
        ];
    for (let i = 0; i < gameNavButtonArray.length; i++) {
        gameNavButtonArray[i].addEventListener('click', function() {
            updateSelectedView(gameNavButtonArray[i]);
        });
    }
    
    var setUsernameButtonOriginal = document.getElementById('enterUsernameSubmit');
    setUsernameButtonOriginal.addEventListener('click', function() {
        setUsername();
    });
    
    // Check to see if user dismissed the cookies warning.
    var cookieLawBanner = document.getElementById('cookieLawWarning');
    var userDismissedCookiesWarning = localStorage.getItem('cookiesWarningDismissed');
    if (userDismissedCookiesWarning) {
        cookieLawBanner.style.display = 'none';
    } else {
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
        console.log('That username doesn\'t follow the rules! Try another.');
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
        if (message != '') {
            createChatMessage(message);
        }
    });
    
    socket.on('new_player_joined_game', function(player_name) {
        var player_joined_message = player_name + ' has joined the game!';
        createChatMessage(player_joined_message)
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
    socket.on('server_says_deallocate_worker', function(data) {
        deallocateWorker(data);
    });
    socket.on('server_says_buy_building', function(data) {
        buyBuilding(data);
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
    // Replace default resource values with saved resource values.
    if (playerResourceData !== null) {
        modelResource['resource'] = playerResourceData['resource'];
        modelResource['townspeopleAvailable'] = playerResourceData['townspeopleAvailable'];
        modelResource['townspeopleAlive'] = playerResourceData['townspeopleAlive'];
        modelResource['townspeopleMax'] = playerResourceData['townspeopleMax'];
        modelResource['townspeopleResourceCollector'] = playerResourceData['townspeopleResourceCollector'];
        modelResource['smallHousesOwned'] = playerResourceData['smallHousesOwned'];
    }
    // Replace default resource rate values with resource rate values.
    if (playerResourceRatesData !== null) {
        modelResourceRates['resourceCollector'] = playerResourceRatesData['resourceCollector'];
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
        };
    // Init the buildings model.
    modelBuildings['smallHouse'] = 
        {
            id: document.getElementById('buildingSmallHouse').id,
            basePrice: 50,
            price: determineCurrentPriceBuilding(50, modelResource['smallHousesOwned']),
            buyButton: document.getElementById('buildingSmallHouseBuyButton'),
            sellButton: document.getElementById('buildingSmallHouseSellButton')
        };
}

// Initializes the autosave timer to ensure user data persistence.
//                  User data is autosaved every 15 seconds.
function autosaveTimer() {
    if (is_host) {
        localStorage.setItem('modelResource', JSON.stringify(modelResource));
        localStorage.setItem('modelResourceRates', JSON.stringify(modelResourceRates));
    }
    window.setTimeout(autosaveTimer, 15000);
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
    if (modelResourceVelocity['resourceCollector'] > 0) {
        resourceName.innerText = 'Resource (+' + formatNumberToSignificantValue(modelResourceVelocity['resourceCollector']) + ')';
    } else if (modelResourceVelocity['resourceCollector'] < 0) {
        resourceName.innerText = 
            'Resource (-' + formatNumberToSignificantValue(modelResourceVelocity['resourceCollector']) + ')';
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
        var data = { resource_data: modelResource, resource_rates_data: modelResourceRates };
        socket.emit('data_update', data);
    }
    
    window.setTimeout(updateResourceValues, 100);
}

// Update the actual values of resources.
function calculateResourceValuePerTick() {
    //Ticks are 10 times a second, or every .1s, thus the magic number .1.
    modelResource['resource'] += modelResourceVelocity['resourceCollector']*.1;
}