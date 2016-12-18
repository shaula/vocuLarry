/*

# TODO:

* Dark scheme
* Text 2 Speech

*/

// Register a global custom directive called v-focus
Vue.directive('visible', function (el, binding) {
  el.style.visibility = binding.value ? 'visible' : 'hidden';
});

const itemPrototype = {
  lesson: null,
  from: '',
  to: '',
  fromNote: '',
  toNote: ''
};

// localStorage persistence
var STORAGE_TRAINING_KEY = 'training';
var STORAGE_SETTING_KEY = 'setting';
var itemStorage = (function () {
  var localDb = new PouchDB('vocabularies');
  var remoteDb = new PouchDB('http://vocularry.nsupdate.info:5984/vocabularies');

  var conflictedDocs = {};

  var sync = function () {
    var changes = localDb.changes({
      live: true,
      include_docs: true,
      since: 'now',
      conflicts: true
    }).on('change', function (change) {
      if (change.doc && (change.doc._conflicts || []).length) {
        // conflict in change
        console.log('Detected conflict at doc', change.doc);
        conflictedDocs[change.doc._id] = change.doc;
      }
    });

    var resolveSameChangeConflicts = function () {
      var promises = [];
      for (var index1 in conflictedDocs) {
        var currentDoc = conflictedDocs[index1];

        for (var index2 in currentDoc._conflicts) {
          var conflictingRev = currentDoc._conflicts[index2];

          var promise = localDb.get(currentDoc._id, {rev: conflictingRev})

              .then(function (currentDoc, index1, conflictingDoc) {
                if (hasDiff(currentDoc, conflictingDoc)) {
                  // resolve promise, keep conflict for later resolution
                } else {
                  return localDb
                      .remove(conflictingDoc._id, conflictingDoc._rev)
                      .then(function () {
                        delete conflictedDocs[index1];
                      })
                      .catch(function () {
                        // ignore error on delete
                      });
                }
              }.bind(this, currentDoc, index1))

              .catch(function (currentDoc, conflictingRev, error) {
                if (error.status == 404) {
                  // Anything to do?
                }
              }.bind(this, currentDoc, conflictingRev));

          promises.push(promise);
        }
      }

      return Promise.all(promises).then(function () {
        // re-retrieve all conflicted documents to get an updated view on these
        // maybe all conflicts were already resolved
        //TODO
        //conflictedDocs =
      });
    };

    return localDb.sync(remoteDb, {
        live: false,
        retry: true,
        filter: function (doc) {
          // don't sync design documents - people can do bad things with that
          return doc._id.indexOf('_design') !== 0;
        }
      }).on('change', function (change) {
        // yo, something changed!
        console.log('change', change);

      }).on('paused', function (info) {
        // replication was paused, usually because of a lost connection
        console.log('paused', info);

      }).on('active', function (info) {
        // replication was resumed
        console.log('active', info);

      }).on('error', function (err) {
        // totally unhandled error (shouldn't happen)
        console.log('error', err);

      }).on('conflict', function (err) {
        console.log('conflict', err);

      }).on('complete', function (info) {
        console.log('complete', info);

        return info;

      }).then(function (info) {
        changes.cancel();
        return resolveSameChangeConflicts().then(function () {
          return info;
        });

      }).catch(function () {
        changes.cancel();
        return resolveSameChangeConflicts();
      });
  };

  /**
   * @param {Object} a
   * @param {Object} b
   * @returns {boolean}
   */
  var hasDiff = function (a, b) {
    var aWithoutRev = Object.assign({}, JSON.parse(JSON.stringify(a)), {_rev: null, _conflicts: []});
    var bWithoutRev = Object.assign({}, JSON.parse(JSON.stringify(b)), {_rev: null, _conflicts: []});

    return (JSON.stringify(aWithoutRev) != JSON.stringify(bWithoutRev));
  };

  var findByLesson = function (lesson, includeDocs) {
    // uses secondary index installed on reset/setup
    return localDb
        .query('byLesson', {
          key: lesson,
          include_docs: includeDocs
        })
        .then(function (result) {
          return result.rows.map(function (row) {
            if (includeDocs) {
              return row.doc;
            } else {
              return row.id;
            }
          });
        })
        .catch(function (err) {
          handleByLessonError(err);
        });
  };

  var unique = function (values) {
    var n = {},r=[];
    for(var i = 0; i < values.length; i++)
    {
      if (!n[values[i]])
      {
        n[values[i]] = true;
        r.push(values[i]);
      }
    }
    return r;
  };

  var installViews = function() {
    // document that tells PouchDB/CouchDB
    // to build up an index on doc.name
    var ddoc = {
      _id: '_design/byLesson',
      views: {
        byLesson: {
          map: function (doc) {
            emit(doc.lesson);
          }.toString()
        }
      }
    };

    return localDb.put(ddoc)
        .then(function () {

          // now trigger the building of the index
          return localDb.query('byLesson', {
            limit: 0 // don't return any results
          }).then(function (res) {
            console.log('index built', res);
          }).catch(function (err) {
            console.log('index building failed', err);
          });
        })
        .catch(function (err) {
          console.log('index building failed', err);
        });
  };

  var handleByLessonError = function (err) {
    // handle errors
    if (err.message.indexOf('missing') !== -1) {
      console.log(err);
      installViews();
    }
    location.reload();
  };

  return {
    isEmpty: function () {
      return localDb.info()
          .then(function (details) {
            if (details.doc_count == 0 && details.update_seq == 0) {
              return installViews().then(function () {
                return details;
              });
            } else {
              return details;
            }
          })
          .catch(function (err) {
            console.log('error: ' + err);
          });
    },
    db: localDb,
    find: function (id, rev) {
      var options = {};
      if (rev) {
        options.rev = rev;
      }
      return localDb.get(id, options);
    },
    findAll: function () {
      return localDb
          .allDocs({
            include_docs: true
          })
          .then(function (result) {
            return result.rows.map(function (row) {
              return row.doc
            });
          });
    },
    getConflicted: function () {
      return conflictedDocs;
    },
    findConflicts: function () {
      return localDb
          .allDocs({
            include_docs: true,
            conflicts: true
          })
          .then(function (result) {
            return result.rows.map(function (row) {
              if ((row.doc._conflicts || []).length) {
                return row.doc
              }
            }).filter(Boolean);
          });
    },
    findMany: function (ids) {
      return localDb
          .allDocs({
            include_docs: true,
            keys: ids
          })
          .then(function (result) {
            return result.rows.map(function (row) {
              if (!row.error) {
                return row.doc;
              }
              return false;
            }).filter(Boolean);
          })
          .catch(function (err) {
            // handle errors
            console.log(err);
          });
    },
    findByLesson: function (lesson) {
      return findByLesson(lesson, true);
    },
    findIdsByLesson: function (lesson) {
      return findByLesson(lesson, false);
    },
    add: function (doc) {
      return localDb.post(doc);
    },
    update: function (doc) {
      return localDb.put(doc).catch(function (err) {
        if (err.name === 'conflict') {
          // conflict!
        } else {
          // some other error
        }
      });
    },
    remove: function (docOrId, optsOrRev) {
      return localDb.remove(docOrId, optsOrRev);
    },
    getLessons: function () {
      // FIXME: Although reduce is not working, this is faster than the usual query
      return localDb.query('byLesson', {
        reduce: '_sum',
        group: true,
        group_level: 1
      }).then(function (result) {
        return unique(result.rows.map(function (row) {
          return row.key;
        }));
      }).catch(function (err) {
        handleByLessonError(err);
      });
    },
    sync: sync,
    hasDiff: hasDiff,
    fetch: function () {
      var promises = [];

      var length = 0;
      var vocabulary = {};

      return Promise.all(promises).then(function () {
        localDb.allDocs({
          include_docs: true
        }).then(function (result) {
          for (var index in result.rows) {
            // by assigning the prototype we are able to populate new properties into view
            // Reason: undefined properties cannot be bound to
            var doc = Object.assign({}, result.rows[index]);
            vocabulary[doc._id] = {};
            Object.assign(vocabulary[doc._id], itemPrototype, doc);
            length++;
          }
          itemStorage.uid = (1 + length);
          return vocabulary;
        });
      });
    },

    reset: function () {
      return localDb.destroy().then(function () {
        // database destroyed
        console.log('destroyed localDb');

        localDb = new PouchDB('vocabularies');

        return localDb.info()
            .then(installViews)
            .then(sync);

      }).catch(function (err) {
        // error occurred
        console.log(err);
      })
    }
  }
})();

