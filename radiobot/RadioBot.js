/**
 * Created by adam.haglund on 2015-12-01.
 */

var DiscordIO  = require('discord.io'),
    ServerInfo = require('../serverInfo'),
    fs         = require('fs');

function RadioBot ()
{
	var bot = new DiscordIO({
		    email:    "thatguyyouhatenr2@gmail.com",
		    password: "radiobot",
		    autorun:  true
	    }),
	    vChannels;

	var commands,
	    songs,
	    currentChannel,
	    lastSong,
	    stream;

	this.StartRadio = function (data)
	{
		_StartRadio(data);
	};

	this.LoadCommands = function ()
	{
		fs.readFile('commands.json', function (err, data)
		{
			if (!err)
			{
				commands = JSON.parse(data);
				keywords = Object.keys(commands.keywords);
				console.log("RadioBot: Loaded commands.json");
			}
			else
			{
				console.log(err);
			}
		});
	};

	function PlaySongLoop (file, channel)
	{
		if (currentChannel !== channel)
		{
			bot.joinVoiceChannel(channel, function ()
			{
				currentChannel = channel;

				bot.testAudio({ channel: channel, stereo: true }, function (temp)
				{
					stream = temp;
					PlaySongLoop(songs[GetRandomInt(0, songs.length)], channel);
				});
			});
		}
		else
		{
			stream.playAudioFile(file);

			stream.on('fileEnd', function ()
			{
				if (currentChannel === channel)
				{
					PlaySongLoop(songs[GetRandomInt(0, songs.length)], channel);
				}
			});
		}
	}

	function _StartRadio (data)
	{
		var channelToJoin;

		fs.readdir('sounds/radio', function (err, files)
		{
			if (!err)
			{
				songs = files;

				if (data !== undefined && data.userID !== undefined)
				{
					// Check which, if any, channel the caller is in.
					for (var j = 0; j < Object.keys(vChannels).length; j++)
					{
						var channel = vChannels[Object.keys(vChannels)[j]];

						for (var k = 0; k < Object.keys(channel.members).length; k++)
						{
							var memberID = Object.keys(channel.members)[k];

							if (memberID === data.userID)
							{
								channelToJoin = channel.id;
								break;
							}
						}

						if (channelToJoin !== undefined)
						{
							break;
						}
					}
				}
				else
				{
					channelToJoin = ServerInfo.voiceChannels.bot1;
				}

				PlaySongLoop(songs[GetRandomInt(0, songs.length)], channelToJoin);
			}
			else
			{
				console.error("Couldn't load files");
			}
		});
	}

	function GetVoiceChannels ()
	{
		var allChannels   = bot.servers[ServerInfo.serverID].channels,
		    voiceChannels = {};

		for (var i = 0; i < Object.keys(allChannels).length; i++)
		{
			if (allChannels[Object.keys(allChannels)[i]].type === "voice")
			{
				voiceChannels[Object.keys(allChannels)[i]] = allChannels[Object.keys(allChannels)[i]];
			}
		}

		return voiceChannels;
	}

	function GetRandomInt (min, max)
	{
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	bot.on('ready', function ()
	{
		console.log("RadioBot connected!");

		vChannels = GetVoiceChannels();

		bot.setPresence({
			idle_since: null
		});

		_StartRadio();
	});

	bot.on('message', function (user, userID, channelID, message, rawEvent)
	{
		if (message[0] === "!")
		{
			var com, par = [];

			if (message.indexOf(" ") > -1)
			{
				com = message.substring(1, message.indexOf(" "));
			}
			else
			{
				com = message.substring(1);
			}

			par = message.substring(message.indexOf(" ") + 1).split(" ");

			console.log("Got command " + com + " from " + user + "!");

			var data = commands.commands[com];

			if (data != null)
			{
				data.user = user;
				data.userID = userID;
				data.channelID = channelID;
				data.commandName = com;
				data.pars = par;

				global[data.type](data);
			}
			else
			{
				console.log("Doesn't exist!");
			}
		}
	});
}

module.exports = RadioBot;