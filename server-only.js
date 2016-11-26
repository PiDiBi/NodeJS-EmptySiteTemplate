/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var http = require('http');
var path = require('path');

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var NestStrategy = require('passport-nest').Strategy;
var session = require('express-session');
var EventSource = require('eventsource');
var openurl = require('openurl');

var data;

// Change for production apps.
// This secret is used to sign session ID cookies.
var SUPER_SECRET_KEY = 'keyboard-cat';

// This API will emit events from this URL.
var NEST_API_URL = 'https://developer-api.nest.com';

startStreaming(process.env.NEST_TOKEN);
var connectionString = process.env.IOT_CONN;

// use factory function from AMQP-specific package
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;

// AMQP-specific factory function returns Client object from core package
var client = clientFromConnectionString(connectionString);

/**
 * Start REST Streaming device events given a Nest token.
 */
function startStreaming(token) {
  var source = new EventSource(NEST_API_URL + '?auth=' + token);

  source.addEventListener('put', function(e) {
    //console.log('\n' + e.data);
    data = JSON.parse(e.data).data;
    var clearedData = JSON.stringify(JSON.parse(e.data).data.devices);
    console.log('\n' + clearedData);    

    // use Message object from core package
    var Message = require('azure-iot-device').Message;

    var connectCallback = function (err) {
      if (err) {
        console.error('Could not connect: ' + err);
      } else {
        console.log('Client connected');
        var msg = new Message(clearedData);
        client.sendEvent(msg, function (err) {
          if (err) {
            console.log(err.toString());
          } else {
            console.log('Message sent');
          };
        });
      };
    };
    client.open(connectCallback);


  });

  source.addEventListener('open', function(e) {
    console.log('Connection opened!');
  });

  source.addEventListener('auth_revoked', function(e) {
    console.log('Authentication token was revoked.');
    // Re-authenticate your user here.
  });

  source.addEventListener('error', function(e) {
    if (e.readyState == EventSource.CLOSED) {
      console.error('Connection was closed! ', e);
    } else {
      console.error('An unknown error occurred: ', e);
    }
  }, false);
}

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: SUPER_SECRET_KEY,
  resave: false,
  saveUninitialized: false
}));

app.get('/', function(req, res) {
  res.send(data.devices);
});

/**
 * Get port from environment and store in Express.
 */
var port = process.env.PORT || 3000;
app.set('port', port);

/**
 * Create HTTP server.
 */
var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);

//openurl.open('http://' + process.env.host + ':' + port + '/auth/nest');
//console.log('Please click Accept in the browser window that just opened.');
