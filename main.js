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

  if (searchParams.get("liveShows")) {
    $liveShowToggle.prop('checked', searchParams.get("liveShows") === 'true');
  }
  $liveShowToggle.on('change', function() {
    searchParams.set('liveShows', $(this).is(":checked"));
    history.replaceState({}, "", "?" + searchParams.toString());
  })

  if (searchParams.get("compilations")) {
    $compilationToggle.prop('checked', searchParams.get("compilations") === 'true');
  }
  $compilationToggle.on("change", function() {
    searchParams.set("compilations", $(this).is(":checked"));
    history.replaceState({}, "", "?" + searchParams.toString());
  })

  if (searchParams.get("skipIntro")) {
    $skipIntroToggle.prop('checked', searchParams.get("skipIntro") === 'true');
  }
  $skipIntroToggle.on("change", function() {
    searchParams.set("skipIntro", $(this).is(":checked"));
    history.replaceState({}, "", "?" + searchParams.toString());
  })

  if (searchParams.get("minimumEpisode")) {
    $minimumEpisode.val(parseInt(searchParams.get("minimumEpisode"), 10));
  }
  $minimumEpisode.on("change", function() {
    searchParams.set("minimumEpisode", $(this).val());
    history.replaceState({}, "", "?" + searchParams.toString());
  })

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
