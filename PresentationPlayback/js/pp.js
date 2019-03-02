/*
 * Copyright 2016 IvaLab Inc. and by respective contributors (see below).
 * 
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 * Date: 2016-02-02
 * 
 * Contributors:
 * 
 */

/*
This is the minimized version of BBB playback module. 
It support only presentations with slides, cursor and audio.
This library is suitable for embedded project.
layout of presentation playback automatically adjusting to the boundaries
of parent container.

If mid parameter not supplied during load than it's looking for 
mid parameter in URL and trying locate presentation in /presentations/${mid}/ URL (default)

For cursor work correctly it is required that $("canvas").width() and
  $("canvas").height() returns correct values. Otherwise disable cursor by
  supplying cursor: false in parameters
  
-- v 1.0
Dependencies 
 - jquery 1.10.2
 - popcorn-complete 1.5.6

NO embedded video supported. 
NO shapes at this version, cursors only

Audio mp3 format ONLY ... since it recognized by all browsers, including mobile devices

  existing audio.ogg file from presentation can be converted int mp3 by next command:
  ffmpeg -i audio.ogg -ab 128k audio.mp3

Other than that no changes. Just copy existing published BBB presentation under /presentation URL
and use presentation id in load() method.

--
   ****************** TEMPLATE FOR INTEGRATION ******************
<html>
  ...
  <link rel="stylesheet" type="text/css" href="css/pp.css" />
  
  <!-- Enable if it's not set earlier
    <script type="text/javascript" src="js/jquery.min.js"></script>
  -->
  <script type="text/javascript" src="js/popcorn-complete.min.js"></script>

  <script type="text/javascript" src="js/pp.js"></script>
  
  <script>
    jQuery(document).ready(function() {  
      var pp = new PresentationPlayback("playback");
      pp.load("meeting_id");
    });
  </script>
  
  <style>
    // Optional css overwrite
  </style>
   ...
<body>
  ....   
  <div id="playback"><!----></div>
  ....
</body>
</html
*/

/**
 * Object for BBB presentation playback
 * 
 * @param {String} id Top level element id (Mandatory)
 * @param {Object} parameters Optional set of parameters
 *    - {String} mpname OpURL parameter for meeting id
 *        Default: mid
 *    - {String} bpath URL path (absolute or relative) to the 
 *            location with presentations
 *        Default: "/presentations/"
 *    - {Boolean} cursor Load or not cursor
 *        Default: true
 * 
 * ****************** THUMBNAILS/SLIDES ******************
 *
 * Internal thumbnail/slides structures used in this class:
 *
 * this.tlist - Array with thumbnails times in chronological order
 * this.smap - Map with references thumbnail time => SVG image element 
 * this.tmap - Map with references thumbnail time => thumbnail DOM element
 * this.images - Map with reference slide index -> DOM image
 *
 * Slide can be referenced from 2 events:
 *
 * On thumbnail click - attribute img_idx located in thumbnail DOM element
 * On player frame - thumbnail DOM element can be found by time from this.tmap
 *   and them follow "thumbnail click" event
 *
 * set_active(thmb) is shared method for both events
 *
 * ****************** CURSOR ******************
 *
 * Internal cursor reference list used in this class:
 *
 * this.cmap - Map with references cursor time => cursor object
 * this.clist - Array with cursor times in chronological order  
 *
 *
 */
function PresentationPlayback(id, options) {
  
  this.opts = jQuery.extend({}, {
    mpname: "mid",
    bpath: "/presentations/",
    cursor: {
      show: true,
      radius: 6
    }
  }, options);
  
  this.container = jQuery("#" + id);
  this.pi2 = 2 * Math.PI;
  
  // Index of current slide image
  this.img_idx;
};

