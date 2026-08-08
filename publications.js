/* publications.js — renders the publication list from graph-data.json. */
function renderPublications(pubs) {
      var container = document.getElementById('pub-list');
      if (!container || !pubs) return;
      var html = '';
      var currentGroup = null;
      for (var i = 0; i < pubs.length; i++) {
        var p = pubs[i];
        if (p.group !== currentGroup) {
          currentGroup = p.group;
          html += '<div class="pub-grp">' + escH(currentGroup) + '</div>';
        }
        html += '<div class="pub' + (p.isDiss ? ' diss' : '') + '">';
        if (p.badge) {
          html += '<span class="badge ' + p.badge + '">' + escH(p.badgeLabel) + '</span>';
        }
        html += '<div class="pub-title">' + escH(p.title) + '</div>';
        html += '<div class="pub-authors">' + escH(p.authors) + '</div>';
        if (p.venueJournal || p.venueDetail) {
          html += '<div class="pub-venue">';
          if (p.venueJournal) html += '<strong>' + escH(p.venueJournal) + '</strong>';
          if (p.venueDetail) html += escH(p.venueDetail);
          html += '</div>';
        }
        if (p.dissAbs) {
          html += '<div class="diss-abs">' + escH(p.dissAbs) + '</div>';
        }
        if (p.url) {
          html += '<a class="pub-link" href="' + p.url + '" target="_blank" rel="noopener noreferrer">'
            + escH(p.linkText || 'Read →') + '</a>';
        }
        html += '</div>';
      }
      container.innerHTML = html;
    }

onSiteData(function (d) { renderPublications(d.publications); });
