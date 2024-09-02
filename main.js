$(function() {
  $.fn.reverse = Array.prototype.reverse;

  var xmlDoc = new Promise(function(resolve, reject) {
    $.get("mbmbam-feed.xml", resolve);
  });

  var episodes = xmlDoc.then(function(doc) {
    var rss = doc.documentElement;
    return $(rss)
      .find("channel > item")
      .reverse()
      .map(function(i, item) {
        var $item = $(item);

        var ret = {};
        ret.title = $item.find("title").html();
        ret.desc = $item
          .find("description")
          .html()
          .replace("<p></p>", "")
          .replace("<p> </p>", "")
          .replace("<![CDATA[", "")
          .replace("]]>", "")
          .trim();
        ret.url = $item.find("enclosure").attr("url");
        ret.pubDate = $item.find("pubDate").html();

        ret.live = ret.title.toLowerCase().includes("face 2 face");
        ret.compilation = ret.title
          .toLowerCase()
          .includes("bro's better, bro's best");

        ret.episodeNumber = i + 1;

        return ret;
      });
  });

  episodes = episodes.then(_.shuffle);
  var ep_index = -1;

  var audio = document.getElementById("audio-player");
  var source = document.getElementById("audio-source");


  episodes.then(function(episodes) {
    function loadNextEpisode() {
      var $liveToggle = $("#live-show-toggle");
      var $compilationToggle = $("#compilation-toggle");
      var $skipToggle = $("#skip-intro-toggle");
      var $minimumEpisode = $("#minimum-episode");

      var live = $liveToggle.is(":checked");
      var compilation = $compilationToggle.is(":checked");
      var skip_intro = $skipToggle.is(":checked");
      var rawMinEpisode = $minimumEpisode.val() || 1;
      var minimumEpisode = Math.min(Math.max(parseInt(rawMinEpisode, 10), 1), episodes.length);

      while (true) {
        ++ep_index;
        var ep = episodes[ep_index % episodes.length];

        if ((ep.live && !live) || (ep.compilation && !compilation) || ep.episodeNumber < minimumEpisode) {
          console.log("Skipping '%s'...", ep.title);
          continue;
        }
        break;
      }

      $("#display-title").html(ep.title);
      $("#display-date").html(ep.pubDate);
      $("#display-desc").html(ep.desc);
      source.src = ep.url;
      audio.load();

      if (skip_intro && !ep.live) {
        audio.currentTime = 40;
      }
    }

    $("#loading").hide();
    loadNextEpisode();
    $("#loaded").show();

    $("#next").on("click", function() {
      loadNextEpisode();
    });

    audio.addEventListener("ended", function() {
      loadNextEpisode();
      audio.play();
    });
  });
});