PresentationPlayback.prototype.load = function(mid) {
  this.mid = (mid) ? mid : this.get_url_param(this.opts.mpname);
  if (!this.mid) {
    this.show_error('Mandatory parameter "' +
      this.opts.mpname + '" (Meeting Id) is not found');
    return;
  }

  // Base path for presentation
  this.path = this.opts.bpath + this.mid;

  var me = this;
  
  // List of loaded images
  this.images = [];
  
  // Count for file loader
  this.fcnt = 1 + ((this.opts.cursor.show) ? 1 : 0);
  
  // Errors
  this.errors = [];
  
  // Start loader
  this.container.html('<div id="bbb_playback"><div class="loader"></div></div>');

  // Loading svg file with thumbnails
  jQuery.ajax({
    url: this.path  + '/shapes.svg',
    success: function(data) {
      me.process_svg(data);
      me.fcnt--;
    },
    error:function(jqXHR, msg, error) {
      me.errors.push(me.get_ajax_error(jqXHR, msg, error));
    }
  });
  
  if (this.opts.cursor.show) {
    // Loading file with cursor events
    jQuery.ajax({
      url: this.path + '/cursor.xml',
      dataType: "xml",
      success: function(data) {
        me.process_cursor(data);
        me.fcnt--;
      },
      error:function(jqXHR, msg, error) {
        me.errors.push(me.get_ajax_error(jqXHR, msg, error));
      }
    });
  }
  
  // Start loader check
  this.set_check();
};

PresentationPlayback.prototype.set_check = function() {
  var me = this;
  window.setTimeout(function() {
    me.check();
  }, 10);
};
  
PresentationPlayback.prototype.check = function() {
  // Check for errors
  if (this.errors.length > 0) {
    // Show first error
    this.show_error(this.errors[0]);
  } else if (this.fcnt == 0) {
    this.init();
  } else {
    // Keep checking
    this.set_check();
  }
};

PresentationPlayback.prototype.init = function() {
  // Close loader and add main context
  this.add_context();
  
  // Apply scale to cursor array
  this.init_cursor();
  
  // Add slides
  this.add_slides();
  
  // Add thumbnails
  this.add_thumbs();
  
  // Add text for each slide/thumbnail
  for (var idx in this.images)
    this.load_text(idx, this.images[idx]);
    
  // Set active thumbnail & corresponded slide
  this.set_active(jQuery(this.thumbs.children()[0]));
  
  // Set first cursor
  this.show_cursor(this.cmap[this.clist[0]]);
  
  // Show audio
  this.audio.show();
  
  // Finally activate popcorn
  this.run();
};

PresentationPlayback.prototype.init_cursor = function() {
  if (!this.opts.cursor.show)
    return;

  // Scale cursor for visible viewport
  var rx = Number(this.svb[0]) +
      Number(this.svb[2])/this.canvas.width();
  var ry = Number(this.svb[1]) +
      Number(this.svb[3])/this.canvas.height();
  
  for (var i in this.cmap) {
    var cr = this.cmap[i];
    cr.x = Math.floor(cr.raw[0]/rx);
    cr.y = Math.floor(cr.raw[1]/ry);
  }
};

/**
 * Set active thumbnail and activate corresponded slide
 * 
 * @param {Object} thumb DOM element for thumbnail container
 * 
 * @return {Boolean} if active thumbnail container was changed
 *      and False if nothing happened i.e same thumbnail clicked twice
 */
PresentationPlayback.prototype.set_active = function(thumb) {
  // Quick check
  if (thumb.hasClass("active"))
    return false;
  
  if (this.thumb !== undefined) {
    // Remove old active
    this.thumb.removeClass("active");
    jQuery(this.thumb.data("thumb")).removeClass("active");
    this.images[this.thumb.attr("img_idx")].
                    hide().removeClass("active");
  }
      
  // Remember current thumbnail
  this.thumb = thumb;
  
  // Set new active thumbnail
  thumb.addClass("active");
  jQuery(thumb.data("thumb")).addClass("active");
  
  // Set active slide
  this.images[thumb.attr("img_idx")].
                  show().addClass("active");
                  
  return true;
};

