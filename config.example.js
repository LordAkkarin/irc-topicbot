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

var Configuration = {

	/**
	 * The bot nickname.
	 * @var String
	 */
	nickname:		'MrTopicIdiot',

	/**
	 * The username (ident).
	 * @var String
	 */
	username:		'topic',

	/**
	 * The realname (gecos).
	 * @var String
	 */
	realname:		'I think I might be a bot ...',

	/**
	 * The server configuration.
	 */
	server:			{

		/**
		 * The server address.
		 * @var String
		 */
		address:		'irc.spi.gt',

		/**
		 * The server port.
		 * @var int
		 */
		port:			6697,

		/**
		 * Indicates whether a secure connection shall be established.
		 * @var bool
		 */
		secure:			true,

		/**
		 * Indicates whether a secure connection shall be established even if the certificate is self signed.
		 * @var bool
		 */
		selfSigned:		false,

		/**
		 * Sets the modes to set on the bot on connect.
		 * @var String
		 */
		mode:			'+B'
	}
};

// DO NOT TOUCH THIS
module.exports = Configuration;