/* ##############
 * Discord.io documentation:
 * https://github.com/izy521/discord.io
 *
 * User IDs:
 * 107530243975176192 | real ludd
 * 114667432852979712 | bq
 * 114686865172332544 | Dinosurr
 * 114693293329219585 | Tja_Anton
 * 114745978925481989 | HenkeBenke
 * 114791446246064137 | TheChipsster
 * 115456516059824128 | real Ludd
 * 115789865286762502 | HarmonyBot
 */


// Bot info
var email    = "daddatv@live.se",
    password = "discordbot";

// Misc. vars
// Requires
const express    = require("express"),
      app        = express(),
      http       = require("http").Server(app),
      fs         = require("fs"),
      winston    = require("winston"),
      DiscordIO  = require("discord.io"),
      ServerInfo = require("./serverInfo"),
      remindMe   = require("./remindMe");

var bot, config;

//region Bot Init
fs.readFile("config.json", function (err, res)
{
	if (!err)
	{
		config = JSON.parse(res);

		if (!config.email || !config.password)
		{
			//console.log("Missing email or password in config file!");
			logger.error("Missing email or password in config file!");
		}
		else
		{
			bot = new DiscordIO({
				email:    config.email,
				password: config.password,
				autorun:  true
			});

			bot.on("ready", function ()
			{
				logger.info("Connected!");
				bot.setPresence({
					idle_since: null,
					game:       config.game || "poker against itself"
				});

				_StartBot();
			});
		}
	}
	else
	{
		logger.error("Couldn't read config.json!");
		throw new Error("InvalidConfigException");
	}
});
//endregion

var usePaths = ['rel'];
//region app.use Config
for (var i = 0; i < usePaths.length; i++)
{
	var temp = usePaths[i];

	app.use('/' + temp, function (req, res, next)
	{
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'POST');
		res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
		res.setHeader('Access-Control-Allow-Credentials', true);
		next();
	});
}
//endregion

//region Logger init
var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.File)({
			name:         "info-file",
			filename:     "output/session.log",
			level:        "info",
			stdErrLevels: ["infoSessionFile"]
		}),
		new (winston.transports.File)({
			name:      "error-file",
			filename:  "output/error.log",
			level:     "errorFile",
			showLevel: false
		}),
		new (winston.transports.Console)({
			name:         "error-redirect",
			level:        "error",
			stdErrLevels: ["errorFile", "errorConsole"]
		}),
		new (winston.transports.Console)({
			name:                            "error-console",
			level:                           "errorConsole",
			humanReadableUnhandledException: true
		})
	]
});

fs.writeFile("output/session.log", "");
//endregion