PresentationPlayback.prototype.process_svg = function(data) {
  var me = this;
  this.svg = jQuery(data);
  
  // List with thumbnails times
  this.tlist = [];

  // Map with references thumbnail time => SVG image element
  this.smap = {};
    
  // Map with references thumbnail time => image index
  this.tmap = {};

  jQuery("image", this.svg).each(function() {
    me.process_svg_img(jQuery(this));
  });
  
  // Sort by timestamp
  this.tlist.sort(function(a,b){return a - b;});
  
  // Check if presentation longer than hour
  this.fhour = parseInt(this.tlist[this.tlist.length - 1] / 3600) % 24 > 0;
  
  // Remember svg view box
  this.svb = jQuery("svg", this.svg).attr("viewBox").split(" ");
};

PresentationPlayback.prototype.add_context = function() {
  var h = this.container.height();
  h = (h != 0 ? h + 'px' : '100%');
  this.container.html('<table id="bbb_playback">' +
    '<tr>' +
      '<td rowspan="2" class="thumbs_">' +
        '<div class="thumbs" style="height:' +
                                  h + '"></div>' +
      '</td>' +
      '<td class="presentation">' +
        '<div class="presentation" style="height:' + h + '">' +
          '<div class="slides">' +
            '<canvas></canvas>' +
            '<div></div>' +
          '</div>' +
          '<div class="audio-player">' +
            '<audio controls style="display: none">' +
              '<source src="' + this.path +
                    '/audio/audio.mp3" type="audio/mp3" />' +
              'Your browser does not support the audio element.' +
            '</audio>' +
          '</div>' +
          
          '<div class="info">' +
        '<p>Recorded with <a target="_blank" href="http://bigbluebutton.org/">BigBlueButton</a>. </p>' +
        '<p>Use <a target="_blank" href="http://mozilla.org/firefox">Mozilla Firefox</a> or ' +
          '<a target="_blank" href="http://google.com/chrome/">Google Chrome</a> to play this recording.' +
        '</p>' +
      '</div>' +
      
        '</div>' +
      '</td>' +
    '</tr>' +
  '</table>');
  
  this.thumbs = jQuery("div.thumbs", this.container);
  this.slides = jQuery("div.slides", this.container);
  this.canvas = jQuery("canvas", this.slides);
  this.ctx = this.canvas[0].getContext("2d");
  this.audio = jQuery("audio", this.container);
  this.pc = Popcorn(this.audio[0]);
  
  // Set canvas size explicitely
  this.ctx.canvas.height = this.slides.height();
  this.ctx.canvas.width = this.slides.width();
  
  // Check height
  if (this.ctx.canvas.height == 0) {
    // Disable cursor if width not set
    if (this.ctx.canvas.width == 0)
      this.opts.cursor.show = false;
    else
      // Set height according aspect ratio of loaded svg
      this.ctx.canvas.height = this.ctx.canvas.width / 
              (Number(this.svb[2])/Number(this.svb[3]));
  }
};

PresentationPlayback.prototype.add_slides = function() {
  for (var id in this.images) 
    this.slides.append(this.images[id]);
};
   
PresentationPlayback.prototype.add_thumbs = function() {
  var me = this;
  
  for (var i in this.tlist) {
    var t = this.tlist[i];
    var simg = this.smap[t];
    
    var img = jQuery(document.createElement('img'));
    img.attr("src", this.path + "/" + simg.attr("xlink:href"));
    
    // a label with the time the slide starts
    var span = jQuery(document.createElement('span'));
    span.html(this.sec_to_hms(parseInt(t)));
    
    // And a wrapper
    var div = jQuery(document.createElement('div'));
    div.attr("time_in", t)
      .attr("img_idx", simg.attr("id"))
      .append(img)
      .append(span)
      .data("label", span)
      .data("thumb", img);
    
    // Add cross reference link between thumbnail image and container
    img.data("container", div);
    
    div.on("mouseover", function() {
        jQuery(this).data("label").show();
      })
    .on("mouseout", function() {
      jQuery(this).data("label").hide();
    })
    .on("click", function() {
      me.on_thumb_click(jQuery(this));
    });
   
    this.tmap[t] = div;
    this.thumbs.append(div);
  }
};

