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
	    lastSong,
	    currChan,
	    stream,
	    radioOn = true;

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

	function PlaySong (file, channel)
	{
		var StartPlaying = function ()
		{
			bot.testAudio({ channel: channel, stereo: true }, function (streamPar)
			{
				console.log(file);
				stream = streamPar;
				stream.playAudioFile("../sounds/radio/" + file);
				stream.channelID = channel;


				stream.on('fileEnd', function ()
				{
					if (radioOn === true)
					{
						var newSong = GetRandomInt(0, songs.length - 1);
						do {
							newSong = GetRandomInt(0, songs.length - 1);
						} while (newSong === lastSong);

						PlaySong(songs[newSong], channel);
					}
				});
			});
		};

		if (currChan !== channel)
		{
			bot.joinVoiceChannel(channel, function ()
			{
				currChan = channel;
				StartPlaying();
			});
		}
		else
		{
			StartPlaying();
		}
	}

	function _StartRadio (data)
	{
		var channelToJoin;

		fs.readdir('../sounds/radio', function (err, files)
		{
			if (!err)
			{
				songs = files;

				//region Channel selection
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
				//endregion

				PlaySong(songs[GetRandomInt(0, songs.length - 1)], channelToJoin);
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
RadioBot();