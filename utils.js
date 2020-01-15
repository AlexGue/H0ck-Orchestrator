module.exports.combineVariables = combineVariables;


function auxiliar(mapCombine, currentMap, currentDeep, possibilities) {
    var key = Object.keys(mapCombine)[currentDeep]
    for (var val of mapCombine[key]) {
        currentMap[key] = val
        var internalDeep = currentDeep + 1;
        if (internalDeep < Object.keys(mapCombine).length) {
            auxiliar(mapCombine, currentMap, internalDeep, possibilities)
        }
        else {
            possibilities.push(Object.assign({}, currentMap));
        }
    }

}

function combineVariables(mapCombine) {
    var possibilities = [];
    auxiliar(mapCombine, {}, 0, possibilities);
    return possibilities;
}