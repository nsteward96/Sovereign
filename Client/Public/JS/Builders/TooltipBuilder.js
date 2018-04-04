/*global formatNumberToSignificantValue*/
// Options: 
// params['title']: The title of the tooltip.
// params['description']: The flavor description of the tooltip.
// params['effects']: The effects that happen, usually as a result of buying a building or upgrade.
// params['workervelocity']: How many of a type of resource are being allocated per second by all of your workers of one type. This is a hash {'resource': (int)amount}
// params['buyprice']: The price of the hovered item. If multiple currencies are used, this should be a hash of the currencies and their amounts.
// params['sellprice']: The price you get for selling the hovered item. Same rules as price for multiple currencies used.
function TooltipBuilder(params) {
    params = params || { 'title': undefined, 'description': undefined, 'effects': undefined, 'buyprice': undefined, 'sellprice': undefined};
    
    var buildTooltipTitle = function(title) {
        if (title !== undefined) {
            var titleDiv = document.createElement('div');
            titleDiv.classList = 'tooltip-title';
            titleDiv.innerText = title;
            return titleDiv;
        }
        return null;
    };
    var buildTooltipDescription = function(description) {
        if (description !== undefined) {
            var descriptionDiv = document.createElement('div');
            descriptionDiv.classList = 'tooltip-description';
            descriptionDiv.innerText = description;
            return descriptionDiv;
        }
        return null;
    };
    var buildTooltipEffects = function(effects) {
        if (effects !== undefined) {
            var effectsDiv = document.createElement('div');
            effectsDiv.classList = 'tooltip-effects';
            effectsDiv.innerText = effects;
            return effectsDiv;
        }
        return null;
    };
    var buildTooltipWorkerVelocity = function(workervelocity) {
        if (workervelocity !== undefined) {
            var workervelocityDiv = document.createElement('div');
            workervelocityDiv.classList = 'tooltip-worker-velocity';
            for (let resource in workervelocity) {
                var velocity = document.createElement('div');
                velocity.classList = 'tooltip-buy-price-component';
                velocity.innerText = workervelocity[resource] + ' ' + resource;
                workervelocityDiv.appendChild(velocity);
            }
            
            var velocityString = document.createElement('span');
            velocityString.innerText = 'Total per second: ';
            velocityString.style = 'position: absolute; left: 3%;';
            workervelocityDiv.firstChild.prepend(velocityString);
            
            return workervelocityDiv;
        }
        return null;
    };
    var buildTooltipBuyPrice = function(buyprice) {
        if (buyprice !== undefined) {
            var buyPriceDiv = document.createElement('div');
            buyPriceDiv.classList = 'tooltip-buy-price';
            for (let resource in buyprice) {
                var cost = document.createElement('div');
                cost.classList = 'tooltip-buy-price-component';
                cost.innerText = formatNumberToSignificantValue(buyprice[resource]) + ' ' + resource;
                buyPriceDiv.appendChild(cost);
            }
            
            var costString = document.createElement('span');
            costString.innerText = 'Cost: ';
            costString.style = 'position: absolute; left: 3%;';
            buyPriceDiv.firstChild.prepend(costString);
            
            return buyPriceDiv;
        }
        return null;
    };
    var buildTooltipSellPrice = function(sellprice) {
        if (sellprice !== undefined) {
            var sellPriceDiv = document.createElement('div');
            sellPriceDiv.classList = 'tooltip-sell-price';
            
            for (let resource in sellprice) {
                var resourceGained = document.createElement('div');
                resourceGained.classList = 'tooltip-sell-price-component';
                resourceGained.innerText = formatNumberToSignificantValue(sellprice[resource]) + ' ' + resource;
                sellPriceDiv.appendChild(resourceGained);
            }
            
            var sellpriceString = document.createElement('span');
            sellpriceString.innerText = 'Sells for: ';
            sellpriceString.style = 'position: absolute; left: 3%;';
            sellPriceDiv.firstChild.prepend(sellpriceString);
            
            return sellPriceDiv;
        }
        return null;
    };
    var buildTooltip = function(title, description, effects, workervelocity, buyprice, sellprice) {
        var tooltip = document.createElement('div');
        tooltip.classList = 'tooltip-container unselectable';
        
        if (title) {
            tooltip.appendChild(title);
        }
        if (description) {
            tooltip.appendChild(description);
        }
        if (effects) {
            tooltip.appendChild(effects);
        }
        if (workervelocity) {
            tooltip.appendChild(workervelocity);
        }
        if (buyprice) {
            tooltip.appendChild(buyprice);
        }
        if (sellprice) {
            tooltip.appendChild(sellprice);
        }
        
        return tooltip;
    };
    
    var tooltipTitle = buildTooltipTitle(params['title']);
    var tooltipDescription = buildTooltipDescription(params['description']);
    var tooltipEffects = buildTooltipEffects(params['effects']);
    var tooltipWorkerVelocity = buildTooltipWorkerVelocity(params['workervelocity']);
    var tooltipBuyPrice = buildTooltipBuyPrice(params['buyprice']);
    var tooltipSellPrice = buildTooltipSellPrice(params['sellprice']);
    return buildTooltip(tooltipTitle, tooltipDescription, tooltipEffects, tooltipWorkerVelocity, tooltipBuyPrice, tooltipSellPrice);
}