var trainingStorage = {
  fetch: function () {
    var training = JSON.parse(localStorage.getItem(STORAGE_TRAINING_KEY)) || {
          active: {
            id: null,
            ids: [],
            lesson: null,
            register: null
          },
          mode: 'default', // or 'reverse'
          ids: {}
        };

    this.save(training);

    return training;
  },
  save: function (training) {
    localStorage.setItem(STORAGE_TRAINING_KEY, JSON.stringify(training));
  },
  reset: function (training) {
    training.active.ids = [];
    training.ids = {};
    training.id = null;
  }
};

var settingStorage = {
  fetch: function () {
    var settings = JSON.parse(localStorage.getItem(STORAGE_SETTING_KEY)) || {
          isKeyboardEnabled: true
        };

    this.save(settings);

    return settings;
  },
  save: function (settings) {
    localStorage.setItem(STORAGE_SETTING_KEY, JSON.stringify(settings));
  },
  reset: function () {
    localStorage.removeItem(STORAGE_SETTING_KEY);
  }
};

var localData = {
  conflictPromises: []
};

// app Vue instance
var app = new Vue({
  // app initial state
  data: {
    view: 'default', // 'listing', 'settings'
    initialText: false,
    /**
     * @var {string[]}
     */
    lessons: [],
    activeItems: {},
    listItems: {},
    unchangedActiveItem: {
      id: null,
      value: null
    },
    newLessonName: null,
    visibility: 'all',
    isToVisible: false,
    isNew: false,
    isMove: false,
    editItem: null,
    conflictItem: null,
    conflictItems: {},
    exportString: '',
    training: trainingStorage.fetch(),
    settings: settingStorage.fetch(),
    loading: {
      items: false,
      lessons: false,
      export: false,
      register: false
    },
    lastSync: null
  },

  // watch vocabulary change for localStorage persistence
  watch: {
    /*
    activeItem: {
      handler: function () {
        if (this.isNew) {
          return;
        }

        var shownId = document.querySelector('#activeItemId').value;
        if (!this.activeItems.hasOwnProperty(this.training.active.id)) {
          // was just moved elsewhere
          return;
        } else if (shownId == '') {
          return;
        } else if (this.training.active.id != shownId) {
          return;
        }

        // workaround to retrieve plain object
        var updatedItemAsJson = JSON.stringify(this.activeItem);

        this.loading.update = true;
        var updatedDoc = JSON.parse(updatedItemAsJson);
        itemStorage.update(updatedDoc).then(function (doc) {
        // would always trigger itself
          this.activeItem._id = doc.id;
          this.activeItem._rev = doc.rev;
          this.loading.update = false;
        }.bind(this));
      },
      deep: true,
      immediate: false
    },
    */
    training: {
      handler: function (training) {
        trainingStorage.save(training);
      },
      deep: true
    },
    settings: {
      handler: function (setting) {
        settingStorage.save(setting);
      },
      deep: true
    }
  },

  // computed properties
  // http://vuejs.org/guide/computed.html
  computed: {
    mode: function () {
      if (this.training.mode != 'reverse') {
        return {
          from: {
            lang: 'de',
            keyboard: false,
            placeholder: 'from German',
            phraseKey: 'from',
            noteKey: 'fromNote'
          },
          to: {
            lang: 'bg',
            keyboard: true,
            placeholder: 'to Bulgarian',
            phraseKey: 'to',
            noteKey: 'toNote'
          }
        };

      } else {
        // reverse
        return {
          from: {
            lang: 'bg',
            keyboard: true,
            placeholder: 'from Bulgarian',
            phraseKey: 'to',
            noteKey: 'toNote'
          },
          to: {
            lang: 'de',
            keyboard: false,
            placeholder: 'to German',
            phraseKey: 'from',
            noteKey: 'fromNote'
          }
        };
      }
    },
    activeItem: function () {
      if (this.isNew) { // return special crafted item
        return Object.assign({}, itemPrototype, {lesson: this.training.active.lesson});

      } else if (this.editItem) {
        return this.editItem;
      }

      if (null === this.training.active.id) {
        this.setActiveTrainingId();
      }

      var activeItem = this.activeItems[this.training.active.id] || false;

      // outsourcing this to its own function does not work
      if (!activeItem) {
        this.unchangedActiveItem = {id: null, value: null};

      } else if (this.unchangedActiveItem.id != activeItem._id || this.unchangedActiveItem.rev != activeItem._rev) {
        this.unchangedActiveItem = {
          id: activeItem._id,
          rev: activeItem._rev,
          value: Object.assign({}, JSON.parse(JSON.stringify(activeItem)), {_rev: null})
        };
      }

      Vue.nextTick(function () {
        autosize.update(document.querySelectorAll('textarea'));
      });

      return activeItem;
    },
    conflictValues: function () {
      if (!this.conflictItem) {
        if (this.view == 'conflict') {
          this.view = 'default';
        }
        return [];
      }
      this.view = 'conflict';
      var conflictValues = [];

      for (var field in this.conflictItem.current) {
        if (String(field).match(/^_/)) {
          continue;
        }

        var currentValue = this.conflictItem.current[field];
        var otherValue = this.conflictItem.conflict[field];

        var conflictValue = {
          label: String(field).charAt(0).toUpperCase() + String(field).substring(1),
          field: field,
          use: 'current',
          current: currentValue
        };

        if (currentValue != otherValue) {
          conflictValue.conflict = otherValue;
        }

        if (currentValue || conflictValue.hasOwnProperty('conflict')) {
          conflictValues.push(conflictValue);
        }
      }

      return conflictValues;
    },
    lessonsWithCurrent: function () {
      var lessons = JSON.parse(JSON.stringify(this.lessons));
      if (this.activeItem && -1 === lessons.indexOf(this.activeItem.lesson)) {
        lessons.push(this.activeItem.lesson);
      }
      return lessons;
    },
    registerLength: function () {
      var lesson = this.training.active.lesson || false;
      if (!lesson) {
        return {
          '1': '-',
          '2': '-',
          '3': '-',
          '4': '-'
        };
      }

      var length = {};
      for (var register = 1; register <= 4; register++) {
        this.ensureSet(register, lesson);
        length[register] = this.training.ids[lesson][register].length
      }

      return length;
    }
  },

  filters: {
    pluralize: function (n) {
      return n === 1 ? 'item' : 'items'
    }
  },

  // methods that implement data logic.
  // note there's no DOM manipulation here at all.
  methods: {
    ensureSet: function (register, lesson) {
      if (!this.training.ids.hasOwnProperty(lesson)) {
        Vue.set(this.training.ids, lesson, {});
      }

      if (!this.training.ids[lesson].hasOwnProperty(register)) {
        Vue.set(this.training.ids[lesson], register, []);
      }
    },
    getRegister: function (register, lesson) {
      lesson = lesson || this.training.active.lesson;
      register = register || this.training.active.register;
      this.ensureSet(register, lesson);

      return this.training.ids[lesson][register] || [];
    },
    setRegister: function (value, register, lesson) {
      lesson = lesson || this.training.active.lesson;
      register = register || this.training.active.register;
      this.ensureSet(register, lesson);

      Vue.set(this.training.ids[lesson], register, value);
    },
    putRegister: function (value, register, lesson) {
      lesson = lesson || this.training.active.lesson;
      register = register || this.training.active.register;
      this.ensureSet(register, lesson);

      Vue.set(this.training.ids[lesson], register, this.training.ids[lesson][register].concat([value]));
    },
    removeRegister: function (value, register, lesson) {
      lesson = lesson || this.training.active.lesson;
      register = register || this.training.active.register;
      this.ensureSet(register, lesson);

      var index = this.training.ids[lesson][register].indexOf(value);
      this.training.ids[lesson][register].splice(index, 1);
    },
    syncRegister: function () {
      if (this.training.active.lesson) {
        this.loading.register = true;
        itemStorage.findIdsByLesson(this.training.active.lesson).then(function (ids) {
          // check for missing items and add to register 1
          ids.forEach(function (id) {
            var isMissing = true;

            for (var register = 1; register <= 4; register++) {
              var index = this.getRegister(register).indexOf(id);
              if (index !== -1) {
                isMissing = false;
                break;
              }
            }

            if (isMissing) {
              console.log('adding item ' + id);
              this.putRegister(id, 1);
            }
          }.bind(this));

          // check for old items and remove
          for (var register = 1; register <= 4; register++) {
            this.getRegister(register).forEach(function (id) {
              var index = ids.indexOf(id);
              if (index === -1) {
                // missing, remove
                console.log('removing item ' + id);
                this.removeRegister(id, register);
              }
            }.bind(this));
          }
          this.loading.register = false;
        }.bind(this));
      }
    },

    trainRegister: function (register) {
      // finish previous training
      this.resetTrainingRegister();

      // start new one
      this.training.active.register = register;

      this.training.active.ids = this.getRegister();
      this.setRegister([]);

      this.setActiveItems();

      this.setActiveTrainingId();
    },

    setActiveItems: function () {
      if (this.training.active.ids.length) {
        this.loading.items = true;
        itemStorage.findMany(this.training.active.ids).then(function (docs) {
          docs.forEach(function (doc) {
            Vue.set(this.activeItems, doc._id, doc);
          }.bind(this));
          this.loading.items = false;
        }.bind(this));
      } else {
        this.activeItems = {};
      }
    },

    setListItems: function () {
      this.loading.items = true;
      itemStorage.findByLesson(this.training.active.lesson).then(function (docs) {
        this.listItems = {};
        docs.forEach(function (doc) {
          Vue.set(this.listItems, doc._id, doc);
        }.bind(this));
        this.loading.items = false;

        Vue.nextTick(function () {
          document.querySelector('#listing .view').scrollTop = 0;
        });
      }.bind(this));
    },

    trainLesson: function (lesson) {
      // finish previous training
      this.resetTrainingRegister();

      if (this.training.active.lesson != lesson) {
        this.training.active.lesson = lesson;
        this.syncRegister();
      } else {
        this.training.active.lesson = null;
      }
    },

    resetTrainingRegister: function () {
      if (this.training.active.ids.length) {
        // finish training - put back all temporary ids
        var register = this.getRegister();
        this.training.active.ids.forEach(function (id) {
          if (-1 === register.indexOf(id)) {
            register.push(id);
          }
        });
        this.training.active.ids = [];
      }

      this.training.active.register = null;
      this.training.active.id = null;
    },

    setToVisible: function () {
      this.isToVisible = true;
    },

    addItem: function (item) {
      if (!item.from && !item.to) {
        return;
      }

      itemStorage.add(item).then(function (doc) {
        this.putRegister(doc.id, 1, item.lesson);
        this.isNew = false;

        // on save create another
        this.createNew();
      }.bind(this));
    },

    triggerBlur: function () {
      document.activeElement.blur();
    },

    /**
     * This listens on blur.
     */
    updateActiveItem: function () {
      if (this.isNew || !this.training.active.id) {
        return;
      }

      var currentItem = this.activeItem;
      var previousItem = this.unchangedActiveItem.value;

      // outsourcing this to its own function does not work
      if (!itemStorage.hasDiff(currentItem, previousItem)) {
        return true;
      }

      var lessonChanged = false;
      if (currentItem.lesson != previousItem.lesson) {
        lessonChanged = true;
      }

      this.loading.update = true;
      itemStorage.update(JSON.parse(JSON.stringify(this.activeItem))).then(function (status) {
        this.activeItems[status.id]._rev = status.rev;
        this.loading.update = false;

        if (lessonChanged) {
          // user could have changed the lesson by moving a vocabulary
          this.resetTrainingRegister();
          Vue.nextTick(function () {
            this.trainLesson(currentItem.lesson);
          }.bind(this));
        }

        console.log('updated item');
      }.bind(this));
    },

    /**
     * Cancel changes so far
     */
    revertActiveItem: function () {
      if (this.isNew) {
        this.triggerBlur();
        return;
      }

      this.loading.update = true;
      itemStorage.find(this.activeItem._id).then(function (doc) {
        this.activeItems[doc._id] = doc;
        this.triggerBlur();
        this.loading.update = false;
      }.bind(this));
    },

    removeItem: function (item) {
      var doDelete = window.confirm('Please confirm the removal of "' + item.from + '"');
      if (!doDelete) {
        return;
      }

      this.loading.update = true;
      itemStorage.remove(item).then(function () {
        // remove from local register
        var index = this.training.active.ids.indexOf(item._id);
        if (-1 !== index) {
          this.training.active.ids.splice(index, 1);
        }

        // show next
        this.setActiveTrainingId();
        this.loading.update = false;
      }.bind(this));
    },

    /**
     * Phrase was known - advance.
     *
     * @param {number} id
     */
    gotItem: function (id) {
      var index = this.training.active.ids.indexOf(id);
      if (index > -1) { // found

        // add to next register
        var maxRegister = 4;
        this.putRegister(id, Math.min(maxRegister, this.training.active.register + 1));

        // remove from current list
        this.training.active.ids.splice(index, 1);
      }

      this.setActiveTrainingId();
    },

    repeatItem: function (id) {
      var index = this.training.active.ids.indexOf(id);
      if (index > -1) { // found

        // add to first register
        this.putRegister(id, 1);

        // remove from previous register
        this.training.active.ids.splice(index, 1);
      }

      this.setActiveTrainingId();
    },

    setActiveTrainingId: function () {
      // find a random amongst our active list
      if (this.training.active.ids.length == 0) {
        this.resetTrainingRegister();
        return;
      }

      var randomIndex = Math.floor(Math.random() * this.training.active.ids.length);
      this.isToVisible = false; // always hide the answer
      this.isMove = false; // don't show select box for moving per default (action only to avoid confusion)
      this.training.active.id = this.training.active.ids[randomIndex];
    },

    cancelNew: function () {
      this.isNew = false;
    },

    createNew: function () {
      this.resetTrainingRegister();
      this.isNew = true;

      Vue.nextTick(function () {
        var input = document.querySelector('.from textarea');
        if (input) {
          input.focus();
        }
      });
    },

    startEdit: function (item) {
      this.editItem = item;
    },
    finishEdit: function () {
      this.editItem = null;
    },

    listAll: function () {
      this.view = 'listing';
      this.resetTrainingRegister();
      this.setListItems();
    },

    moveItem: function () {
      this.isMove = true;
    },

    cancelMove: function () {
      this.isMove = false;
    },

    newLesson: function () {
      var lesson = window.prompt("Please enter a new lesson name: ");
      if (lesson) {
        this.newLessonName = lesson;
        this.lessons.push(lesson);
        this.training.active.lesson = lesson;
      }
    },

    loadLessons: function () {
      // set initial lessons
      app.loading.lessons = true;
      itemStorage.getLessons().then(function (lessons) {
        app.lessons = lessons;
        app.loading.lessons = false;
      });
    },

    exportAs: function (type) {
      if (type == 'json') {
        this.loading.export = true;
        itemStorage.findAll().then(function (docs) {
          var plainDocs = docs.map(function (doc) {
            return doc;
          });
          this.exportString = JSON.stringify(plainDocs, null, '  ');
          this.loading.export = false;
        }.bind(this));
      }
    },

    showKeyboard: function (evt) {
      if (this.settings.isKeyboardEnabled) {
        keyboard.Show(true);

        var elem = document.querySelector('#keyboard');
        if (window.innerWidth < 416) {
          var scaleX = Math.round(window.innerWidth * 10000 / 416) / 10000 - 0.0224; //TODO:

          elem.style.transformOrigin = '0% 98%';
          elem.style.transform = 'scaleX(' + scaleX + ')';
        } else {
          elem.style.transform = '';
        }

        if (this.settings.isKeyboardEnabled) {
          // focus the input
          var parent = evt.target.parentNode;
          var input = parent.querySelector('textarea');
          input.focus();

          // position the keyboard below the input
          var obj = input, top = 0, left = 0;
          do {
            left += obj.offsetLeft;
            top += obj.offsetTop;
          } while (obj = obj.offsetParent);

          document.querySelector('#keyboard').style.top = top + input.offsetHeight + 'px';
          // TODO: center keyboard (left)
        }
      }
    },

    hideKeyboard: function () {
      keyboard.Show(false);
    },

    sync: function (evt) {
      var elem = evt ? evt.target : document.body;
      elem.classList.add('loading');

      return itemStorage.sync().then(function (info) {
        elem.classList.remove('loading');

        this.lastSync = info;
        window.setTimeout(function () { this.lastSync = null }.bind(this), 10000);

        // update register
        this.loadLessons();
        this.syncRegister();

        this.conflictItems = itemStorage.getConflicted();
        this.startResolve();
      }.bind(this));
    },

    init: function () {
      return itemStorage.isEmpty();
    },

    reset: function (evt) {
      var doContinue = window.confirm('Please confirm the reset. All your training status and unsynced vocabularies will be lost. This process can take up to 60s.');
      if (!doContinue) {
        return Promise;
      }

      evt.target.classList.add('loading');

      trainingStorage.reset(this.training);

      itemStorage.reset().then(function () {
        evt.target.classList.remove('loading');
      });
    },

    startResolve: function () {
      var keys = Object.keys(this.conflictItems);
      if (keys.length) {
        this.loading.conflict = true;

        var currentKey = keys.shift();
        var currentItem = this.conflictItems[currentKey];
        delete this.conflictItems[currentKey];

        // use latest item for comparison - ignore others
        itemStorage.find(currentItem._id, currentItem._conflicts[0]).then(function (conflictItem) {
          this.conflictItem = {
            current: currentItem,
            conflict: conflictItem
          };
        }.bind(this));
      } else {
        this.conflictItem = null;

        if (localData.conflictPromises.length) {
          // when conflict resolution is finished - upload
          var promises = localData.conflictPromises;
          Promise.all(promises).then(function () {
            itemStorage.sync();
          });
          localData.conflictPromises = [];
        }
      }
    },

    resolveConflict: function (conflictValues) {
      var hasChanged = false;

      for (var index in conflictValues) {
        if (conflictValues[index].use != 'current') {
          hasChanged = true;
          this.conflictItem.current[conflictValues[index].field] = conflictValues[index].conflict;
        }
      }

      if (hasChanged) {
        var updatePromise = itemStorage.update(this.conflictItem.current);
        localData.conflictPromises.push(updatePromise);
      }

      var rev;
      while (rev = this.conflictItem.current._conflicts.pop()) {
        var removePromise = itemStorage.remove(this.conflictItem.current._id, rev);
        localData.conflictPromises.push(removePromise);
      }

      this.startResolve();
    }
  },
  directives: {
    lang: function (el, mode, vnode, oldvnode) {
      el.setAttribute('lang', mode.value.lang);

      // reset previous if available
      if (oldvnode.elm) {
        oldvnode.elm.removeEventListener('focus', app.showKeyboard);
        oldvnode.elm.removeEventListener('blur', app.hideKeyboard);
      }

      // bind to current one if requested
      if (mode.value.keyboard) {
        el.addEventListener('focus', app.showKeyboard);
        el.addEventListener('blur', app.hideKeyboard);
      } else {
        app.hideKeyboard();
      }
    }
  }
});

