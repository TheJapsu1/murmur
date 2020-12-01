var murmur = {
  expanded : false,
  json: undefined,
  update_interval: 5000,
  update: function() {
    console.log("typeof=" + typeof this.json);
    if (typeof this.json === "undefined") {
      this.json = {};
      this.json['history'] = [[
        this.now(),
        "Waiting for connection to server...",
        "10"]];
      
      this.json['queue'] = [["", "10"]];
      this.json['listeners'] = [0,0];
    }
    if (this.json) {
      var c = document.getElementById("murmurstatus");
      c.innerHTML = this.do_status();
    }
  },
  now: function() {
    return Math.floor(Date.now() / 1000);
  },
  toggle: function() {
    this.expanded = !this.expanded;
    this.update();
  },
  getstate: function() {
    return this.expanded;
  },
  do_line: function(tune) {
    return '<tr><td class="status">' + this.format_unix(tune[0]) + '</td><td class="status">' +
      tune[1] + '</td><td align="right" class="status">[' +
      this.format_ts(tune[2]) + ']</td></tr>\n';
  },
  do_status: function() {
    var result = '<table class="tabstatus" cellpadding=0 cellspacing=0 width="100%">';
    result += this.do_history() + this.do_current() + this.do_queue();
    result += '</table>\n';
    return result;
  },
  
  // Format current tune
  do_current: function() {
    var result = "";
    if (this.expanded) {
      // On air: Title and duration
      var history = this.json['history'];
      var current = history[history.length-1];

      // Determine how long into the tune we are (not exact
      // because of cross fade and network delay, but we don't care)
      // [current_time - start_time of playtime ]
      var played = this.now() - current[0];
      var fmt = this.format_ts(played);
      result = '<tr><td class="invstatus"><b>On air:</b></td><td class="invstatus">' +
        current[1] + '</td><td class="invstatus" align="right">[' +
        fmt + "/" + this.format_ts(current[2]) + ']</td></tr>\n';
    } else {
      // On air: Title and listeners
      var history = this.json['history'];
      var current = history[history.length-1];
      var listeners = this.json['listeners'];
      result = '<tr><td class="invstatus">&nbsp;<b>On air:</b></td><td class="invstatus">' +
        current[1] + '</td><td class="invstatus" align="right"><b>listeners</b>: ' +
        listeners[0] + "/" + listeners[1] +
        '&nbsp;</td></tr>\n';
    }
    return result;
  },
  format_ts: function(timestamp) {
    // Eventually we will send the timestamp as number of seconds
    var min = '0' + Math.floor(timestamp / 60);
    var sec = '0' + timestamp % 60;

    return "" + min.substr(-2) + ':' + sec.substr(-2);
  },

  // Format UNIX time as localtime
  format_unix: function(unixtime) {
    var ts = new Date(unixtime*1000);
    var hr = '0' + ts.getHours();
    var min = '0' + ts.getMinutes();
    var sec = '0' + ts.getSeconds();
    return hr.substr(-2) + ':' + min.substr(-2) + ':' + sec.substr(-2);
  },
  // Format the history
  do_history: function() {
    if (!this.expanded) { return ""; }
    var result = "";
    var history = this.json['history'];
    for (var n=0; n < history.length-1; n++) {
      result += this.do_line(history[n]);
    }
    return result;
  },
  do_queue: function() {
    var result = "";
    var queue = this.json['queue'];
    // single line if not expanded
    if (this.expanded) {
      for (var n=0; n<queue.length-1; n++) {
        result += '<tr><td width="60" class="status">' + (n==0?'Up next:':'&nbsp;') + '</td><td class="status">' +
          queue[n][0] + '</td><td align="right" class="status">[' +
          this.format_ts(queue[n][1]) + ']</td></tr>\n';
      }
      result += '<tr><td class="status" width="60">&nbsp;</td><td class="status">' +
        queue[queue.length-1][0] + '</td><td align="right" class="status">' +
        '[<a href="#" onclick="javascript:murmur.toggle(); return false;">collapse</a>]</td></tr>';
    } else {
      result = '<tr><td class="status" width="60">&nbsp;Up next:</td><td class="status">' +
        queue[0][0] + '</td><td class="status" align="right">' +
        '[<a href="#" onclick="javascript:murmur.toggle(); return false;">expand</a>]</td></tr>';
    }
    return result;
  },
  do_fetch: function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://kohina.duckdns.org/cgi-bin/stats.cgi", true);
    xhr.onload = function (e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var json = JSON.parse(xhr.responseText);
            murmur.json = json;
          } catch(err) {
            console.log("JSON parse error: " + err);
            murmur.json = undefined;
          }
          murmur.update();
          // Schedule next fetch
          setTimeout(murmur.do_fetch, murmur.update_interval);
        } else {
          murmur.json = undefined;
          console.error("Else branch " + xhr.statusText);
          murmur.update();

          // Schedule next fetch anyway
          setTimeout(murmur.do_fetch, murmur.update_interval);
        }
      }
      else {
        console.log("Now readyState = " + xhr.readyState);
      }
    };
    
    xhr.onerror = function (e) {
      console.error("XHR failure: " + xhr.statusText);
      murmur.json = undefined;
      murmur.update();
      setTimeout(murmur.do_fetch, murmur.update_interval);
    };

    // this is ridiculous
    xhr.onloadend = function() {
      if(xhr.status == 404) {
        console.error("XHR 404: " + xhr.statusText);
        murmur.json = undefined;
        murmur.update();
        setTimeout(murmur.do_fetch, murmur.update_interval);
      }
    }
    
    xhr.send(null);

  }
}

murmur.do_fetch();
