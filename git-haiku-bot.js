#!/usr/bin/env node
'use strict';

const program = require('commander');
const botUtilities = require('bot-utilities');
const Twit = require('twit');
const rhyme = require('rhyme');
require('dotenv').config();
var GitHubApi = require("github");
var _ = require('lodash');

_.mixin(botUtilities.lodashMixins);
_.mixin(Twit.prototype, botUtilities.twitMixins);

const SCREEN_NAME = process.env.SCREEN_NAME || 'GitHaiku';

var github = new GitHubApi();

function getCommits(owner, repo, cb) {
  github.repos.getCommits({
    owner: owner,
    repo: repo,
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

function sentenceSyllables(r, str) {
  return str.split(' ').reduce(function(acc, w) {
    return acc + r.syllables(w);
  }, 0);
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
            if(w.length == 0 || !r.syllables(w) || filterCommonGitisms(w))
              continue;
            if(r.syllables(w) + syllables > 7)
              break;
            message_words.push(w);
            syllables += r.syllables(w);
            if(syllables == 5 || syllables == 7)
              return message_words.join(' ');
          }
        }).filter(function(m) {
          return Boolean(m);
        }).map(function(m) {
          return m.trim();
        });
        var fives = messages.filter(function(m) {
          return sentenceSyllables(r, m) == 5;
        });
        var sevens = messages.filter(function(m) {
          return sentenceSyllables(r, m) == 7;
        });

        fives = _.shuffle(fives);
        sevens = _.shuffle(sevens);

        var lines = [fives[0], sevens[0], fives[1]].map(function(l) {
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
    sort: 'stars',
    per_page: 100
  }, function(err, res) {
    var repos = res.data.items;
    var random_repo = _.shuffle(repos)[0];
    cb(random_repo.owner.login, random_repo.name);
  });
}

function postHaiku(cb) {
  generateHaiku(function(haiku) {
    var T = new Twit(botUtilities.getTwitterAuthFromEnv());
    T.post('statuses/update', { status: haiku }, function(err, data, response) {
      if(err){
        console.log(err);
      }
      else{
        console.log(`Tweeted new haiku (${data.id}):\n ${haiku}`);
      }
    });
    cb();
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
  postHaiku(function() {
    context.done();
  });
}