if (typeof Promise === "undefined" || Promise.toString().indexOf("[native code]") === -1){
  app.initialText = 'Larry is sorry for telling you, that this application isn\'t supported by your current browser. Please use a newer version.';

} else {
  app.init()
      .then(function (details) {
        if (details.doc_count == 0 && details.update_seq == 0) {
          this.initialText = 'Larry loads his vocabulary lessons. This may take up to 1 minute - please stand by.';
          return this.sync().then(function () {
            this.initialText = '';
          }.bind(this));
        }
      }.bind(app))
      .then(function () {
        app.loadLessons();
      });
}

document.addEventListener('keyup', function (evt) {
  if (-1 != ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].indexOf(evt.target.tagName)) {
    // don't mess with default behavior
    return;
  }

  if (app.training.active.id) {
    // within trainings mode

    if (app.isToVisible) {
      // choose left or right

      if (evt.keyCode == 37) { // left
        app.repeatItem(app.training.active.id);

      } else if (evt.keyCode == 39) { // right
        app.gotItem(app.training.active.id);
      }

    } else if (-1 !== [38, 40, 37, 39].indexOf(evt.keyCode)) { // up, down, left, right
      app.setToVisible();
    }
  }
});

// initially load active items
app.setActiveItems();

// mount
app.$mount('#app');

window.addEventListener('DOMContentLoaded', function () {
  autosize(document.querySelectorAll('textarea'));
});