PresentationPlayback.prototype.on_thumb_click = function(thumb) {
  // Set active thumbnail & slide
  if (!this.set_active(thumb))
    return;
  
  // Find and draw cursor
  this.show_cursor(this.get_cursor(Number(thumb.attr("time_in"))));
  
  // Raise lock flag to prevent same processing in
  //  popcorn on_frame event
  this.flock = true;
  
  // Move player position
  this.pc.currentTime(thumb.attr("time_in"));
};

PresentationPlayback.prototype.process_cursor = function(data) {
  var me = this;
  var times = [];
  var cursors = {};
  
  jQuery("event", jQuery("recording", data)).each(function() {
    var event = jQuery(this);
    var t = Number(event.attr("timestamp"));
    
    times.push(t);
    
    cursors[t] = {
      raw: jQuery(event.children()[0]).text().split(" ")
    };
  });
  
  this.clist = times;
  this.cmap = cursors;
  
  this.clist.sort(function(a,b){return a - b;});
};

PresentationPlayback.prototype.process_svg_img = function(simg) {
  if (!simg.attr("xlink:href"))
    return;
  
  var in_time = simg.attr("in").split(" ");
  // var out_time = simg.attr("out").split(" ");
  
  // Based on input time add thumbnails
  for (var i in in_time) {
    var t = Number(in_time[i]);
    
    this.tlist.push(t);
    this.smap[t] = simg;
  }
  
  // Add slide
  var img = this.tmap[this.tlist[0]];
  var img = jQuery(document.createElement('img'));
  img.attr("src", this.path + "/" +
                    simg.attr("xlink:href"))
    .attr("alt", simg.attr("text"));
  
  // Remember each svg image
  this.images[simg.attr("id")] = img;
};

PresentationPlayback.prototype.load_text = function(idx, img) {
  var me = this;
  
  // Load alternative text for slide
  // Use previously set url in alt image attribute
  jQuery.ajax({
    url: this.path + "/" + img.attr("alt"),
    success: function(data) {
      img.attr("alt", data);
      
      // Check thumbnails
      for (var i in me.tlist) {
        var thumb = me.tmap[me.tlist[i]];
        if (thumb.attr("img_idx") == idx) {
          
          // Add mouse over text for thumbnail container
          //    and alternative text for thumbnail itself
          thumb.attr("title", data);
          thumb.data("thumb").attr("alt", data);
        }
      }
    },
    error:function(jqXHR, msg, error) {
      img.attr("alt", me.get_ajax_error(jqXHR, msg, error));
    }
  });
};
        
/**
 * Prepare data and run popcorn library
 */
PresentationPlayback.prototype.run = function() {
  var me = this;
  
  this.pc.code({
      start: 0, // start time
      end: this.pc.duration(),
      onFrame: function(options) {
        // Quick check
        if (me.flock) {
          // Drop lock flag
          me.flock = false;
          return;
        }
        
        if (me.pc.paused() && !me.pc.seeking())
          return;
          
        me.on_frame(options);
      }
  });
};
        
/**
 * Prepare data and run popcorn library
 */
