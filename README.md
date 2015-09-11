# express-brute-dynamo
AWS-SDK based DynamoDB adapter for the express-brute middleware

Installation
------------
  via npm:

      $ npm install express-brute-dynamo

Usage
-----
``` js

var app = express();
var ExpressBrute = require('express-brute');
var AWS = require('aws-sdk');
AWS.config.update({ region: 'eu-west-1' });
var db = new AWS.DynamoDB();
var DynamoStore = require('express-brute-dynamo');
var tableName = "brutefailure";

store = new DynamoStore(db, tableName); // stores state in DynamoDB

setInterval(function() {
    DynamoStore.clean();
}, 500000);// cleaning database of brutefailure

var bruteforce = new ExpressBrute(store, {
    freeRetries: 5,
    minWait: 5*60*1000, // 5 minutes
    maxWait: 30*60*1000, // 30 minutes
    lifetime: 6*60*60 // 6 hours
});

app.post('/login',
    bruteforce.prevent, // error 429 if we hit this route too often
    function (req, res, next) {
        res.send('Welcome!');
    }
);
