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

var username = "HarmonyBot",
    email    = "daddatv@live.se",
    password = "discordbot";

var express   = require('express'),
    app       = express(),
    http      = require('http').Server(app),
    fs        = require('fs'),
    _         = require('underscore'),
    remindMe  = require('./remindMe'),
    discordIO = require('discord.io'),
    bot       = new discordIO({
	    email:    email,
	    password: password,
	    autorun:  true
    });

var serverID = '114684402830671877',
    cGeneral = '114684402830671877',
    lastMessageID,
    lastRandom;

var commands = {}, keywords = [];

LoadCommands();

app.use('', express.static(__dirname + '/public'));


app.get('/', function (req, res)
{
	/*bot.username = username;
	 bot.email =  email;
	 bot.password = password;*/
	bot.connect();
	bot.setPresence();
});

bot.on('ready', function ()
{
	console.log("Connected!");
	console.log("Logged in as: ");
	console.log(bot.username + " [" + bot.id + "]");
	bot.setPresence({
		idle_since: null
	});

	bot.joinVoiceChannel('114684402830671878');
});


bot.on('message', function (user, userID, channelID, message, rawEvent)
{
	var lowerCaseMessage = message.toLowerCase();

	//region Command
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
	else
	//endregion
	{
		//region Keywords
		for (var i = 0; i < keywords.length; i++)
		{
			if (lowerCaseMessage.indexOf(keywords[i]) > -1)
			{
				var word = lowerCaseMessage.substr(lowerCaseMessage.indexOf(keywords[i]), keywords[i].length);
				data = commands.keywords[word];
				data.user = user;
				data.userID = userID;
				data.channelID = channelID;
				data.commandName = com;

				global[data.type](data);

				break;
			}
		}
		//endregion


	}


	lastMessageID = rawEvent.d.id;
});


//region Debugging
bot.on('err', function (err)
{
	console.log(err.data);
	console.log(err);
});

bot.on('disconnected', function ()
{
	console.log("Bot disconnected!");
});
//endregion


function SendMessage (message, id, doFormat)
{
	if (message.indexOf("http") === -1 && (doFormat == undefined || doFormat == true))
	{
		message = '```' + message + '```';
	}

	bot.sendMessage({
		to:      id,
		message: message
	});
}

function LoadCommands ()
{
	fs.readFile('commands.json', function (err, data)
	{
		if (!err)
		{
			commands = JSON.parse(data);
			keywords = Object.keys(commands.keywords);
			console.log("Successfully loaded commands.json");
		}
		else
		{
			console.log(err);
		}
	});
}

function GetRandomInt (min, max)
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function DateToYYYYMMDD ()
{
	var date = new Date(),
	    yyyy = date.getFullYear().toString(),
	    mm   = (date.getMonth() + 1).toString(), // getMonth() is zero-based
	    dd   = date.getDate().toString();

	return yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]); // padding
}


http.listen(3000, function ()
{
	console.log('listening on *:3000');
});


//region Command functions

/*
 *   data variable:
 *   user(name), userID, channelID, commandName
 *   command variables can be found in commands.json
 */

Coinflip = function (data)
{
	if (data.choices.length < 3)
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
		console.log("Too many choices for Coinflip in " + data.commandName);
	}
};

Ludd = function (data)
{
	var tempRandom       = Math.random(), luddID,
	    endStringGeneral = ["!", "?", ", how disappointing.", ", a shame really.",
		    ", wow really??", "...", ", unbelievable as it may be!", ", 10/10!",
		    ". The other one is gonna have a bad time.", "'s cat. RIP", ", fucking weeb.", "-kun", "-senpai", "-san"],
	    endStringFludd   = ["! Snakes beware!", ", Meepo approved!", ", the sixth Meepo!", ", HWO DDI THSI HAPENNE!?!?!",
		    "! ONNNEEEEEE PUUUUNNNNNNNCHCHHCHH!!"],
	    endStringLudd    = [", the lazy bastard.", ", even if he doesn't work during lessons?", ", the procrastinating master of 1998",
		    ". Adma.", ", or was it Lövberg?"],
	    endString,
	    name;

	if (tempRandom > 0.5) // Fludd (115456516059824128)
	{
		luddID = '115456516059824128';

		endString = endStringGeneral;
		name = 'Karlsson';

		if (Math.random() > 0.85)
		{
			endString = endStringFludd;
		}
	}
	else // Ludd (107530243975176192)
	{
		luddID = '107530243975176192';
		name = 'Löfberg';

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

	//name = bot.servers[cGeneral].members[luddID].user.username;

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
		'file':    'img/' + data.image,
		'channel': data.channelID
	});
};

Love = function (data)
{
	switch (data.userID)
	{
		case '114686865172332544':
			SendMessage("Fuck you, Semen.", data.channelID);
			break;
		case '114667432852979712':
			SendMessage("Hello, master!", data.channelID);
			break;
		case '107530243975176192':
		case '115456516059824128':
			SendMessage("I love you too. But be careful of the other one, he's been making moves on me...", data.channelID);
			break;
		case '114791446246064137':
			SendMessage("Woah, so aggressive!", data.channelID);
			break;
		default:
			SendMessage("*awkward silence*", data.channelID);
	}
};

GetUserIDs = function (data)
{
	var userIDs = Object.keys(bot.servers[serverID].members);
	var message = "";

	for (var i = 0; i < userIDs.length; i++)
	{
		message += userIDs[i] + " | " + bot.servers[serverID].members[userIDs[i]].user.username + "\n";
	}

	SendMessage(message, data.userID);
};

PlaySound = function (data)
{
	bot.testAudio("114684402830671878", function (x)
	{
		x.playAudioFile("songs/megalovania.mp3");
		x.on('fileEnd', function() {
			SendMessage("Done playing file!", '117026961150312457');
		});
	});
};

// !remindme x [minute|minutes|hour|hours|day|days|month|months|year|years] message
// !remindme yyyy-mm-dd message
RemindMe = function (data)
{
	var delay;
	console.log(data);

	if (typeof data.pars[0] == Number)
	{
		console.log(data.pars[0]);
	}
};

ReloadCommands = function (data)
{
	if (data.userID == '114667432852979712')
	{
		LoadCommands();
		SendMessage("Reloading commands!", data.channelID);
	}
};

//endregion