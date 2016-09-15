/*
 * Discord.io documentation:
 * https://github.com/izy521/discord.io
 */

// Requires
require("datejs");
var express    = require("express"),
    app        = express(),
    http       = require("http").Server(app),
    https      = require("https"),
    fs         = require("fs"),
    winston    = require("winston"),
    urban      = require("./urban-dictionary/urban-node"),
    Discord    = require("discord.io"),
    mStatscord = require("./statscord/statscord"),
    mRemindMe  = require("./remind-me/remind-me"),
    ServerInfo = require("./serverInfo");

var bot,
    statscord,
    remindMe,
    config,
    debugMode = false;

var messagesSent = 0;

var usePaths = ['rel'];
//region app.use Config
for (var i = 0; i < usePaths.length; i++) {
    var temp = usePaths[i];

    app.use('/' + temp, function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        next();
    });
}
//endregion


//region Logger init
var now = Date.parse("now").toString("yyyy-MM-dd HHmmss");

fs.closeSync(fs.openSync("./output/" + now + ".log", 'w'));
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console),
        new (winston.transports.File)({
            filename: "./output/" + now + ".log"
        }),
        new (winston.transports.File)({
            name:      "error-file",
            filename:  "output/error.log",
            silent:    false,
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
now = null;

//endregion


//region Bot Init
fs.readFile("config.json", function (err, res) {
    if (!err) {
        config = JSON.parse(res);

        // DEBUG MODE
        if (config.debug === true) {
            debugMode = true;
            console.log("[DEBUG MODE ENABLED]");
        }
        else {
            logger.remove(logger.transports["console"]);
        }

        // CONFIG CHECKING
        if ((!config.email || !config.password) && !config.token) {
            logger.error("Missing way to log in in config file!");
        }
        else {
            if (config.token) {
                bot =  new Discord.Client({
                    token:   config.token,
                    autorun: true
                });
            }
            else {
                bot = new Discord.Client({
                    email:    config.email,
                    password: config.password,
                    autorun:  true
                });
            }

            bot.on("ready", function () {
                logger.info("Connected!");
                bot.setPresence({
                    idle_since: null,
                    game:       config.game || "poker against itself"
                });

                // Statscord
                if (config.statscord) {
                    statscord = new mStatscord(config.statsInterval, config.databases.statscord);
                    statscord.on("error", function (err) {
                        logger.error("Statscord encountered an error:\n" + err);
                    });
                }

                //region RemindMe
                remindMe = new mRemindMe(config.databases.remindme);
                remindMe.on("error", function (err) {
                    logger.error("RemindMe encountered an error:\n" + JSON.stringify(err, null, 2));
                });
                remindMe.on("log", function (log) {
                    logger.info("RemindMe: " + log);
                });
                //endregion

                try {
                    _StartBot();
                } catch (e) {
                    logger.error(bot.username + " has crashed!\n" + JSON.stringify(e));
                    _StartBot(true);
                }
            });
        }
    }
    else {
        logger.error("Couldn't read config.json!");
        throw new Error("InvalidConfigException");
    }
});
//endregion


var _StartBot = function (didCrash) {
    var stream,
        lastMessageID,
        lastRandom,
        playing = false;

    var commands = {}, keywords = [];

    if (didCrash == true)
        SendMessage("I HAVE CRASHED BUT RESTARTED aaaaaa", ServerInfo.users.bq);

    LoadCommands();

    remindMe.on("message", function (channelID, message) {
        SendMessage(message, channelID);
    });

    //region Web listens

    //app.use("", express.static(__dirname + "/public"));

    app.get("/reload", function (req, res) {
        LoadCommands();

        res("Reloaded!");
    });

    app.get("/game/*", function (req, res) {
        bot.setPresence({game: req.params[0]});
        config.game = req.params[0];
        WriteConfig();

        res.send("<h1>Now \"playing\": <i>" + req.params[0] + "</i></h1>");
    });

    //endregion

    bot.on("message", function (user, userID, channelID, message, rawEvent) {
        if (userID == bot.id && (channelID == ServerInfo.textChannels.bot && !debugMode) || (debugMode && (channelID != ServerInfo.textChannels.bot)))
            return;

        if (channelID != "126784860210593792")
            messagesSent++;

        var lowerCaseMessage = message.toLowerCase();

        //region Command
        if (message[0] === "!" && rawEvent.d.attachments.length === 0) {
            var com, par;

            if (message.indexOf(" ") > -1) {
                com = message.substring(1, message.indexOf(" "));
            }
            else {
                com = message.substring(1);
            }

            // Split at "!command |par par par", then split "par par par" into array
            par = message.substring(message.indexOf(" ") + 1).split(" ");

            if (par[0] == "!" + com) {
                par = null;
            }

            logger.debug("Got command " + com + " from " + user + "!");

            //noinspection JSUnresolvedVariable
            var data = commands.commands[com];

            if (data != null) {
                data.user = user;
                data.userID = userID;
                data.channelID = channelID;
                data.messageID = rawEvent.d.id;
                data.msg = message;
                data.commandName = com;
                data.pars = par;

                logger.info(user + " used command " + com + (data.pars ? " with parameters: " + data.pars + "" : ""));

                try {
                    global[data.type](data);
                } catch (e) {
                    logger.error(e);
                    SendMessage("I have encountered an error running command !" + data.commandName + "\n\n" + e, ServerInfo.users.bq);
                }
            }
            else {
                logger.info(user + " tried to use command " + com + " which doesn't exist");
            }
        }
        /*else if (rawEvent.d.attachments.length === 1)
         {
         var data = {};
         data.userID = userID;

         ChangeImage(data, rawEvent.d.attachments[0]);
         }*/
        else
        //endregion
        {
            //region Keywords
            for (var i = 0; i < keywords.length; i++) {
                if (lowerCaseMessage.indexOf(keywords[i]) > -1) {
                    var word = lowerCaseMessage.substr(lowerCaseMessage.indexOf(keywords[i]), keywords[i].length);
                    //noinspection JSUnresolvedVariable
                    data = commands.keywords[word];
                    data.user = user;
                    data.userID = userID;
                    data.channelID = channelID;
                    data.messageID = rawEvent.d.id;
                    data.msg = message;

                    logger.info(user + " said keyword " + word);
                    global[data.type](data);

                    break;
                }
            }
            //endregion
        }

        lastMessageID = rawEvent.d.id;
    });

    if (config.statscord) {
        statscord.on("GetStats", function () {
            logger.info("Updated database with current statistics");
            statscord.updateUserStats(messagesSent, GetOnlineUsers("114684402830671877") - 1); // At least one is a bot (this one! :D)
            messagesSent = 0;
        });

        statscord.on("log", function (logString) {
            logger.info(logString);
        });
    }


    //region Debugging
    bot.on("err", function (err) {
        logger.error(err.data);
        logger.error(err);
    });

    bot.on("disconnected", function () {
        logger.info("Gateway Disconnected!");
        // TODO: Fix crashing
    });
    //endregion


    /**
     * SendMessage
     * @param message
     * @param id
     * @param doFormat
     */
    function SendMessage(message, id, doFormat) {
        if (message.indexOf("http") === -1 && (doFormat == undefined || doFormat == true)) {
            message = "```" + message + "```";
        }

        message = message.replace("%botname%", bot.name);

        bot.sendMessage({
            to:      id,
            message: message
        });
    }

    function PlaySound(file, channel, callback, finished) {
        var StartPlaying = function () {
            bot.getAudioContext({
                channel: channel,
                stereo:  true
            }, function (streamPar) {
                stream = streamPar;
                stream.playAudioFile(file);
                playing = true;
                stream.channelID = channel;

                stream.once("fileEnd", function () {
                    playing = false;

                    setTimeout(function () {
                        bot.leaveVoiceChannel(channel);
                    }, 200);

                    if (finished && typeof(finished) === "function") {
                        finished();
                    }
                });
            });
        };

        if (!playing) {
            logger.info("Joining " + channel + " to play " + file);

            bot.joinVoiceChannel(channel, function () {
                StartPlaying();
            });
        }
    }


    function LoadCommands() {
        if (!debugMode) {
            require("https").get("https://dl.dropboxusercontent.com/u/29393121/hmny/commands.json", function (res) {
                var response = "";

                res.on("data", function (chunk) {
                    response += chunk;
                });

                res.on("end", function () {
                    try {
                        commands = JSON.parse(response);
                        keywords = Object.keys(commands.keywords);
                        fs.writeFile("commands.json", response);
                        logger.info("Successfully loaded commands from cloud");
                    } catch (e) {
                        LoadLocalCommands();
                    }
                });

                res.on("error", function (e) {
                    logger.error(e);

                    LoadLocalCommands();
                });

                function LoadLocalCommands() {
                    fs.readFile("commands.json", function (err, data) {
                        if (!err) {
                            commands = JSON.parse(data);
                            keywords = Object.keys(commands.keywords);
                            logger.info("Successfully loaded local commands");
                        }
                        else {
                            logger.error(JSON.stringify(err));
                        }
                    });
                }
            });
        }
        else {
            fs.readFile("commandsTesting.json", function (err, data) {
                if (!err) {
                    commands = JSON.parse(data);
                    keywords = Object.keys(commands.keywords);
                    logger.info("Successfully loaded commandsTesting.json");
                }
                else {
                    logger.error(JSON.stringify(err));
                }
            });
        }
    }

    function WriteConfig() {
        fs.writeFile("config.json", JSON.stringify(config, null, 2));
    }

    //region Misc. Functions
    function GetRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function GetVoiceChannels() {
        var allChannels   = bot.servers[ServerInfo.serverID].channels,
            voiceChannels = {};

        for (var i = 0; i < Object.keys(allChannels).length; i++) {
            if (allChannels[Object.keys(allChannels)[i]].type === "voice") {
                voiceChannels[Object.keys(allChannels)[i]] = allChannels[Object.keys(allChannels)[i]];
            }
        }

        return voiceChannels;
    }

    /**
     * @return {number}
     */
    function GetOnlineUsers(serverID) {
        var members = bot.servers[serverID].members,
            keys    = Object.keys(members),
            temp    = 0;

        for (var i = 0; i < keys.length; i++) {
            if (members[keys[i]].status == "online" || members[keys[i]].status == "idle")
                temp++;
        }

        return temp;
    }

    //endregion


    //region Command functions

    /*   data variable:
     *   user(name), userID, channelID, commandName, messageID, commandName, pars
     *   command variables can be found in commands.json
     */

    Coinflip = function (data) {
        if (data.choices.length === 2) {
            var result;

            if (Math.random() > 0.5) {
                result = data.choices[0];
            }
            else {
                result = data.choices[1];
            }

            var message = data.message;
            message = message.replace("{result}", result);

            SendMessage(message, data.channelID);
        }
        else {
            logger.error("Too many/few choices for Coinflip in " + data.commandName);
        }
    };

    Ludd = function (data) {
        var tempRandom       = Math.random(),
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
            endString = endStringGeneral;
            name = "Karlsson";

            if (Math.random() > 0.65) {
                endString = endStringFludd;
            }
        }
        else // Ludd (107530243975176192)
        {
            name = "Löfberg";

            endString = endStringGeneral;

            if (Math.random() > 0.65) {
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

    Random = function (data) {
        var random = 0;
        do
        {
            random = GetRandomInt(0, data.choices.length - 1);
        } while (random == lastRandom);

        SendMessage(data.choices[random], data.channelID);
    };

    Response = function (data) {
        data.message = data.message.replace("{user}", data.user);
        SendMessage(data.message, data.channelID, data.doFormat);
    };

    ImageResponse = function (data) {
        bot.uploadFile({
            "file": "img/" + data.image,
            "to":   data.channelID
        });
    };

    Love = function (data) {
        switch (data.userID) {
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

    GetUserIDs = function (data) {
        var userIDs = Object.keys(bot.servers[ServerInfo.serverID].members);
        var message = "";

        for (var i = 0; i < userIDs.length; i++) {
            message += userIDs[i] + " | " + bot.servers[ServerInfo.serverID].members[userIDs[i]].user.username + "\n";
        }

        SendMessage(message, data.userID);
    };

    PlayAudio = function (data) {
        var userID        = data.userID,
            //username      = data.user,
            voiceChannels = GetVoiceChannels(),
            file,
            channelToJoin;

        // Get whole file name
        if (data.file === undefined) {
            file = data.pars[0];
            for (var i = 1; i < data.pars.length; i++) {
                try {
                    file += " " + data.pars[i];
                } catch (e) {
                    logger.error(e);
                }
            }
        }
        else if (data.file !== undefined && typeof data.file === "string") {
            file = data.file;
        }
        else if (data.file[1] !== undefined) {
            var rand = GetRandomInt(0, data.file.length);

            file = data.file[rand];
        }

        file = "sounds/" + file + ".mp3";

        // Check if already playing a file, queue/deny?
        if (playing) {
            SendMessage("Sorry, I'm already playing a file!", data.channelID);
            return;
        }

        // Check if file exists
        fs.exists(file, function (res) {
            if (res === false) {
                SendMessage("That file doesn't exist!\nGet a list of all the sounds with !sounds", data.channelID);
            }
            else {
                // Check which, if any, channel the caller is in.
                for (var j = 0; j < Object.keys(voiceChannels).length; j++) {
                    var channel = voiceChannels[Object.keys(voiceChannels)[j]];

                    for (var k = 0; k < Object.keys(channel.members).length; k++) {
                        var memberID = Object.keys(channel.members)[k];

                        if (memberID === userID) {
                            channelToJoin = channel.id;
                            break;
                        }
                    }

                    if (channelToJoin !== undefined) {
                        break;
                    }
                }

                PlaySound(file, channelToJoin);
            }
        });
    };

    StopAudio = function () {
        try {
            stream.stopAudioFile();
            playing = false;

            setTimeout(function () {
                bot.leaveVoiceChannel(stream.channelID);
            }, 200);
        } catch (e) {
            logger.error(e);
        }
    };

    ListCommands = function (data) {
        LoadCommands();

        var message = "",
            keys    = Object.keys(commands.commands).sort();

        for (var i = 0; i < keys.length; i++) {
            if (commands.commands[keys[i]].donotlist !== true) {
                message += "!" + keys[i] + ": " + commands.commands[keys[i]].desc + "\n";
            }
        }

        SendMessage(message, data.channelID);
    };

    ListSounds = function (data) {
        var message = "";

        fs.readdir("sounds", function (err, files) {
            if (!err) {
                files = files.sort();

                for (var i = 0; i < files.length; i++) {
                    var file = files[i];

                    if ((file.lastIndexOf(".mp3") > -1) || (file.lastIndexOf(".wav") > -1)) {
                        message += file.substr(0, file.lastIndexOf(".")) + "\n";
                    }
                }

                SendMessage(message, data.channelID);
            }
        });
    };

    RemindMe = function (data) {
        if (data.pars.length < 1) {
            SendMessage("Usage: !remindme [DateJS.com date/time] \"[message]\"");
            return;
        }

        var input = "";

        for (var i = 0; i < data.pars.length; i++) {
            input += data.pars[i] + " ";
        }
        input = input.trim();

        data.message = input.substring(input.indexOf("\"") + 1, input.lastIndexOf("\""));
        data.when = input.substr(0, input.indexOf("\""));

        remindMe.addReminder(data);
    };

    RemindMeToo = function (data) {
        if (!isNaN(data.pars[0])) {
            remindMe.copyReminder(data);
        }
        else {
            SendMessage("Usage: !remindmetoo [Reminder ID]", data.channelID);
        }
    };

    RemindMeCancel = function (data) {
        remindMe.removeReminder(data);
    };

    ReloadCommands = function (data) {
        if (data.userID == "114667432852979712") {
            LoadCommands();
            SendMessage("Reloading commands!", data.channelID);
        }
    };

    DeleteThis = function (data) {
        bot.deleteMessage({
            messageID: data.messageID,
            channel:   data.channelID
        });

        if (data.message != null && data.message != "")
            SendMessage(data.message, data.channelID);
    };

    LookUpUrbanDictionary = function (data) {
        var input = "";

        if (!data.pars) {
            SendMessage("Usage: !urban [words here] [options: -last -(number)]\nQuite simple, yes?", data.channelID);
            return;
        }

        if (data.pars.length < 2) {
            input = data.pars[0];
        }
        else {
            for (var i = 0; i < data.pars.length; i++) {
                input += data.pars[i] + " ";
            }
            input = input.trim();
        }

        urban.LookUp(input, function (definition) {
            SendMessage(definition, data.channelID, false);
        });
    };

    Assemble = function (data) {
        //noinspection SillyAssignmentJS
        config.assemble = config.assemble;

        var first    = data.pars[0],
            gameList = Object.keys(config.assemble),
            game, message;

        var send = function (message, format) {
            format === false ? SendMessage(message, data.channelID, false) : SendMessage(message, data.channelID)
        };

        var updateConfig = function () {
            fs.writeFile('config.json', JSON.stringify(config, null, 2));
        };

        if (data.pars) {
            if (first[0] === "-") {
                switch (first) {
                    case "-add":
                        // Add if not in game-group already
                        try {
                            game = data.pars[1].toLowerCase();

                            if (game) {
                                if (config.assemble[game].indexOf(data.userID) < 0) {
                                    config.assemble[game].push(data.userID);
                                    send("Added to " + game);
                                    updateConfig();
                                }
                                else {
                                    send("Already in " + game);
                                }
                            }
                        } catch (e) {
                            send("No game specified");
                        }
                        break;

                    case "-remove":
                        // Remove if in game-group
                        try {
                            game = data.pars[1].toLowerCase();

                            var index = config.assemble[game].indexOf(data.userID);
                            if (game) {
                                if (index > -1) {
                                    config.assemble[game].splice(index, 1);
                                    send("Removed from " + game);
                                    updateConfig();
                                }
                                else {
                                    send("Removed from " + game);
                                }
                            }
                        } catch (e) {
                            send("No game specified");
                        }
                        break;

                    case "-addother":
                        // Add if not in game-group already
                        if (data.pars[1] && data.pars[1].indexOf('<@') > -1 && data.pars[2]) {
                            try {
                                game = data.pars[2].toLowerCase();
                                var userID = data.pars[1].substr(2, data.pars[1].length - 3);

                                if (game) {
                                    if (config.assemble[game].indexOf(userID) < 0) {
                                        config.assemble[game].push(userID);
                                        send("Added <@" + userID + "> to " + game, false);
                                        updateConfig();
                                    }
                                    else {
                                        send("Not in " + game);
                                    }
                                }
                            } catch (e) {
                                send("No game specified");
                            }
                        }
                        else {
                            send("Invalid options");
                        }
                        break;

                    case "-removeother":
                        // Remove if in game-group
                        if (data.pars[1] && data.pars[1].indexOf('<@') > -1 && data.pars[2]) {
                            try {
                                game = data.pars[2].toLowerCase();
                                var userID = data.pars[1].substr(2, data.pars[1].length - 3);

                                if (game) {
                                    var index = config.assemble[game].indexOf(userID);
                                    if (index > -1) {
                                        config.assemble[game].splice(index, 1);
                                        send("Removed <@" + userID + "> from " + game, false);
                                        updateConfig();
                                    }
                                    else {
                                        send("Already in " + game);
                                    }
                                }
                            } catch (e) {
                                send("No game specified");
                            }
                        }
                        else {
                            send("Invalid options");
                        }
                        break;

                    case "-list":
                        message = "The list of games:";
                        for (var i = 0; i < gameList.length; i++) {
                            message += "\n" + gameList[i];
                        }

                        send(message);
                        break;

                    default:
                        break;
                }
            }
            else { // Not starts with "-"
                game = data.pars[0].toLowerCase();
                if (config.assemble[game]) {
                    message = "DUCKS, ASSEMBLE FOR " + game.toUpperCase() + "!";

                    for (var i = 0; i < config.assemble[game].length; i++) {
                        message += "\n<@" + config.assemble[game][i] + ">";
                    }

                    SendMessage(message, '184032070761316352', false);
                }
                else {
                    send('Invalid game');
                }
            }
        }
        else {
            message = "The list of games:";
            for (var j = 0; j < gameList.length; j++) {
                message += "\n" + gameList[j];
            }

            send(message);
        }
    };

    /*   data variable:
     *   user(name), userID, channelID, commandName, messageID, commandName, pars
     *   command variables can be found in commands.json
     */
    //endregion

    setInterval(function () {
        bot.setPresence({idle_since: null});
    }, 1000 * 60 * 5);


    http.listen(config.port, function () {
        require('dns').lookup(require('os').hostname(), function (err, add) {
            if (!debugMode) {
                console.log("Listening on " + add + ":" + config.port);
            }
            logger.info("Listening on " + add + ":" + config.port);
        });
    });

};
