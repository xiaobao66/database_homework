var mysql = require('mysql');
var Q = require('q');

var pool;

function Db(connection) {
    this.connection = connection;
}

Db.prototype = {
    query: function (sql, params) {
        var deferred = Q.defer();
        var promise = deferred.promise;

        function execute(connection) {
            if (!params) {
                connection.query(sql, function (err, result, fields) {
                    if (err) {
                        console.error(err);
                        deferred.reject(err);
                        return;
                    }
                    deferred.resolve(result, fields, err);
                });
            } else {
                connection.query(sql, params, function (err, result, fields) {
                    if (err) {
                        console.error(err);
                        deferred.reject(err);
                        return;
                    }
                    deferred.resolve(result, fields, err);
                });
            }
        }

        pool.getConnection(function (err, connection) {
            promise.then(function () {
                connection.release();
            }, function () {
                connection.release();
            });
            execute(connection);
        });

        return promise;
    }
};

module.exports = {
    config: function (config) {
        pool = mysql.createPool(config);
        return new Db();
    }
};