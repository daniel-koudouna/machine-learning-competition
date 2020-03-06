/**
 * Accuracy calculator module, exports the accuracy with (100 - error)%
 */
let fs = require('fs');

// Module export calculate method
module.exports.calculate = function(type, y_test, y_pred) {
    if (type == 'regression') {
        let totalSquaredResidual = 0;
        let error = 0;
        for (let i = 0; i < y_test.length; i++) {
            totalSquaredResidual += Math.pow((y_test[i] - y_pred[i]), 2);
        }
        error = Math.sqrt(totalSquaredResidual/(y_test.length - 1));
        return error.toFixed(5);
    } else if (type == 'classification') {
        let correct = 0;
        for (let i = 0; i < y_test.length; i++) {
            same = y_test[i] == y_pred[i];
            if (same) {
                correct++;
            }
        }
        let accuracy = correct/(y_test.length);
        return accuracy.toFixed(5);
    } else {
        return 0;
    }
};
