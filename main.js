function trackState(searchParams, $node, paramKey, valueSetter, valueGetter) {
  if (searchParams.get(paramKey)) {
    valueSetter(searchParams.get(paramKey))
  }
  $node.on('change', function() {
    debugger;
    searchParams.set(paramKey, valueGetter());
    history.replaceState({}, "", "?" + searchParams.toString());
  })
}

$(function() {
  $.fn.reverse = Array.prototype.reverse;

  var xmlDoc = new Promise(function(resolve, _reject) {
    $.get("mbmbam-feed.xml", resolve);
  });

  var $liveShowToggle = $("#live-show-toggle");
  var $compilationToggle = $("#compilation-toggle");
  var $skipIntroToggle = $("#skip-intro-toggle");
  var $minimumEpisode = $("#minimum-episode");

  var searchParams = new URLSearchParams(window.location.search);

  trackState(
      searchParams, $liveShowToggle, "liveShows",
      function(value) {$liveShowToggle.prop('checked', value === 'true')},
      function() {return $liveShowToggle.is(":checked")}
  )
  trackState(
      searchParams, $compilationToggle, "compilations",
      function(value) {$compilationToggle.prop('checked', value === 'true')},
      function() {return $compilationToggle.is(":checked")}
  )
  trackState(
      searchParams, $skipIntroToggle, "skipIntro",
      function(value) {$skipIntroToggle.prop('checked', value === 'true')},
      function() {return $skipIntroToggle.is(":checked")}
  )
  trackState(
      searchParams, $minimumEpisode, "minimumEpisode",
      function(value) {$minimumEpisode.val(parseInt(value, 10))},
      function() {return $minimumEpisode.val()}
  )

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

      var live = $liveShowToggle.is(":checked");
      var compilation = $compilationToggle.is(":checked");
      var skip_intro = $skipIntroToggle.is(":checked");
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