PresentationPlayback.prototype.on_frame = function(options) {
  // Get the frame time and round to 1 decimal place
  var t = this.pc.currentTime().toFixed(1);
  
  // 1. Process slide thumbnails
  var thumb = this.get_thumb(t);
  if (thumb !== undefined && thumb != this.thumb)
    this.set_active(thumb);
  
  // 2. Process cursor data
  var cursor = this.get_cursor(t);
  if (cursor !== undefined && cursor != this.cursor)
    this.show_cursor(cursor);
// ----------
    return;
    
    var next_image = getImageAtTime(t); //fetch the name of the image at this time.
    var imageXOffset = 0;
    var imageYOffset = 0;
    if((current_image !== next_image) && (next_image !== undefined)){ //changing slide image
      if(svgobj.contentDocument) {
        svgobj.contentDocument.getElementById(current_image).style.visibility = "hidden";
        var ni = svgobj.contentDocument.getElementById(next_image);
      }
      else {
        svgobj.getSVGDocument('svgfile').getElementById(current_image).style.visibility = "hidden";
        var ni = svgobj.getSVGDocument('svgfile').getElementById(next_image);
      }
      document.getElementById("slideText").innerHTML = ""; //destroy old plain text
      
      ni.style.visibility = "visible";
      document.getElementById("slideText").innerHTML = slidePlainText[next_image] + next_image; //set new plain text
      
      if (jQuery("#accEnabled").is(':checked')) {
        //pause the playback on slide change
        p.pause();
        jQuery('#audio').attr('slide-change', 'slide-change');
        p.listen(Popcorn.play, removeSlideChangeAttribute);
      }

      var num_current = current_image.substr(5);
      var num_next = next_image.substr(5);
      
      if(svgobj.contentDocument) currentcanvas = svgobj.contentDocument.getElementById("canvas" + num_current);
      else currentcanvas = svgobj.getSVGDocument('svgfile').getElementById("canvas" + num_current);
      
      if(currentcanvas !== null) {
        currentcanvas.setAttribute("display", "none");
      }
      
      if(svgobj.contentDocument) nextcanvas = svgobj.contentDocument.getElementById("canvas" + num_next);
      else nextcanvas = svgobj.getSVGDocument('svgfile').getElementById("canvas" + num_next);
      
      if((nextcanvas !== undefined) && (nextcanvas != null)) {
        nextcanvas.setAttribute("display", "");
      }
      current_image = next_image;
    }
    
    if(svgobj.contentDocument) var thisimg = svgobj.contentDocument.getElementById(current_image);
    else var thisimg = svgobj.getSVGDocument('svgfile').getElementById(current_image);

    var offsets = thisimg.getBoundingClientRect();
    // Offsets divided by 4. By 2 because of the padding and by 2 again because 800x600 is half  1600x1200
    imageXOffset = (1600 - parseInt(thisimg.getAttribute("width"), 10))/4;
    imageYOffset = (1200 - parseInt(thisimg.getAttribute("height"), 10))/4;

    
    var vboxVal = getViewboxAtTime(t);
    if(vboxVal !== undefined) {
      setViewBox(vboxVal);
    }
    
    var cursorVal = getCursorAtTime(t);
    var cursor_on = false;
    if(cursorVal != null) {
      if(!cursor_on) {
        document.getElementById("cursor").style.visibility = 'visible'; //make visible
        cursor_on = true;
      }
      setCursor([parseFloat(cursorVal[0]) + imageXOffset - 6, parseFloat(cursorVal[1]) + imageYOffset - 6]); //-6 is for radius of cursor offset
    }
};

/**
 * Show cursor
 * 
 * @param {Object} cursor object from svg file
 */
PresentationPlayback.prototype.show_cursor = function(cursor) {
  if (!this.opts.cursor.show)
    return;
  
  var radius = this.opts.cursor.radius;
  
  if (this.cursor !== undefined) {
    // this.paint_cursor(this.cursor, "#FFFFFF", 3);
    this.ctx.restore();
    this.ctx.clearRect(this.cursor.x - radius - 1,
      this.cursor.y - radius - 1, radius * 2 + 1, radius * 2 + 1);
  }
  
  // Paint new cursor
  this.ctx.save();
  this.paint_cursor(cursor, "#FF0000", radius);
  
// Remember current cursor
  this.cursor = cursor;
};

/**
 * Paint cursor
 * 
 * @param {Object} cursor object
 * @param {String} color Fill/Stroke color
 * @param {String} radius cursor radius
 * 
 */
PresentationPlayback.prototype.paint_cursor = function(cursor, color, radius) {
  this.ctx.beginPath();
  this.ctx.fillStyle = color;
  this.ctx.arc(cursor.x, cursor.y, radius, 0, this.pi2, true);
  this.ctx.fill();
  this.ctx.clip();
};

/**
 * Return cursor by time
 * 
 * @param {Number} t time
 * @return {Object} Cursor object 
 */
PresentationPlayback.prototype.get_cursor = function(time) {
  return this.cmap[this.clist[this.binary_search(this.clist, 
                              time, 0, this.clist.length - 1)]];
};

