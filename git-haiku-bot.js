#!/usr/bin/env node
'use strict';

const program = require('commander');
const botUtilities = require('bot-utilities');
const Twit = require('twit');
const syllable = require('syllable');
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

function generate(cb) {
  getCommits('blaze', 'odo', function(messages) {
    var messages = _.flatten(messages.map(function(m) {
      return m.split(/[\,\*\;\n\!\.]+/);
    }));
    messages = messages.map(function(m) {
      if(syllable(m) == 5 || syllable(m) == 7) {
        return m;
      }
      var words = m.split(' ');
      var new_message = '';
      var syllables = 0;
      for(var i = 0; i < words.length; i++) {
        var w = words[i];
        if(w.length == 0)
          continue;
        if(syllable(w) + syllables > 7)
          break;
        new_message += (i == 0 ? '' : ' ') + w;
        syllables += syllable(w);
        if(syllables == 5 || syllables == 7)
          return new_message;
      }
    }).filter(function(m) {
      return Boolean(m);
    }).map(function(m) {
      return m.trim();
    });
    var fives = messages.filter(function(m) {
      return syllable(m) == 5;
    });
    var sevens = messages.filter(function(m) {
      return syllable(m) == 7;
    });

    fives = _.shuffle(fives);
    sevens = _.shuffle(sevens);

    cb(`${fives[0]}\n${sevens[0]}\n${fives[1]}`);
  });
}

program
  .command('generate')
  .description('Generates a haiku')
  .action(function() {
    generate(console.log);
  });

program
  .command('post')
  .description('Posts a git haiku')
  .action(function() {
    var T = new Twit(botUtilities.getTwitterAuthFromEnv());

  });

program.parse(process.argv);