var _StartBot = function ()
{
	var stream,
	    lastMessageID,
	    lastRandom,
	    playing = false;

	var commands = {}, keywords = [];

	LoadCommands();

	app.use("", express.static(__dirname + "/public"));

	app.get("/rel", function (req, res)
	{
		LoadCommands();

		res("Reloaded!");
	});

	bot.on("message", function (user, userID, channelID, message, rawEvent)
	{
		var lowerCaseMessage = message.toLowerCase();

		//region Command
		if (message[0] === "!")
		{
			var com, par;

			if (message.indexOf(" ") > -1)
			{
				com = message.substring(1, message.indexOf(" "));
			}
			else
			{
				com = message.substring(1);
			}

			par = message.substring(message.indexOf(" ") + 1).split(" ");

			logger.log("debug", "Got command " + com + " from " + user + "!");

			var data = commands.commands[com];

			if (data != null)
			{
				data.user = user;
				data.userID = userID;
				data.channelID = channelID;
				data.messageID = rawEvent.d.id;
				data.commandName = com;
				data.pars = par;

				logger.info(user + " used command " + com + (par != undefined || par != "" ? " with parameters: " + par.toString() + "" : ""));
				global[data.type](data);
			}
			else
			{
				logger.info(user + " tried to use command " + com + " which doesn't exist");
			}
		}
		else
		//endregion
		{
			//region Keywords
			for (var i = 0; i < keywords.length; i++)
			{
				if (lowerCaseMessage.indexOf(keywords[i]) > -1)
				{
					var word = lowerCaseMessage.substr(lowerCaseMessage.indexOf(keywords[i]), keywords[i].length);
					//noinspection JSUnresolvedVariable
					data = commands.keywords[word];
					data.user = user;
					data.userID = userID;
					data.channelID = channelID;
					data.messageID = rawEvent.d.id;

					logger.info(user + " said keyword " + word);
					global[data.type](data);

					break;
				}
			}
			//endregion
		}


		lastMessageID = rawEvent.d.id;
	});


	//region Debugging
	bot.on("err", function (err)
	{
		logger.error(err.data);
		logger.error(err);
	});

	bot.on("disconnected", function ()
	{
		logger.info("Disconnected!");
	});
//endregion_StartBot();_StartBot();_StartBot();_StartBot();


	function SendMessage (message, id, doFormat)
	{
		if (message.indexOf("http") === -1 && (doFormat == undefined || doFormat == true))
		{
			message = "```" + message + "```";
		}

		bot.sendMessage({
			to:      id,
			message: message
		});
	}

	function PlaySound (file, channel, callback, finished)
	{
		var StartPlaying = function ()
		{
			bot.getAudioContext({ channel: channel, stereo: true }, function (streamPar)
			{
				stream = streamPar;
				stream.playAudioFile(file);
				playing = true;
				stream.channelID = channel;

				stream.once("fileEnd", function ()
				{
					playing = false;

					setTimeout(function ()
					{
						bot.leaveVoiceChannel(channel);
					}, 200);

					if (finished && typeof(finished) === "function")
					{
						finished();
					}
				});
			});
		};

		if (!playing)
		{
			logger.info("Joining " + channel + " to play " + file);

			bot.joinVoiceChannel(channel, function ()
			{
				StartPlaying();
			});
		}
	}


	function LoadCommands ()
	{
		fs.readFile("commands.json", function (err, data)
		{
			if (!err)
			{
				commands = JSON.parse(data);
				keywords = Object.keys(commands.keywords);
				logger.info("Successfully loaded commands.json");
			}
			else
			{
				logger.error(JSON.stringify(err));
			}
		});
	}

	//region Misc. Functions
	function GetRandomInt (min, max)
	{
		return Math.floor(Math.random() * (max - min + 1)) + min;
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

	function DateToDDMMYYYY ()
	{
		var date = new Date(),
		    yyyy = date.getFullYear().toString(),
		    mm   = (date.getMonth() + 1).toString(), // getMonth() is zero-based
		    dd   = date.getDate().toString();

		return (dd[1] ? dd : "0" + dd[0]) + "/" + (mm[1] ? mm : "0" + mm[0]) + " " + yyyy; // string
	}

	//endregion


	http.listen(config.port, function ()
	{
		require('dns').lookup(require('os').hostname(), function (err, add, fam)
		{
			console.log();
			logger.info("listening on " + add + ":" + config.port);
		});
	});


	//region Command functions

	/*   data variable:
	 *   user(name), userID, channelID, commandName
	 *   command variables can be found in commands.json
	 */

	Coinflip = function (data)
	{
		if (data.choices.length === 2)
		{
			var result;

			if (Math.random() > 0.5)
			{
				result = data.choices[0];
			}
			else
			{
				result = data.choices[1];
			}

			var message = data.message;
			message = message.replace("{result}", result);

			SendMessage(message, data.channelID);
		}
		else
		{
			logger.error("Too many/few choices for Coinflip in " + data.commandName);
		}
	};

	Ludd = function (data)
	{
		var tempRandom       = Math.random(), /*luddID,*/
		    endStringGeneral = ["!", "?", ", how disappointing.", ", a shame really.",
			    ", wow really??", "...", ", unbelievable as it may be!", ", 10/10!", " 5/7!",
			    ". The other one is gonna have a bad time.", "'s cat. RIP", ", fucking weeb.", "-kun", "-senpai", "-san"],
		    endStringFludd   = ["! Snakes beware!", ", Meepo approved!", ", the sixth Meepo!", ", HWO DDI THSI HAPENNE!?!?!",
			    "! ONNNEEEEEE PUUUUNNNNNNNCHCHHCHH!!"],
		    endStringLudd    = [", the lazy bastard.", ", even if he doesn't work during lessons?", ", the procrastinating master of 1998",
			    ". Adma."/*, ", or was it Lövberg?"*/],
		    endString,
		    name;

		if (tempRandom > 0.5) // Fludd (115456516059824128)
		{
			//luddID = "115456516059824128";

			endString = endStringGeneral;
			name = "Karlsson";

			if (Math.random() > 0.85)
			{
				endString = endStringFludd;
			}
		}
		else // Ludd (107530243975176192)
		{
			//luddID = "107530243975176192";
			name = "Löfberg";

			endString = endStringGeneral;

			if (Math.random() > 0.85)
			{
				endString = endStringLudd;
			}
		}

		var random = 0;
		do
		{
			random = GetRandomInt(0, endString.length - 1);
		} while (random == lastRandom);

		// Which line?
		endString = endString[random];

		var messageToSend = "\nAnd the best Ludd is...\n" + name + endString;

		SendMessage(messageToSend, data.channelID)
	};

	Random = function (data)
	{
		var random = 0;
		do
		{
			random = GetRandomInt(0, data.choices.length - 1);
		} while (random == lastRandom);

		SendMessage(data.choices[random], data.channelID);
	};

	Response = function (data)
	{
		data.message = data.message.replace("{user}", data.user);
		SendMessage(data.message, data.channelID, data.doFormat);
	};

	ImageResponse = function (data)
	{
		bot.uploadFile({
			"file":    "img/" + data.image,
			"channel": data.channelID
		});
	};

	Love = function (data)
	{
		switch (data.userID)
		{
			case "114686865172332544":
				SendMessage("Fuck you, Semen.", data.channelID);
				break;
			case "114667432852979712":
				SendMessage("Hello, master!", data.channelID);
				break;
			case "107530243975176192":
			case "115456516059824128":
				SendMessage("I love you too. But be careful of the other one, he's been making moves on me...", data.channelID);
				break;
			case "114791446246064137":
				SendMessage("Woah, so aggressive!", data.channelID);
				break;
			default:
				SendMessage("[awkward silence]", data.channelID);
		}
	};

	GetUserIDs = function (data)
	{
		var userIDs = Object.keys(bot.servers[ServerInfo.serverID].members);
		var message = "";

		for (var i = 0; i < userIDs.length; i++)
		{
			message += userIDs[i] + " | " + bot.servers[ServerInfo.serverID].members[userIDs[i]].user.username + "\n";
		}

		SendMessage(message, data.userID);
	};

	PlayAudio = function (data)
	{
		var userID        = data.userID,
		    //username      = data.user,
		    voiceChannels = GetVoiceChannels(),
		    file,
		    channelToJoin;

		// Get whole file name
		if (data.file === undefined)
		{
			file = data.pars[0];
			for (var i = 1; i < data.pars.length; i++)
			{
				try
				{
					file += " " + data.pars[i];
				} catch (e)
				{
					logger.error(e);
				}
			}
		}
		else if (data.file !== undefined && typeof data.file === "string")
		{
			file = data.file;
		}
		else if (data.file[1] !== undefined)
		{
			var rand = GetRandomInt(0, data.file.length);

			file = data.file[rand];
		}

		file = "sounds/" + file + ".mp3";

		// Check if already playing a file, queue/deny?
		if (playing)
		{
			SendMessage("Sorry, I'm already playing a file!", data.channelID);
			return;
		}

		// Check if file exists
		fs.exists(file, function (res)
		{
			if (res === false)
			{
				SendMessage("That file doesn't exist!\nGet a list of all the sounds with !sounds", data.channelID);
				return;
			}
		});

		// Check which, if any, channel the caller is in.
		for (var j = 0; j < Object.keys(voiceChannels).length; j++)
		{
			var channel = voiceChannels[Object.keys(voiceChannels)[j]];

			for (var k = 0; k < Object.keys(channel.members).length; k++)
			{
				var memberID = Object.keys(channel.members)[k];

				if (memberID === userID)
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

		PlaySound(file, channelToJoin);
	};

	StopAudio = function ()
	{
		try
		{
			stream.stopAudioFile();
			playing = false;

			setTimeout(function ()
			{
				bot.leaveVoiceChannel(stream.channelID);
			}, 200);
		} catch (e)
		{
			logger.error(e);
		}
	};

	ListCommands = function (data)
	{
		LoadCommands();

		var message = "",
		    keys    = Object.keys(commands.commands).sort();

		for (var i = 0; i < keys.length; i++)
		{
			if (commands.commands[keys[i]].donotlist !== true)
			{
				message += "!" + keys[i] + ": " + commands.commands[keys[i]].desc + "\n";
			}
		}

		SendMessage(message, data.channelID);
	};

	ListSounds = function (data)
	{
		var message = "";

		fs.readdir("sounds", function (err, files)
		{
			if (!err)
			{
				files = files.sort();

				for (var i = 0; i < files.length; i++)
				{
					var file = files[i];

					if ((file.lastIndexOf(".mp3") > -1) || (file.lastIndexOf(".wav") > -1))
					{
						message += file.substr(0, file.lastIndexOf(".")) + "\n";
					}
				}

				SendMessage(message, data.channelID);
			}
		});
	};

	// !remindme x [minute|minutes|hour|hours|day|days|month|months|year|years] message
	// !remindme yyyy-mm-dd message
	RemindMe = function (data)
	{
		//var delay;
		console.log(data);

		if (typeof data.pars[0] == Number)
		{
			console.log(data.pars[0]);
		}
	};

	ReloadCommands = function (data)
	{
		if (data.userID == "114667432852979712")
		{
			LoadCommands();
			SendMessage("Reloading commands!", data.channelID);
		}
	};

	DeleteThis = function (data)
	{
		bot.deleteMessage({
			messageID: data.messageID,
			channel:   data.channelID
		});

		if (data.message != null && data.message != "")
			SendMessage(data.message, data.channelID);
	};
	//endregion
};