/**
 * Return thumbnail by time
 * 
 * @param {Number} t time
 * @return {Object} Thumbnail container DOM element 
 */
PresentationPlayback.prototype.get_thumb = function(time) {
  return this.tmap[this.tlist[this.binary_search(this.tlist, 
                              time, 0, this.tlist.length - 1)]];
};

/**
 * Execute binary search on array with thumbnail times to find 
 *   which range thumbnail belongs
 * 
 * @param {Number} t time
 * @return {Object} Thumbnail container DOM element 
 */
PresentationPlayback.prototype.search_thumb = function(time, min, max) {
  // Start from middle
  var idx = Math.floor((min + max) / 2);
  
  var t = this.tlist[idx];
  if (time == t)
    // Got exact hit
    return this.tmap[t];
  else if (time < t)
    // Recursively check left range
    return idx == min ? (idx == 0 ? this.tmap[t] : this.tmap[this.tlist[idx - 1]]) : 
        this.search_thumb(time, min, idx - 1);
  else
    // Recursively check left range
    return idx == max ? this.tmap[t] : this.search_thumb(time, idx + 1, max);
    
};

/**
 * Execute binary search on array with chronological time marks to find 
 *   which range given time belongs
 * 
 * @param {Array} list Array with time marks in chronological order
 * @param {Number} t time
 * @param {Number} min Minimum array index
 * @param {Number} max Maximum array index
 *
 * 
 * @return {Integer} index in array
 * 
 */
PresentationPlayback.prototype.binary_search = function(list, time, min, max) {
  // Start from middle
  var idx = Math.floor((min + max) / 2);
  
  var t = list[idx];
  if (time == t)
    // Got exact match
    return idx;
  else if (time < t)
    // Recursively check left range
    return idx == min ? (idx == 0 ? idx : idx - 1) : 
        this.binary_search(list, time, min, idx - 1);
  else
    // Recursively check left range
    return idx == max ? idx : 
        this.binary_search(list, time, idx + 1, max);
    
};

/**
 * Get url parameter by name
 * 
 * @param {String} pname
 * 
 * @return {String} parameter value or undefined
 * 
 */
PresentationPlayback.prototype.get_url_param = function(pname) {
  var rs = "[\\?&]"+ pname + "=([^&#]*)";
  var regex = new RegExp(rs);
  var res = regex.exec(location.search);
  return (res != null && res.length > 0) ? res[1] : undefined;
};

/**
   * Convert ajax error variables into string
   * 
   * @param {Object} jqXHR superset of the XMLHTTPRequest object
   * @param {String} msg string describing the type of error that occurred. 
   *    Possible values for the second argument (besides null) are 
   *    "timeout", "error", "abort", and "parsererror".
   * @param {Object} error optional exception object, if one occurred
   * @return String with formatted error message
   */
PresentationPlayback.prototype.get_ajax_error = function(jqXHR, msg, error) {
  msg = msg.toUpperCase();
  if (jqXHR.status !== undefined)
    msg += " " + jqXHR.status;
  
  if (typeof error == "object") {
    if (error.message !== undefined)
      msg += ". " + error.message;
  } else if (typeof error == "string") {
    msg += ". " + ((error.indexOf("ERROR") == 0) ? 
                        error : error.toUpperCase());
  }
    
  return msg;
};

/**
 * Convert seconds to hh:mm:ss format and optionally show hours
 * 
 * @param {Number} sec Number os seconds
 * 
 * @return {String} Seconds converted into h:m:s format
 */
PresentationPlayback.prototype.sec_to_hms = function(sec) {
  return ((this.fhour) ? parseInt(sec / 3600) % 24 + ":" : "") + 
    parseInt(sec / 60) % 60 + ":" + sec % 60;
};

/**
 * Format & show error in parent container
 * 
 * @param {String} msg Error message
 * 
 */
PresentationPlayback.prototype.show_error = function(msg) {
  this.container.html('<font color="red"><b>' + msg + '</b></font>');
};
