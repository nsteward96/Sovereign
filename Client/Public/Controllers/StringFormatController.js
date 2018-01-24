// Formats the number passed to it and returns it.
// I.e. passing it '10392' will return '10.392K';
function formatNumberToSignificantValue(number) {
    var numberString = parseInt(number).toString();
    var precision = number.toFixed(0).length;
    var denomination = '';
    var returnedString;
    if (numberString.length >= 4 && numberString.length < 7) {
        number /= 1000;
        if (number / 100 >= 1) {
            precision = 6;
        } else if (number / 10 >= 1) {
            precision = 5;
        } else {
            precision = 4;
        }
        denomination = 'K';
    } else if (numberString.length >= 7 && numberString.length < 10) {
        number /= 1000000;
        if (number / 100 >= 1) {
            precision = 6;
        } else if (number / 10 >= 1) {
            precision = 5;
        } else {
            precision = 4;
        }
        denomination = 'M';
    } else if (numberString.length >= 10 && numberString.length < 13) {
        number /= 1000000000;
        if (number / 100 >= 1) {
            precision = 6;
        } else if (number / 10 >= 1) {
            precision = 5;
        } else {
            precision = 4;
        }
        denomination = 'B';
    }
        
    returnedString = number.toPrecision(precision) + denomination;
    return returnedString;
}