var AbstractClientStore = require('express-brute/lib/AbstractClientStore');
var xtend = require('xtend');
var moment = require('moment');

var DynamoStore = module.exports = function (db, tablename, options) {

    AbstractClientStore.apply(this, arguments);
    this.options = xtend({}, DynamoStore.defaults, options);
    this.db = db;
    this.storeTable = tablename;
};

DynamoStore.prototype = Object.create(AbstractClientStore.prototype);
DynamoStore.prototype.set = function (key, value, lifetime, callback) {
    var storeKey = this.options.prefix+key;
    var expiration = lifetime ? (moment().add('seconds', lifetime).toDate()).getTime() : undefined;
    this.db.updateItem({
        Key: {
            "storeKey": { "S": storeKey}
        },
        ExpressionAttributeValues: {
            ":brutedata": { "S": JSON.stringify(value)},
            ":expires": { "N": expiration.toString()}
        },
        UpdateExpression: "SET brutedata = :brutedata, expires = :expires",
        TableName : this.storeTable
    }, function (err, doc) { // `function` keyword needed so this will refer to aws response -- likely a way to do this with promises.
        if (err) {
            console.error(err);
            typeof callback == 'function' && callback(err, null);
        }
        else {
            typeof callback == 'function' && callback.apply(this, arguments);
        }
    });
};
DynamoStore.prototype.get = function (key, callback) {
    var storeKey = this.options.prefix+key;

    this.db.getItem({
        Key: {
            "storeKey": { "S" : storeKey}
        },
        TableName : this.storeTable
    }, (err, doc) => { // no function keyword cause we need this to refer to instance for storeTable
            if (err) {
                console.error(err);
                typeof callback == 'function' && callback(err, null);
            } else {
                var brutedata;
                if (doc.Item && doc.Item.expires.N < new Date().getTime()) {
                    db.deleteItem({
                        Key: {
                            "storeKey": {"S": storeKey}
                        },
                        TableName: this.storeTable
                    });
                }
                if (doc.Item) {
                    brutedata = JSON.parse(doc.Item.brutedata.S);
                    brutedata.lastRequest = new Date(brutedata.lastRequest);
                    brutedata.firstRequest = new Date(brutedata.firstRequest);
                }
                typeof callback == 'function' && callback(err, brutedata);
            }
    });
};

DynamoStore.prototype.clean = function() {
    var timenow = new Date().getTime();
    this.db.scan({
        TableName: this.storeTable,
        ExpressionAttributeValues:{
            ":timenow": {"N": timenow.toString()}
        },
        FilterExpression: "expires < :timenow",
        ReturnConsumedCapacity: "TOTAL"
    }, (err, doc) => { // no function keyword for access to this.storeTable
        if (err);
        else {
            var expireddata = doc.Items;
            for (var p in expireddata) {
                this.db.deleteItem({
                    Key: {
                        "storeKey": {"S": expireddata[p].storeKey.S}
                    },
                    TableName: this.storeTable
                }, (err, doc) => {
                    if (err) ;
                });
            }
        }
    })
}

DynamoStore.prototype.reset = function (key, callback) {
    var storeKey = this.options.prefix+key;

    this.db.deleteItem({
        Key: {
            "storeKey": { "S": storeKey}
        },
        TableName : this.storeTable
    }, function() { // function keyword needed for this to be aws response.
        typeof callback == 'function' && callback.apply(this, arguments);
    });
};

DynamoStore.defaults = {
    prefix: ''
};
