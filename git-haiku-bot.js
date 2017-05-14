#!/usr/bin/env node
'use strict';

const botUtilities = require('bot-utilities');
const program = require('commander');
const rhyme = require('rhyme');
const Twit = require('twit');
require('dotenv').config();
var _ = require('lodash');
var GitHubApi = require("github");

_.mixin(botUtilities.lodashMixins);
_.mixin(Twit.prototype, botUtilities.twitMixins);

var github = new GitHubApi();

function getCommits(owner, repo, cb) {
  github.repos.getCommits({
    owner: owner,
    repo: repo,
    per_page: 100
  }, function(err, res) {
    var messages = res.data.map(function(commit) {
      return commit.commit.message;
    });
    // console.log("Remaining: " + res.meta['x-ratelimit-remaining'])
    cb(messages);
  });
}

function filterCommonGitisms(word) {
  return (word.length == 0 || word[0] == '#' || word[0] == '(' ||
    word[word.length - 1] == ':' || word[word.length - 1] == ')' ||
    !isNaN(parseInt(word)))
}

var memoize = {};

function wordSyllables(r, str) {
  if(str in memoize)
    return memoize[str];
  var res = r.syllables(str);
  memoize[str] = res;
  return res;
}

function generateHaiku(cb) {
  getRandomPopularRepo(function(owner, repo) {
    getCommits(owner, repo, function(messages) {
      var messages = _.flatten(messages.map(function(m) {
        return m.split(/[\,\*\;\n\!\.]+/);
      }));
      rhyme(function(r) {
        messages = messages.map(function(m) {
          var words = m.split(' ');
          var message_words = [];
          var syllables = 0;
          for(var i = 0; i < words.length; i++) {
            var w = words[i];
            var num_syllables = wordSyllables(r, w);
            if(w.length == 0)
              continue;
            else if(filterCommonGitisms(w) || !num_syllables)
              return;
            if(num_syllables + syllables > 7)
              return;
            message_words.push(w);
            syllables += num_syllables;
          }
          if(syllables == 5 || syllables == 7) {
            return { 
              message: message_words.join(' ').trim(),
              syllables: syllables
            };
          }
        }).filter(function(m) {
          return m && m.message != 'Merge pull request from';
        });

        var fives = messages.filter(function(m) {
          return m.syllables == 5;
        });
        var sevens = messages.filter(function(m) {
          return m.syllables == 7;
        });

        fives = _.chain(fives).uniq().shuffle().value();
        sevens = _.chain(sevens).uniq().shuffle().value();

        if(fives.length < 2 || sevens.length < 1) {
          cb(null);
          return;
        }

        var lines = [fives[0], sevens[0], fives[1]].map(function(m) {
          var l = m.message;
          return l[0].toUpperCase() + l.slice(1);
        });

        cb(lines.join('\n') + `\n\nvia ${owner}/${repo}`);
      });
    });
  });
}

function getRandomPopularRepo(cb) {
  github.search.repos({
    q: 'size:>=30000 stars:>=5000',
    sort: 'updated',
    per_page: 100
  }, function(err, res) {
    var repos = res.data.items;
    var random_repo = _.shuffle(repos)[0];
    cb(random_repo.owner.login, random_repo.name);
  });
}

function postHaiku(cb) {
  generateHaiku(function(haiku) {
    if(!haiku) return;
    var T = new Twit(botUtilities.getTwitterAuthFromEnv());
    T.post('statuses/update', { status: haiku }, function(err, data, response) {
      if(err){
        console.log(err);
      }
      else{
        console.log(`Tweeted new haiku (${data.id}):\n ${haiku}`);
      }
      cb({
        message: haiku,
        id: data.id
      });
    });
  });
}

program
  .command('generate')
  .description('Generates a haiku')
  .action(function() {
    generateHaiku(console.log);
  });

program
  .command('post')
  .description('Posts a git haiku')
  .action(function() {
    postHaiku();
  });

program.parse(process.argv);

exports.handler = function(event, context) {
  postHaiku(function(res) {
    context.succeed(res);
  });
}