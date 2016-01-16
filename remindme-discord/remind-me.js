/**
 * Created by bq on 2015-11-20.
 */

/*
 *  reminder format
 *  Date.now()
 *  message: message,
 *
 */
(function ()
{
	var fs = require('fs'),
	    _  = require('underscore');

	var path                   = 'reminders.json',
	    reminders              = {},
	    checkIntervalInMinutes = 1,
	    currentTime            = Date.now();

	LoadReminders();

	module.exports.NewReminder = function (data)
	{
		reminders[data.time] = {
			'userID':  data.userID,
			'message': data.message,
			'created': data.created,
			'date':    data.date
		};
	};

	setInterval(function ()
	{
		//CheckReminders();
	}, checkIntervalInMinutes * 60 * 1000);

	function LoadReminders ()
	{
		fs.readFile(path, function (err, data)
		{
			if (!err)
			{
				reminders = JSON.parse(data);
				//console.log("Successfully loaded " + path);
			}
			else
			{
				console.err(err);
			}
		});
	}

	function SaveReminders ()
	{
		fs.writeFile(path, JSON.stringify(reminders));
	}

	function CheckReminders ()
	{
		var times = Object.keys(reminders);
		currentTime = Date.now();

		for (var i = 0; i < times.length; i++)
		{
			var time = times[i];

			if (currentTime > time)
			{
				var reminder = reminders[time]

				send({
					to:      reminder.userID,
					message: data.message
				});
			}
		}
	}
}());