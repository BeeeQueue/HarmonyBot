/**
 * Created by bq on 2016-01-15.
 */

var http = require("http");

var baseURL = "http://api.urbandictionary.com/v0/define?term=";

(function ()
{
	module.exports.LookUp = function (input, callback)
	{
		var inputEncoded = input.replace(/ /g, "+");

		http.get(baseURL + inputEncoded, function (res)
		{
			var response = "";

			res.on("data", function (chunk)
			{
				response += chunk;
			});

			res.on("end", function ()
			{
				var data = JSON.parse(response);
				data.input = input;
				HandleResponse(data, callback);
			});
		});
	};

	function HandleResponse (data, callback)
	{
		var messageLines = [];
		var message = "";

		if (data.result_type === "exact")
		{
			var def = data.list[0];

			messageLines.push("``` ```");
			messageLines.push("UrbanDictionary's top definition of `" + data.input + "`:");
			messageLines.push("");
			messageLines.push(def.definition);
			messageLines.push("");
			messageLines.push('Example:\n' + def.example);
			messageLines.push("");

			if (data.tags && data.tags.length > 0)
			{
				messageLines.push("Also relevant:");

				var tagMessage = "";
				for (var i = 0; i < 4; i++)
				{
					tagMessage += data.tags[i] + ", ";
				}

				messageLines.push(tagMessage.substr(0, tagMessage.lastIndexOf(",")));

				messageLines.push("");
			}

			messageLines.push("``` ```");
		}
		else
		{
			messageLines.push("Could not find exact definition of " + data.input + "!");
		}

		for (var i = 0; i < messageLines.length; i++)
		{
			message += messageLines[i] + "\n";
		}

		callback(message);
	}
}());