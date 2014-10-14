/*
 * Copyright 2014 Johannes Donath <johannesd@evil-co.com>
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * 	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var irc = require ('irc');
var fs = require ('fs');
var schedule = require ('node-schedule');
var _ = require ('underscore');
var config = require ('./config.js');

// define constants
var PREFIXES = ['~', '&', '@', '%'];
var MODES = ['q', 'a', 'o', 'h'];

// initialize variables
var patterns = { };
var ops = { };
var jokes = [ ];

// create a new client
var client = new irc.Client (config.server.address, config.nickname, {
	userName:	config.username,
	realName:	config.realname,

	port:		config.server.port,
	secure:		config.server.secure,
	selfSigned:	config.server.selfSigned
});

/**
 * Sets a new pattern.
 * @param channel The channel.
 * @param pattern The pattern.
 */
function setPattern (channel, pattern) {
	// set pattern
	patterns[channel.toLowerCase()] = pattern;

	// write file
	fs.writeFile ('./channel/' + channel.substring (1), pattern, {
		encoding: 'UTF-8'
	});
}

/**
 * Syncs a pattern.
 * @param channel The channel.
 */
function syncPattern (channel) {
	// check whether we're op
	if (!_.contains (ops[channel.toLowerCase()], config.nickname.toLowerCase())) {
		// log
		console.log ('Could not sync topic in channel ' + channel + ': Not enough permissions.');

		// stop further execution
		return;
	}

	// get pattern
	var pattern = patterns[channel.toLowerCase()];

	// replace variables
	pattern = pattern.replace ('{joke}', jokes[Math.floor(Math.random () * jokes.length)]);

	// set topic
	client.send ('TOPIC', channel, pattern);
}

/**
 * Joins a channel.
 * @param channel The channel.
 */
function join (channel, pattern) {
	// initialize elements
	patterns[channel.toLowerCase()] = pattern;
	ops[channel.toLowerCase()] = [];

	// join channel
	client.join (channel);
}

/**
 * Parts a channel.
 * @param channel The channel.
 */
function part (channel) {
	// remove elements
	patterns[channel.toLowerCase()] = null;
	ops[channel.toLowerCase()] = null;

	// delete file
	fs.unlink ('./channel/' + channel.substring (1).toLowerCase());

	// part channel
	client.part (channel);
}

// create scheduler rule
var schedulerRule = new schedule.RecurrenceRule ();
schedulerRule.minute = 0;

schedule.scheduleJob (schedulerRule, function () {
	// log
	console.log ('Scheduler is executing ...');

	// updating topics of all channels with a joke in their topic
	_.each (patterns, function (value, channel) {
		// skip channels without a joke
		if (value.indexOf ('{joke}') < 0) return true;

		// update channel
		console.log ('Updating topic of channel ' + channel + '.');
		syncPattern (channel);
	});
});

// hook methods
client.on ('message#', function (nick, to, text, message) {
	// split message
	var messageEx = text.split (' ');

	// operator only as of this point
	if (!_.contains (ops[to.toLowerCase()], nick.toLowerCase())) {
		// notify user
		client.say (to, '(' + nick + ') You do not have access to this command.');

		// skip further execution
		return;
	}

	// handle pattern command
	if (text.indexOf ('?topic') == 0) {
		// grab pattern
		var pattern = text.substring ((messageEx[0].length + 1));

		// verify length
		if (messageEx.length < 2 || pattern == "") {
			// print pattern
			client.say (to, irc.colors.wrap ('dark_blue', 'The topic pattern is currently set to: ') + patterns[to.toLowerCase()]);

			// skip further execution
			return;
		}

		// sets a new pattern
		console.log ('Pattern for channel ' + to + ' has been set to "' + pattern + '".');
		setPattern (to, pattern);

		// sync pattern
		syncPattern (to);

		// skip further execution
		return;
	}

	// handle sync command
	if (text.indexOf ('?sync') == 0) {
		// sync
		syncPattern(to);

		// skip further execution
		return;
	}

	// handle join command
	if (text.indexOf ('?join') == 0) {
		// check for errors
		if (messageEx.length != 2) {
			// notify user
			client.say (to, '(' + nick + ') No channel specified.');

			// skip further execution
			return;
		}

		// join channel
		join (messageEx[1]);

		// notify users
		client.say (messageEx[1], nick + ' requested me to join this channel.');

		// skip further execution
		return;
	}

	// handle part command
	if (text.indexOf ('?part') == 0) {
		// notify
		client.say (to, '(' + nick + ') Leaving ...');

		// part channel
		part (to);
	}
});

client.on ('topic', function (channel, topic, nick, message) {
	if (patterns[channel.toLowerCase()] == undefined) {
		console.log ('No pattern found for channel ' + channel + '. Setting to "' + topic + '".');
		setPattern (channel, topic);
	}
});

client.on ('names', function (channel, names) {
	_.each (names, function (value, key) {
		if (_.contains (PREFIXES, value)) {
			console.log (key + ' seems to be an operator in channel ' + channel + '.');
			ops[channel.toLowerCase()].push (key.toLowerCase());
		}
	});
});

client.on ('+mode', function (channel, by, mode, argument, message) {
	// split argument
	var argumentEx = argument.split (' ');

	// iterate over users
	for (var i = 0; i < mode.length; i++) {
		// skip further execution if we reached the end
		if (i >= argumentEx.length) break;

		// check modes
		if (_.contains (MODES, mode.charAt (i))) {
			console.log (argumentEx[i] + ' has been promoted.');
			ops[channel.toLowerCase()].push (argumentEx[i].toLowerCase());
		}
	}
});

client.on ('-mode', function (channel, by, mode, argument, message) {
	// split argument
	var argumentEx = argument.split (' ');

	// iterate over users
	for (var i = 0; i < mode.length; i++) {
		// skip further execution if we reached the end
		if (i >= argumentEx.length) break;

		// check modes
		if (_.contains (MODES, mode.charAt (i))) {
			console.log (argumentEx[i] + ' has been demoted.');
			ops[channel.toLowerCase()].splice (ops[channel.toLowerCase()].indexOf (argumentEx[i].toLowerCase()), 1);
		}
	}
});

client.on ('registered', function () {
	// set modes
	if (config.server.mode != null) client.send ('MODE', config.nickname, config.server.mode);

	// read list of files
	var files = fs.readdirSync ('./channel/');

	// iterate over all files
	files.forEach (function (element) {
		join ('#' + element, fs.readFileSync ('./channel/' + element, {
			encoding: 'UTF-8'
		}))
	});
});

// load jokes
jokes = JSON.parse (fs.readFileSync ('./jokes.json'));