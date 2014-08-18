var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio');
var async = require('async');
var _ = require('underscore');
var teams = [];
var BASE_URL = "http://www.futhead.com/14/clubs/";



request(BASE_URL, function(error, response, body) {
    console.log("Loaded ", BASE_URL);
    if(!error && response.statusCode === 200) {
        $ = cheerio.load(body);
        var pageSuffixes;
        //extract the number of pages
        var numOfPages = parseInt(/of ([0-9]+)\)/g.exec($('a[rel=next]').parent().text())[1]);
        pageSuffixes = _.range(1, numOfPages + 1);

        // do it for all other pages
        async.series([
            function(seriesCallback) {
                async.each(pageSuffixes, scrapeTeamNames, function(err) { 
                    if(err) { console.log(err); }
                    else { console.log("We're done!"); }
                    seriesCallback();
                });
            },
            function(seriesCallback) {
                async.each(teams, scrapePlayerNames, function(err) {
                    if(err) { console.log(err); }
                    else { console.log("We're done!"); }
                    seriesCallback();
                });
            }
        ],
        function(err, results) {
            if(err) { console.log(err); }
            else { 
                fs.writeFile("./playerData.json", JSON.stringify(teams), function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("The file was saved!");
                    }
                });
            }
        });   
    }
    else { throw new Error("Could not connect to " + url + ": " + response.statusCode); }
});


function scrapeTeamNames(suffix, callback) {
    var url = BASE_URL + "?page=" + suffix;
    console.log("Processing ", url);
    request(url, function(error, response, body) {
        if(!error && response.statusCode === 200) {
            $ = cheerio.load(body);
            var rows = $('tr[data-club-id] td.tdname');
            if(rows.length) {
                rows.each(function(k, v) {
                    teams.push({
                        name: $(v).find('span.name').text(),
                        link: $(v).children('a').attr('href')
                    });
                });
                callback();
            } 
            else { callback("There are no teams on this page: " + url); }
        }
        else { callback("Could not connect to " + url + ": " + response.statusCode); }
    });
}


function scrapePlayerNames(team, callback) {
    var url = "http://www.futhead.com" + team.link;
    team.players = [];
    console.log("Processing ", url);
    request(url, function(error, response, body) {
        if(!error && response.statusCode === 200) {
            $ = cheerio.load(body);
            var rows = $('div.playercard');
            if(rows.length) {
                rows.each(function(k, v) {
                    team.players.push($(v).attr('data-player-full-name'));
                });
                callback();
            } 
            else { callback("There are no players on this page: " + url); }
        }
        else { callback("Could not connect to " + url + ": " + response.statusCode); }
    });
}