# VocuLarry

Learn a new language by training a set of vocabularies on your smartphone, laptop or desktop computer.

You don't have to install an app or register. Just open VocuLarry in your web browser and get started. While the vocabularies are synced to a server (so that many people can benefit), your training status is kept within your web browser.

## Features

* enter vocabularies belonging to specific lessons
* train with 4 card boxes ([Leitner system](https://en.wikipedia.org/wiki/Leitner_system))
  * repeat as you like
  * the ones you know advance to the next box, the missed ones will be placed in the first box
* synchronization for vocabularies
* training effort is saved on the browser
* virtual keyboard - important for cyrillic languages
* conflict resolution

## Drawbacks

Currently there is only support for learning "Bulgarian" from "German".

## Collaboration

Feel free to report bugs, request features or file pull requests.

## Technical Background

* Server
  * CouchDB - vocabulary synchronization
* Client
  * PouchDB - vocabulary store
  * HTML5 LocalStorage - training status store
  * Vue.js - rendering
* don't forget to run ```bower update``` to install dependencies
  
## Background

Learning a new language is hard. Using paper seems odd nowadays. As I was unable to find a web-based platform for training custom vocabularies in a reasonable way, I decided to learn Vue.js and programmed this little helper.
