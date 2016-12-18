var keyboard = (function () {

  var keyboard;
  var text;

  var init = function () {
    keyboard = new VKeyboard(
        'keyboard',
        function (ch) {
          text = document.activeElement;

          getCaretPositions(text);

          if(document.attachEvent) {
            text.detachEvent("onblur", backFocus);
            text.attachEvent("onblur", backFocus);
          }
          keyb_callback(ch);
        },
        false, // no arrow keys
        false, // no up & down keys
        false, // reserved
        false // no numpad
    );
    keyboard.Show(false);
    keyboard.SetParameters('show-click', true);

    setLang('de');
    addBulgarianGraveCharacters();
    addBulgarianPhoneticLayout();
    addBulgarianLayout();

    setLayoutOnFocus();
  };

  function addBulgarianGraveCharacters() {
    keyboard.Grave.push(
        ["а", "а̀"],
        ["А", "А̀"],

        ["е", "ѐ"],
        ["Е", "Ѐ"],

        ["и", "ѝ"],
        ["И", "Ѝ"],

        ["о", "о̀"],
        ["О", "О̀"],

        ["у", "у̀"],
        ["У", "У̀"],

        ["ю","ю̀"],
        ["Ю","Ю̀"],

        ["я","я̀"],
        ["Я","Я̀"],

        ["ъ","ъ̀"],
        ["Ъ","Ъ̀"]
    );
  }

  function addBulgarianPhoneticLayout() {
    keyboard.avail_langs.push(
        ['Bg_ph', 'Български (ph)']
    );
    keyboard.Bg_ph_normal = [
      "ю", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=",
      "ч", "ш", "е", "р", "т", "ъ", "у", "и", "о", "п", "я", "щ", ["&#x0060;", "Grave"],
      "а", "с", "д", "ф", "г", "х", "й", "к", "л", ";", "'", "ь",
      "з", "ж", "ц", "в", "б", "н", "м", ",", ".", "/"
    ];

    keyboard.Bg_ph_shift = [
      "Ю", "!", "@", "№", "$", "%", "€", "§", "*", "(", ")", "–", "+",
      "Ч", "Ш", "Е", "Р", "Т", "Ъ", "У", "И", "О", "П", "Я", "Щ", ["&#x0060;", "Grave"],
      "А", "С", "Д", "Ф", "Г", "Х", "Й", "К", "Л", ":", "\"", "ѝ",
      "З", "Ж", "Ц", "В", "Б", "Н", "М", "„", "“", "?"
    ];
    keyboard.Bg_ph_alt_gr = [
      ,    ,    ,    , "€",    ,    ,    ,    , "[", "]",    , "—",
      "ѣ",    , "э", "®", "™", "ѫ",    , "ѝ",    ,    , "ѣ",    ,    ,
      , "©",    ,    ,    ,    , "ѭ",    ,    , "…", "’", "ы",
      , "ы", "©",    ,    ,    ,     , "«", "»", ["&#x0060;", "Grave"]
    ];
  }

  function addBulgarianLayout() {
    keyboard.avail_langs.push(
        ["Bg", "Български"]
    );
    keyboard.Bg_normal = [["&#x0060;", "Grave"],"&#x0031;","&#x0032;","&#x0033;","&#x0034;","&#x0035;","&#x0036;","&#x0037;","&#x0038;","&#x0039;","&#x0030;","&#x002D;","&#x002E;",
      "&#x002C;","&#x0443;","&#x0435;","&#x0438;","&#x0448;","&#x0449;","&#x043A;","&#x0441;","&#x0434;","&#x0437;","&#x0446;","&#x003B;","&#x0028;",
      "&#x044C;","&#x044F;","&#x0430;","&#x043E;","&#x0436;","&#x0433;","&#x0442;","&#x043D;","&#x0432;","&#x043C;","&#x0447;",,
      "&#x044E;","&#x0439;","&#x044A;","&#x044D;","&#x0444;","&#x0445;","&#x043F;","&#x0440;","&#x043B;","&#x0431;"];

    keyboard.Bg_caps = [["&#x0060;", "Grave"],"&#x0031;","&#x0032;","&#x0033;","&#x0034;","&#x0035;","&#x0036;","&#x0037;","&#x0038;","&#x0039;","&#x0030;","&#x002D;","&#x002E;",
      "&#x002C;","&#x0423;","&#x0415;","&#x0418;","&#x0428;","&#x0429;","&#x041A;","&#x0421;","&#x0414;","&#x0417;","&#x0426;","&#x003B;","&#x0028;",
      "&#x042C;","&#x042F;","&#x0410;","&#x041E;","&#x0416;","&#x0413;","&#x0422;","&#x041D;","&#x0412;","&#x041C;","&#x0427;",,
      "&#x042E;","&#x0419;","&#x042A;","&#x042D;","&#x0424;","&#x0425;","&#x041F;","&#x0420;","&#x041B;","&#x0411;"];

    keyboard.Bg_shift = [["&#x007E;", "Tilde"],"&#x0021;","&#x003F;","&#x002B;","&#x0022;","&#x0025;","&#x003D;","&#x003A;","&#x002F;","&#x005F;","&#x2116;","&#x0049;","&#x0056;",
      "&#x044B;","&#x0423;","&#x0415;","&#x0418;","&#x0428;","&#x0429;","&#x041A;","&#x0421;","&#x0414;","&#x0417;","&#x0426;","&#x00A7;","&#x0029;",
      "&#x042C;","&#x042F;","&#x0410;","&#x041E;","&#x0416;","&#x0413;","&#x0422;","&#x041D;","&#x0412;","&#x041C;","&#x0427;",,
      "&#x042E;","&#x0419;","&#x042A;","&#x042D;","&#x0424;","&#x0425;","&#x041F;","&#x0420;","&#x041B;","&#x0411;"];

    keyboard.Bg_alt_gr = [,,,,,,,,,,,,,,,"&#x20AC;",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,""]
  }

  function setLayoutOnFocus()
  {
    document.addEventListener('focus', function(evt) {
      var el = evt.target;
      if (el.tagName == 'INPUT' || el.tagName == 'TEXTAREA') {
        var lang = el.getAttribute('lang');
        if (!lang) {
          lang = el.getAttribute('xml:lang')
        }

        if (lang) {
          setLang(lang);
        }
      }
    }, true);
  }

  function setLang(lang)
  {
    lang = String(lang).toLowerCase();

    for (var index in keyboard.avail_langs) {
      if (String(keyboard.avail_langs[index][0]).toLowerCase().startsWith(lang)) {
        //keyboard.SetParameters("layout", index);
        keyboard._refresh_layout(keyboard.avail_langs[index][0]);
        break;
      }
    }
  }

  // Parts of the following code are taken from the DocumentSelection
  // library (http://debugger.ru/projects/browserextensions/documentselection)
  // by Ilya Lebedev. DocumentSelection is distributed under LGPL license
  // (http://www.gnu.org/licenses/lgpl.html).

  // 'insertionS' and 'insertionE' contain the start and end
  // positions of current selection.
  //
  var opened = false, vkb = null, insertionS = 0, insertionE = 0;

  var userstr = navigator.userAgent.toLowerCase();
  var safari = (userstr.indexOf('applewebkit') != -1);
  var gecko  = false;
  // not using the original code from below, as it causes troubles in FF50
  // (userstr.indexOf('gecko') != -1) && !safari;
  var standr = gecko || window.opera || safari;

  function backFocus()
  {
    if(opened)
    {
      setRange(text, insertionS, insertionE);

      text.focus();
    }
  }

  // Advanced callback function:
  //
  function keyb_callback(ch)
  {
    var val = text.value;

    switch(ch)
    {
      case "BackSpace":
        if(val.length)
        {
          var span = null;

          if(document.selection)
            span = document.selection.createRange().duplicate();

          if(span && span.text.length > 0)
          {
            span.text = "";
            getCaretPositions(text);
          }
          else
            deleteAtCaret(text);
        }

        break;

      case "<":
        if(insertionS > 0)
          setRange(text, insertionS - 1, insertionE - 1);

        break;

      case ">":
        if(insertionE < val.length)
          setRange(text, insertionS + 1, insertionE + 1);

        break;

      case "/\\":
        if(!standr) break;

        var prev  = val.lastIndexOf("\n", insertionS) + 1;
        var pprev = val.lastIndexOf("\n", prev - 2);
        var next  = val.indexOf("\n", insertionS);

        if(next == -1) next = val.length;
        var nnext = next - insertionS;

        if(prev > next)
        {
          prev  = val.lastIndexOf("\n", insertionS - 1) + 1;
          pprev = val.lastIndexOf("\n", prev - 2);
        }

        // number of chars in current line to the left of the caret:
        var left = insertionS - prev;

        // length of the prev. line:
        var plen = prev - pprev - 1;

        // number of chars in the prev. line to the right of the caret:
        var right = (plen <= left) ? 1 : (plen - left);

        var change = left + right;
        setRange(text, insertionS - change, insertionE - change);

        break;

      case "\\/":
        if(!standr) break;

        var prev  = val.lastIndexOf("\n", insertionS) + 1;
        var next  = val.indexOf("\n", insertionS);
        var pnext = val.indexOf("\n", next + 1);

        if( next == -1)  next = val.length;
        if(pnext == -1) pnext = val.length;

        if(pnext < next) pnext = next;

        if(prev > next)
          prev  = val.lastIndexOf("\n", insertionS - 1) + 1;

        // number of chars in current line to the left of the caret:
        var left = insertionS - prev;

        // length of the next line:
        var nlen = pnext - next;

        // number of chars in the next line to the left of the caret:
        var right = (nlen <= left) ? 0 : (nlen - left - 1);

        var change = (next - insertionS) + nlen - right;
        setRange(text, insertionS + change, insertionE + change);

        break;

      default:
        insertAtCaret(text, (ch == "Enter" ? (window.opera ? '\r\n' : '\n') : ch));
    }
  }

  // This function retrieves the position (in chars, relative to
  // the start of the text) of the edit cursor (caret), or, if
  // text is selected in the TEXTAREA, the start and end positions
  // of the selection.
  //
  function getCaretPositions(ctrl)
  {
    var CaretPosS = -1, CaretPosE = 0;

    // Mozilla way:
    if(ctrl.selectionStart || (ctrl.selectionStart == '0'))
    {
      CaretPosS = ctrl.selectionStart;
      CaretPosE = ctrl.selectionEnd;

      insertionS = CaretPosS == -1 ? CaretPosE : CaretPosS;
      insertionE = CaretPosE;
    }
    // IE way:
    else if(document.selection && ctrl.createTextRange)
    {
      var start = end = 0;
      try
      {
        start = Math.abs(document.selection.createRange().moveStart("character", -10000000)); // start

        if (start > 0)
        {
          try
          {
            var endReal = Math.abs(ctrl.createTextRange().moveEnd("character", -10000000));

            var r = document.body.createTextRange();
            r.moveToElementText(ctrl);
            var sTest = Math.abs(r.moveStart("character", -10000000));
            var eTest = Math.abs(r.moveEnd("character", -10000000));

            if ((ctrl.tagName.toLowerCase() != 'input') && (eTest - endReal == sTest))
              start -= sTest;
          }
          catch(err) {}
        }
      }
      catch (e) {}

      try
      {
        end = Math.abs(document.selection.createRange().moveEnd("character", -10000000)); // end
        if(end > 0)
        {
          try
          {
            var endReal = Math.abs(ctrl.createTextRange().moveEnd("character", -10000000));

            var r = document.body.createTextRange();
            r.moveToElementText(ctrl);
            var sTest = Math.abs(r.moveStart("character", -10000000));
            var eTest = Math.abs(r.moveEnd("character", -10000000));

            if ((ctrl.tagName.toLowerCase() != 'input') && (eTest - endReal == sTest))
              end -= sTest;
          }
          catch(err) {}
        }
      }
      catch (e) {}

      insertionS = start;
      insertionE = end
    }
  }

  function setRange(ctrl, start, end)
  {
    if(ctrl.setSelectionRange) // Standard way (Mozilla, Opera, Safari ...)
    {
      ctrl.setSelectionRange(start, end);
    }
    else // MS IE
    {
      var range;

      try
      {
        range = ctrl.createTextRange();
      }
      catch(e)
      {
        try
        {
          range = document.body.createTextRange();
          range.moveToElementText(ctrl);
        }
        catch(e)
        {
          range = null;
        }
      }

      if(!range) return;

      range.collapse(true);
      range.moveStart("character", start);
      range.moveEnd("character", end - start);
      range.select();
    }

    insertionS = start;
    insertionE = end;
  }

  function deleteSelection(ctrl)
  {
    if(insertionS == insertionE) return;

    var tmp = (document.selection && !window.opera) ? ctrl.value.replace(/\r/g,"") : ctrl.value;
    ctrl.value = tmp.substring(0, insertionS) + tmp.substring(insertionE, tmp.length);

    setRange(ctrl, insertionS, insertionS);
  }

  function deleteAtCaret(ctrl)
  {
    // if(insertionE < insertionS) insertionE = insertionS;
    if(insertionS != insertionE)
    {
      deleteSelection(ctrl);
      return;
    }

    if(insertionS == insertionE)
      insertionS = insertionS - 1;

    var tmp = (document.selection && !window.opera) ? ctrl.value.replace(/\r/g,"") : ctrl.value;
    ctrl.value = tmp.substring(0, insertionS) + tmp.substring(insertionE, tmp.length);

    setRange(ctrl, insertionS, insertionS);
  }

  // This function inserts text at the caret position:
  //
  function insertAtCaret(ctrl, val)
  {
    if(insertionS != insertionE) deleteSelection(ctrl);

    if(gecko && document.createEvent && !window.opera)
    {
      var e = document.createEvent("KeyboardEvent");

      if(e.initKeyEvent && ctrl.dispatchEvent)
      {
        e.initKeyEvent("keypress",        // in DOMString typeArg,
            false,             // in boolean canBubbleArg,
            true,              // in boolean cancelableArg,
            null,              // in nsIDOMAbstractView viewArg, specifies UIEvent.view. This value may be null;
            false,             // in boolean ctrlKeyArg,
            false,             // in boolean altKeyArg,
            false,             // in boolean shiftKeyArg,
            false,             // in boolean metaKeyArg,
            null,              // key code;
            val.charCodeAt(0));// char code.

        ctrl.dispatchEvent(e);
      }
    }
    else
    {
      var tmp = (document.selection && !window.opera) ? ctrl.value.replace(/\r/g,"") : ctrl.value;
      ctrl.value = tmp.substring(0, insertionS) + val + tmp.substring(insertionS, tmp.length);
    }

    setRange(ctrl, insertionS + val.length, insertionS + val.length);
  }

  init();
  return keyboard;
})();