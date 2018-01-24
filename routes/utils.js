
module.exports = {


    /*
     *
     * */
    nestedLength: function (arr, nested_key) {
        var size = 0;
        arr.forEach(function (element) {
            if (nested_key === undefined) {
                size += element.length;
            } else {
                size += element[nested_key].length;
            }
        }, this);
        return size;
    },


    /*
   *
   * */
    combineNested: function (arr, nested_key) {
        var res = [];
        arr.forEach(function (element) {
            if (nested_key === undefined) {
                res.push(element);
            } else {
                res.push(element[nested_key]);
            }
        }, this);
        return res;
    },

    combineNested2: function (arr, nested_key) {
        var res = [];
        arr.forEach(function (element) {
            if (nested_key === undefined) {
                res.push(element);
            } else {
                var flat = [].concat.apply([], element[nested_key])
                res.push(flat);
            }
        }, this);
        return res;
    },

    // Exands the given values in the given quantity into a new array.
    expandArray: function (arr, values) {
        var res = [];
        for (var i = 0, len = arr.length; i < len; i++) {
            for (j = 0; j < arr[i]; j++) {
                res.push(values[i]);
            }
        }
        return res;
    },


    /**
     * Returns a random value for a probability distribution
     */
    randomWithProbability: function (notRandomNumbers) {
        if(notRandomNumbers===null){
            return 1;
        }else if (notRandomNumbers.length > 0) {
            var idx = Math.floor(Math.random() * notRandomNumbers.length);
            return notRandomNumbers[idx];
        } else {
            return null;
        }
    },


    /*
     * Sorts the elements of an array
     * */
    sort: function (arr) {
        return arr.sort(function (a, b) { return a - b });
    },


    /*
     * Parses all integers in a given array and returns the integer array
     * */
    map2Int: function (arr) {
        return arr.map(function (x) { return parseInt(x, 10); });
    },


    /*
     *
     * */
    array2int: function (arr) {
        return arr.map(function (x) { return parseInt(x, 10); });
    }
}
