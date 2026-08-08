/* viz.js — knowledge graph, semantic map, and the ask panel. */
    // ── SUBTAB SWITCHING ──
    // The timeline lives on its own page now, so only two panes remain.
    var graphBuilt = false;
    var semanticBuilt = false;
    
    var subtabBtns = document.querySelectorAll('.subtab-btn');
    function activateSubtab(btn) {
      for (var i = 0; i < subtabBtns.length; i++) {
        subtabBtns[i].classList.remove('active');
        subtabBtns[i].setAttribute('aria-selected', 'false');
      }
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      var stTarget = btn.getAttribute('data-subtab');
      var spanes = document.querySelectorAll('.subtab-pane');
      for (var j = 0; j < spanes.length; j++) spanes[j].classList.remove('active');
      var spane = document.getElementById(stTarget);
      if (spane) spane.classList.add('active');
            if (stTarget === 'kg-pane' && !graphBuilt) { graphBuilt = true; setTimeout(buildGraph, 60); }
      else if (stTarget === 'sm-pane' && !semanticBuilt) { semanticBuilt = true; setTimeout(buildSemanticMap, 60); }
    }
    for (var s = 0; s < subtabBtns.length; s++) {
      subtabBtns[s].addEventListener('click', function() { activateSubtab(this); });
    }

    // ── D3 KNOWLEDGE GRAPH ──
    function buildGraph() {
      if (siteData) {
        renderGraph(siteData.nodes, siteData.links);
      } else {
        // fallback if fetch hasn't completed yet
        fetch('graph-data.json')
          .then(function(r) { return r.json(); })
          .then(function(data) { siteData = data; renderGraph(data.nodes, data.links); })
          .catch(function(err) {
            console.error('Could not load graph-data.json:', err);
            document.getElementById('graph-wrap').innerHTML =
              '<p style="color:#94a3b8;padding:40px;text-align:center">Graph data could not be loaded. Make sure graph-data.json is in the same folder and served over HTTP.</p>';
          });
      }
    }

    function renderGraph(nodes, links) {
      var wrap = document.getElementById('graph-wrap');
      if (!wrap) return;
      var W = wrap.clientWidth || 800;
      var H = Math.max(480, Math.min(680, window.innerHeight * 0.68));
      var mob = W < 600;
      var svg = d3.select('#graph-svg').attr('viewBox', '0 0 ' + W + ' ' + H).attr('height', H);

      var COLORS = { area: '#2563eb', paper: '#7c3aed', project: '#0891b2', concept: '#d97706' };

      // arrow marker for progression edges
      svg.append('defs').append('marker')
        .attr('id', 'arrow').attr('viewBox', '0 -4 8 8')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#94a3b8');

      var g = svg.append('g');

      // zoom
      svg.call(d3.zoom().scaleExtent([.3, 3]).on('zoom', function (e) {
        g.attr('transform', e.transform);
      }));

      var sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(function (d) { return d.id; })
          .distance(function (d) {
            var s = d.source.type, t = d.target.type;
            if (s === 'area' && t === 'area') return 220;
            if (s === 'area' || t === 'area') return 140;
            return 90;
          }).strength(function (d) { return d.prog ? .6 : .3; }))
        .force('charge', d3.forceManyBody().strength(function (d) {
          return d.type === 'area' ? -600 : d.type === 'concept' ? -120 : -200;
        }))
        .force('center', d3.forceCenter(W / 2, H / 2).strength(.08))
        .force('collide', d3.forceCollide().radius(function (d) { return d.r + 10; }).strength(.8))
        .force('x', d3.forceX(W / 2).strength(.04))
        .force('y', d3.forceY(H / 2).strength(.04));

      var link = g.append('g').selectAll('line').data(links).join('line')
        .attr('stroke', function (d) { return d.prog ? '#94a3b8' : '#334155'; })
        .attr('stroke-width', function (d) { return d.prog ? 1.5 : 1; })
        .attr('stroke-dasharray', function (d) { return d.prog ? '5,3' : null; })
        .attr('marker-end', function (d) { return d.prog ? 'url(#arrow)' : null; })
        .attr('opacity', function (d) { return d.prog ? .7 : .45; });

      var node = g.append('g').selectAll('g').data(nodes).join('g')
        .attr('cursor', 'pointer')
        .call(d3.drag()
          .on('start', function (e, d) { if (!e.active) sim.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', function (e, d) { d.fx = e.x; d.fy = e.y; })
          .on('end', function (e, d) { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

      node.append('circle')
        .attr('r', function (d) { return d.r; })
        .attr('fill', function (d) { return COLORS[d.type]; })
        .attr('fill-opacity', function (d) { return d.type === 'area' ? .9 : .8; })
        .attr('stroke', 'rgba(255,255,255,0.15)')
        .attr('stroke-width', function (d) { return d.type === 'area' ? 2.5 : 1.5; });

      node.each(function (d) {
        var el = d3.select(this);
        var lines = d.label.split('\n');
        var lh = d.type === 'area' ? 13 : 11;
        var fs = d.type === 'area' ? 11 : (mob ? 9 : 10);
        var sy = -(lines.length - 1) * lh / 2;
        var txt = el.append('text')
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('fill', '#fff').attr('font-family', 'Inter,sans-serif')
          .attr('font-weight', d.type === 'area' ? '600' : '500')
          .attr('font-size', fs + 'px').attr('pointer-events', 'none');
        lines.forEach(function (ln, i) {
          txt.append('tspan').attr('x', 0).attr('y', sy + i * lh).text(ln);
        });
      });

      var tooltip = document.getElementById('g-tooltip');
      var ttTitle = document.getElementById('tt-title');
      var ttType = document.getElementById('tt-type');
      var ttDesc = document.getElementById('tt-desc');
      var typeLabels = { area: 'Research Area', paper: 'Publication', project: 'Applied Project', concept: 'Methodology / Concept' };
      var activeNode = null;

      function showTip(event, d) {
        ttTitle.textContent = d.label.replace(/\n/g, ' ');
        ttType.textContent = typeLabels[d.type];
        ttDesc.textContent = d.desc;
        tooltip.classList.add('visible');
        moveTip(event);
      }
      function moveTip(event) {
        var x = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
        var y = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
        tooltip.style.left = Math.min(x + 14, window.innerWidth - 240) + 'px';
        tooltip.style.top = (y - 10) + 'px';
      }
      function hideTip() { tooltip.classList.remove('visible'); }

      function highlightNode(d) {
        if (activeNode === d.id) { activeNode = null; resetHighlight(); return; }
        activeNode = d.id;
        var connected = new Set([d.id]);
        links.forEach(function (l) {
          var sid = l.source.id || l.source, tid = l.target.id || l.target;
          if (sid === d.id) connected.add(tid);
          if (tid === d.id) connected.add(sid);
        });
        node.selectAll('circle').attr('opacity', function (n) { return connected.has(n.id) ? 1 : .15; });
        node.selectAll('text').attr('opacity', function (n) { return connected.has(n.id) ? 1 : .1; });
        link.attr('opacity', function (l) {
          var sid = l.source.id || l.source, tid = l.target.id || l.target;
          return (sid === d.id || tid === d.id) ? (l.prog ? .7 : .6) : .05;
        });
      }
      function resetHighlight() {
        node.selectAll('circle').attr('opacity', 1);
        node.selectAll('text').attr('opacity', 1);
        link.attr('opacity', function (d) { return d.prog ? .7 : .45; });
      }

      node.on('click', function (e, d) { e.stopPropagation(); highlightNode(d); showTip(e, d); })
        .on('mouseover', showTip).on('mousemove', moveTip).on('mouseout', hideTip)
        .on('touchstart', function (e, d) { e.preventDefault(); showTip(e, d); highlightNode(d); }, { passive: false })
        .on('touchend', hideTip);

      svg.on('click', function () { activeNode = null; resetHighlight(); hideTip(); });

      sim.on('tick', function () {
        link.attr('x1', function (d) { return d.source.x; }).attr('y1', function (d) { return d.source.y; })
          .attr('x2', function (d) { return d.target.x; }).attr('y2', function (d) { return d.target.y; });
        node.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
      });
    }

    // ── SEMANTIC MAP ──────────────────────────────────────────────────────────
    // Inline fallback: null until embed_pipeline.py is run and embeddings.json is generated
    var FALLBACK_EMBEDDINGS = null;

    var semData = null;
    var semMode = 'umap';
    var semSvgReady = false;
    var semSvgSel, semGSel;
    var SEM_M = { top: 28, right: 24, bottom: 56, left: 52 };

    // Three categorical hues, not six.
    //
    // The Semantic Map is a scatter, which is an "all-pairs" form: any category
    // can land next to any other, so every pair must be separable — unlike a bar
    // chart where only neighbours touch. Validated against the six colourblind
    // and contrast checks, only THREE hues clear the all-pairs floors. The
    // previous six failed hard: #7c3aed (Policy) vs #2563eb (Conference) were
    // ΔE 0.4 apart under deuteranopia — the same colour to ~8% of men — and the
    // two purples were ΔE 4.4 in NORMAL vision.
    //
    // Hues are the first three slots of the validated reference palette, in
    // fixed order (all-pairs: CVD ΔE 9.2, normal-vision ΔE 24.0).
    // Finer distinctions are available on demand through the highlight
    // selector rather than by adding hues that readers cannot separate.
    var SEM_TIER = {
      'Doctoral Dissertation':                    'theses',
      "Master's Dissertation":                    'theses',
      'Journal Articles — Published':             'peer',
      'Journal Articles — In Press':              'peer',
      'Refereed Conference Proceedings':          'peer',
      'Policy Papers & Commentaries (RSIS, NTU)': 'policy',
      'Commentaries & Op-Eds (External)':         'policy',
      'Practitioner Publications':                'policy'
    };
    var SEM_TIER_COLORS = { theses: '#2a78d6', peer: '#eb6834', policy: '#1baf7a' };
    var SEM_NEUTRAL = '#9aa0a6';   // everything not currently highlighted

    var SEM_LEGEND_ITEMS = [
      { label: 'Theses',              color: '#2a78d6' },
      { label: 'Peer-reviewed',       color: '#eb6834' },
      { label: 'Policy & commentary', color: '#1baf7a' }
    ];

    function semGroupColor(group) {
      return SEM_TIER_COLORS[SEM_TIER[group]] || SEM_NEUTRAL;
    }

    // Highlight state: null, or {kind:'group'|'topic', value:...}.
    // Highlighting never introduces a fourth hue — the selection keeps its tier
    // colour and everything else drops to neutral, so the colour legend stays
    // true whether or not something is selected.
    var semHighlight = null;
    var semTopics = null;
    var semTopicTried = false;

    function semChunkMatches(pid, topic, group) {
      if (!semHighlight) return true;
      if (semHighlight.kind === 'group') return group === semHighlight.value;
      return String(topic) === String(semHighlight.value);
    }

    function semShortTitle(title) {
      // Keep first 4–5 meaningful words, cap at 24 chars
      var words = title.replace(/['"''""‘’“”]/g, '').split(/\s+/);
      var out = '';
      for (var i = 0; i < words.length; i++) {
        var candidate = out ? out + ' ' + words[i] : words[i];
        if (candidate.length > 24) break;
        out = candidate;
      }
      return out.length < title.length ? out + '…' : out;
    }

    function semConceptLabel(data, id) {
      for (var i = 0; i < data.concepts.length; i++) {
        if (data.concepts[i].id === id) {
          var lbl = data.concepts[i].label;
          return lbl.length > 28 ? lbl.slice(0, 27) + '…' : lbl;
        }
      }
      return id;
    }

    function buildSemanticLegend() {
      var el = document.getElementById('sem-legend');
      if (!el) return;
      var html = '';
      for (var i = 0; i < SEM_LEGEND_ITEMS.length; i++) {
        html += '<div class="sem-legend-item" role="listitem">'
          + '<span class="sem-legend-dot" style="background:' + SEM_LEGEND_ITEMS[i].color + '"></span>'
          + escH(SEM_LEGEND_ITEMS[i].label) + '</div>';
      }
      if (semHighlight) {
        var name = semHighlight.value, extra = '';
        if (semHighlight.kind === 'topic' && semTopics) {
          var t = semTopics.filter(function (x) {
            return String(x.id) === String(semHighlight.value); })[0];
          if (t) {
            name = t.label;
            extra = ' — ' + t.size + ' passages across ' + t.n_works
                  + (t.n_works === 1 ? ' work' : ' works');
          }
        }
        html += '<div class="sem-legend-item" role="listitem" style="font-weight:600;color:var(--text)">'
          + '<span class="sem-legend-dot" style="background:' + SEM_NEUTRAL + '"></span>'
          + 'Dimmed &middot; showing “' + escH(name) + '”' + escH(extra) + '</div>';
      }
      el.innerHTML = html;
    }

    // Chunk-level points. Loaded lazily and entirely optionally: if chunks.json
    // is absent (v1 embeddings, or embed_pipeline_v2.py not yet run) the map
    // renders exactly as before, one dot per paper.
    var semChunks = null;
    var semChunkTried = false;

    function loadSemChunks() {
      if (semChunkTried) return;
      semChunkTried = true;
      fetch('chunks.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (cd) {
          if (!cd || !cd.chunks || !cd.chunks.length) return;
          semChunks = cd.chunks;
          // Re-render in whatever mode is currently showing. updateSemScatter
          // reads the concept selects itself, so no extra state to track.
          updateSemScatter();
        })
        .catch(function () { /* no chunks.json — paper-only map is fine */ });
    }

    function loadSemTopics() {
      if (semTopicTried) return;
      semTopicTried = true;
      fetch('topics.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (td) {
          if (!td || !td.topics || !td.topics.length) return;
          semTopics = td.topics;
          populateHighlight();
        })
        .catch(function () { /* no topics.json yet — groups only */ });
    }

    function populateHighlight() {
      var sel = document.getElementById('sem-highlight');
      if (!sel || !semData) return;
      var cur = sel.value;
      sel.innerHTML = '<option value="">— nothing —</option>';

      var groups = [];
      semData.papers.forEach(function (p) {
        if (p.group && groups.indexOf(p.group) < 0) groups.push(p.group);
      });
      if (groups.length) {
        var og = document.createElement('optgroup');
        og.label = 'Publication type';
        groups.forEach(function (g) {
          var o = document.createElement('option');
          o.value = 'g:' + g; o.textContent = g;
          og.appendChild(o);
        });
        sel.appendChild(og);
      }
      if (semTopics) {
        var ot = document.createElement('optgroup');
        ot.label = 'Discovered topic';
        semTopics.slice().sort(function (a, b) { return b.size - a.size; })
          .forEach(function (t) {
            var o = document.createElement('option');
            o.value = 't:' + t.id;
            o.textContent = t.label + '  (' + t.size + ' passages, '
              + t.n_works + (t.n_works === 1 ? ' work)' : ' works)');
            ot.appendChild(o);
          });
        sel.appendChild(ot);
      }
      sel.value = cur;
      if (!sel._wired) {
        sel._wired = true;
        sel.addEventListener('change', function () {
          var v = this.value;
          semHighlight = !v ? null
            : { kind: v.slice(0, 1) === 'g' ? 'group' : 'topic', value: v.slice(2) };
          buildSemanticLegend();
          updateSemScatter();
        });
      }
    }

    function buildSemanticMap() {
      fetch('embeddings.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          semData = data;
          initSemControls(data);
          renderSemScatter(data, 'umap', null, null);
          loadSemChunks();
          loadSemTopics();
          populateHighlight();
        })
        .catch(function () {
          if (FALLBACK_EMBEDDINGS) {
            semData = FALLBACK_EMBEDDINGS;
            initSemControls(FALLBACK_EMBEDDINGS);
            renderSemScatter(FALLBACK_EMBEDDINGS, 'umap', null, null);
          } else {
            showSemEmpty();
          }
        });
      buildSemanticLegend();
    }

    function showSemEmpty() {
      var wrap = document.getElementById('sem-wrap');
      wrap.innerHTML = '<div class="sem-empty">'
        + '<div style="font-size:2em;margin-bottom:14px">&#128202;</div>'
        + '<p style="font-weight:600;color:var(--text);margin-bottom:8px">No embedding data found.</p>'
        + '<p style="font-size:13px">Run <code>embed_pipeline.py</code> to generate semantic embeddings,<br>'
        + 'then place <code>embeddings.json</code> in the website root alongside <code>graph-data.json</code>.</p>'
        + '<pre>pip install sentence-transformers umap-learn pdfplumber requests beautifulsoup4\n'
        + 'python embed_pipeline.py\n'
        + '# then deploy embeddings.json with the site</pre>'
        + '</div>';
    }

    function initSemControls(data) {
      var cx = document.getElementById('sem-cx');
      var cy = document.getElementById('sem-cy');
      if (!cx || !cy) return;
      cx.innerHTML = '';
      cy.innerHTML = '';
      var concepts = data.concepts;
      for (var i = 0; i < concepts.length; i++) {
        var o1 = document.createElement('option');
        o1.value = concepts[i].id;
        o1.textContent = concepts[i].label;
        cx.appendChild(o1);
        var o2 = document.createElement('option');
        o2.value = concepts[i].id;
        o2.textContent = concepts[i].label;
        cy.appendChild(o2);
      }
      if (concepts.length > 1) cy.selectedIndex = 1;

      var btns = document.querySelectorAll('.sem-btn');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          for (var x = 0; x < btns.length; x++) btns[x].classList.remove('active');
          this.classList.add('active');
          semMode = this.getAttribute('data-mode');
          document.getElementById('sem-concept-selects').style.display =
            semMode === 'concept' ? 'flex' : 'none';
          updateSemScatter();
        });
      }
      cx.addEventListener('change', updateSemScatter);
      cy.addEventListener('change', updateSemScatter);
    }

    function updateSemScatter() {
      if (!semData) return;
      var cxId = document.getElementById('sem-cx').value;
      var cyId = document.getElementById('sem-cy').value;
      renderSemScatter(semData, semMode, cxId, cyId);
    }

    function renderSemScatter(data, mode, cxId, cyId) {
      var wrap = document.getElementById('sem-wrap');
      if (!wrap) return;
      var W = wrap.clientWidth || 720;
      var H = Math.max(400, Math.min(560, window.innerHeight * 0.6));
      var iW = W - SEM_M.left - SEM_M.right;
      var iH = H - SEM_M.top - SEM_M.bottom;

      var papers = data.papers;

      // Compute (x, y) for each paper
      var pts = papers.map(function (p) {
        var px, py;
        if (mode === 'umap') {
          px = p.umap_x; py = p.umap_y;
        } else {
          var sims = p.concept_sims || {};
          px = sims[cxId] != null ? sims[cxId] : 0;
          py = sims[cyId] != null ? sims[cyId] : 0;
        }
        return { x: px, y: py, paper: p };
      });

      // Chunk cloud. Each chunk is one ~200-token passage; a paper's dot is the
      // centroid of its chunks, so the cloud shows how far a paper spreads —
      // whether it sits on one topic or reaches across several.
      var groupById = {};
      papers.forEach(function (p) { groupById[p.id] = p.group; });
      var chunkPts = [];
      if (semChunks) {
        for (var ci = 0; ci < semChunks.length; ci++) {
          var c = semChunks[ci];
          var cx2, cy2;
          if (mode === 'umap') {
            cx2 = c.umap_x; cy2 = c.umap_y;
          } else {
            var cs = c.sims || {};
            cx2 = cs[cxId] != null ? cs[cxId] : null;
            cy2 = cs[cyId] != null ? cs[cyId] : null;
          }
          if (cx2 == null || cy2 == null) continue;
          chunkPts.push({ x: cx2, y: cy2, id: c.id, pid: c.paper_id,
                          group: groupById[c.paper_id],
                          topic: (c.topic === undefined ? -1 : c.topic),
                          excerpt: c.excerpt || '' });
        }
      }

      // Scales must span chunks as well as centroids, or the cloud clips
      // outside the axes — chunks always spread wider than the points they
      // average to.
      var extentPts = chunkPts.length ? pts.concat(chunkPts) : pts;
      var xExt = d3.extent(extentPts, function (d) { return d.x; });
      var yExt = d3.extent(extentPts, function (d) { return d.y; });
      var xPad = Math.max((xExt[1] - xExt[0]) * 0.1, 0.05);
      var yPad = Math.max((yExt[1] - yExt[0]) * 0.1, 0.05);
      var xScale = d3.scaleLinear().domain([xExt[0] - xPad, xExt[1] + xPad]).range([0, iW]);
      var yScale = d3.scaleLinear().domain([yExt[0] - yPad, yExt[1] + yPad]).range([iH, 0]);

      if (!semSvgReady) {
        semSvgReady = true;
        semSvgSel = d3.select('#sem-svg').attr('height', H);
        semGSel = semSvgSel.append('g')
          .attr('transform', 'translate(' + SEM_M.left + ',' + SEM_M.top + ')');
        semGSel.append('g').attr('class', 'sem-x-axis').attr('transform', 'translate(0,' + iH + ')');
        semGSel.append('g').attr('class', 'sem-y-axis');
        semSvgSel.append('text').attr('class', 'sem-xlabel')
          .attr('text-anchor', 'middle')
          .attr('y', H - 10)
          .style('font-size', '12px').style('fill', 'var(--muted)').style('font-family', "'Inter',sans-serif");
        semSvgSel.append('text').attr('class', 'sem-ylabel')
          .attr('text-anchor', 'middle')
          .attr('transform', 'rotate(-90)')
          .attr('y', 13)
          .style('font-size', '12px').style('fill', 'var(--muted)').style('font-family', "'Inter',sans-serif");
        // Chunk layer is appended BEFORE the dot layer so it paints behind.
        semGSel.append('g').attr('class', 'sem-chunk-layer')
          .style('pointer-events', 'none');
        semGSel.append('g').attr('class', 'sem-dots');

        // Tooltip reuse (graph tooltip)
        var semTooltip = document.getElementById('g-tooltip');
        semGSel.select('.sem-dots').on('mouseleave', function () {
          semTooltip.classList.remove('visible');
        });
      } else {
        semSvgSel.attr('height', H);
        semGSel.select('.sem-x-axis').attr('transform', 'translate(0,' + iH + ')');
      }

      // Axis labels
      var xLabel = mode === 'umap' ? 'UMAP Dimension 1' : semConceptLabel(data, cxId) + ' similarity';
      var yLabel = mode === 'umap' ? 'UMAP Dimension 2' : semConceptLabel(data, cyId) + ' similarity';
      semSvgSel.select('.sem-xlabel').attr('x', SEM_M.left + iW / 2).text(xLabel);
      semSvgSel.select('.sem-ylabel').attr('x', -(SEM_M.top + iH / 2)).text(yLabel);

      var xAxisFn = d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.2f'));
      var yAxisFn = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.2f'));
      semGSel.select('.sem-x-axis').transition().duration(500).call(xAxisFn);
      semGSel.select('.sem-y-axis').transition().duration(500).call(yAxisFn);

      // Chunk cloud (behind everything, non-interactive so the centroid
      // tooltips still work).
      var chunkG = semGSel.select('.sem-chunk-layer');
      var cSel = chunkG.selectAll('circle').data(chunkPts, function (d) { return d.id; });
      cSel.exit().remove();
      function chunkFill(d) {
        return semChunkMatches(d.pid, d.topic, d.group)
          ? semGroupColor(d.group) : SEM_NEUTRAL;
      }
      function chunkOpacity(d) {
        if (!semHighlight) return 0.22;
        return semChunkMatches(d.pid, d.topic, d.group) ? 0.95 : 0.04;
      }
      cSel.enter().append('circle')
          .attr('r', 2)
          .attr('cx', function (d) { return xScale(d.x); })
          .attr('cy', function (d) { return yScale(d.y); })
          .attr('fill', chunkFill)
          .attr('opacity', 0)
        .merge(cSel)
          .attr('data-pid', function (d) { return d.pid; })
          .attr('data-topic', function (d) { return d.topic; })
          .attr('fill', chunkFill)
          .transition().duration(500).ease(d3.easeCubicInOut)
          .attr('cx', function (d) { return xScale(d.x); })
          .attr('cy', function (d) { return yScale(d.y); })
          .attr('r', function (d) {
            return (semHighlight && semChunkMatches(d.pid, d.topic, d.group)) ? 4 : 2; })
          .attr('opacity', chunkOpacity);

      // Dots
      var dotsG = semGSel.select('.sem-dots');
      var tooltip = document.getElementById('g-tooltip');
      var ttTitle = document.getElementById('tt-title');
      var ttType  = document.getElementById('tt-type');
      var ttDesc  = document.getElementById('tt-desc');

      // Each paper = <g class="sem-pt"> containing: highlight rect, circle, label text
      var grps = dotsG.selectAll('.sem-pt').data(pts, function (d) { return d.paper.id; });

      // ENTER: build group structure
      var entered = grps.enter()
        .append('g')
        .attr('class', 'sem-pt')
        .attr('transform', function (d) {
          return 'translate(' + xScale(d.x) + ',' + yScale(d.y) + ')';
        })
        .style('cursor', function (d) { return d.paper.url ? 'pointer' : 'default'; });

      // Highlight rect behind label (hidden until hover)
      entered.append('rect')
        .attr('class', 'sem-label-bg')
        .attr('x', 10).attr('y', -17)
        .attr('height', 14).attr('rx', 3)
        .attr('fill', '#fef08a')   // yellow highlight
        .attr('opacity', 0)
        .each(function (d) {
          var short = semShortTitle(d.paper.title);
          d3.select(this).attr('width', short.length * 5.6 + 8);
        });

      // Dot
      entered.append('circle')
        .attr('r', 7)
        .attr('fill', function (d) { return semGroupColor(d.paper.group); })
        .attr('stroke', 'white').attr('stroke-width', 1.5)
        .attr('opacity', 0);

      // Label text
      entered.append('text')
        .attr('class', 'sem-label')
        .attr('x', 10).attr('y', -6)
        .style('font-size', '9.5px')
        .style('font-family', "'Inter', sans-serif")
        .style('fill', '#1e293b')
        .style('pointer-events', 'none')
        .text(function (d) { return semShortTitle(d.paper.title); });

      // Hover: highlight label + brighten dot + tooltip
      entered
        .on('mouseover', function (event, d) {
          var sel = d3.select(this);
          sel.select('.sem-label-bg').attr('opacity', 1);
          sel.select('.sem-label').style('font-weight', '600').style('fill', '#0f172a');
          sel.select('circle').attr('r', 9).attr('stroke-width', 2.5);
          // Light up this paper's own chunks, dim the rest, so you can see
          // which region of the map the paper actually occupies.
          if (semChunks) {
            chunkG.selectAll('circle')
              .attr('opacity', function (c) { return c.pid === d.paper.id ? 0.85 : 0.06; })
              .attr('r', function (c) { return c.pid === d.paper.id ? 3 : 2; });
          }
          var sims = d.paper.concept_sims || {};
          var entries = Object.keys(sims).map(function (k) { return [k, sims[k]]; });
          entries.sort(function (a, b) { return b[1] - a[1]; });
          var topDesc = entries.slice(0, 3).map(function (e) {
            return semConceptLabel(data, e[0]) + ': ' + e[1].toFixed(2);
          }).join('  ·  ');
          var title = d.paper.title.length > 68 ? d.paper.title.slice(0, 67) + '…' : d.paper.title;
          ttTitle.textContent = title;
          var topicNote = '';
          if (semChunks && semTopics) {
            var counts = {};
            for (var q = 0; q < semChunks.length; q++) {
              if (semChunks[q].paper_id !== d.paper.id) continue;
              var tp = semChunks[q].topic;
              if (tp === undefined || tp < 0) continue;
              counts[tp] = (counts[tp] || 0) + 1;
            }
            var best = null;
            for (var k2 in counts) if (!best || counts[k2] > counts[best]) best = k2;
            if (best !== null) {
              var tt = semTopics.filter(function (x) {
                return String(x.id) === String(best); })[0];
              if (tt) topicNote = '  ·  mostly “' + tt.label + '”';
            }
          }
          ttType.textContent  = d.paper.group
            + (d.paper.n_chunks ? '  ·  ' + d.paper.n_chunks + ' passages' : '')
            + topicNote;
          ttDesc.textContent  = topDesc || 'Run embed_pipeline_v2.py for similarity scores';
          tooltip.classList.add('visible');
          tooltip.style.left = Math.min(event.clientX + 14, window.innerWidth - 260) + 'px';
          tooltip.style.top  = (event.clientY - 10) + 'px';
        })
        .on('mousemove', function (event) {
          tooltip.style.left = Math.min(event.clientX + 14, window.innerWidth - 260) + 'px';
          tooltip.style.top  = (event.clientY - 10) + 'px';
        })
        .on('mouseout', function () {
          var sel = d3.select(this);
          sel.select('.sem-label-bg').attr('opacity', 0);
          sel.select('.sem-label').style('font-weight', '400').style('fill', '#1e293b');
          sel.select('circle').attr('r', 7).attr('stroke-width', 1.5);
          if (semChunks) {
            chunkG.selectAll('circle').attr('opacity', 0.22).attr('r', 2);
          }
          tooltip.classList.remove('visible');
        })
        .on('click', function (event, d) {
          if (d.paper.url) window.open(d.paper.url, '_blank', 'noopener');
        });

      // ENTER + UPDATE: animate position, update colors on update
      entered.merge(grps)
        .transition().duration(500).ease(d3.easeCubicInOut)
        .attr('transform', function (d) {
          return 'translate(' + xScale(d.x) + ',' + yScale(d.y) + ')';
        });

      // Paper dots follow the same rule: a group highlight dims non-members;
      // a TOPIC highlight leaves every dot in place, because a paper is a
      // centroid over many topics and claiming it "belongs" to one would lie.
      function dotFill(d) {
        if (!semHighlight) return semGroupColor(d.paper.group);
        // Topic highlight recedes EVERY dot uniformly. Dimming them selectively
        // would assert that a paper "belongs" to one topic, which is false — a
        // paper is a centroid over many. Receding them all is not a claim, it
        // just lets the passage layer read; without it 26 large saturated dots
        // drown the 18 passages you asked to see.
        if (semHighlight.kind === 'topic') return SEM_NEUTRAL;
        return d.paper.group === semHighlight.value
          ? semGroupColor(d.paper.group) : SEM_NEUTRAL;
      }
      function dotOpacity(d) {
        if (!semHighlight) return 0.88;
        if (semHighlight.kind === 'topic') return 0.3;
        return d.paper.group === semHighlight.value ? 0.9 : 0.22;
      }
      entered.merge(grps).select('circle')
        .attr('fill', dotFill)
        .attr('opacity', dotOpacity);
      entered.merge(grps).select('.sem-label')
        .style('opacity', function (d) {
          if (!semHighlight) return 1;
          if (semHighlight.kind === 'topic') return 0.35;
          return d.paper.group === semHighlight.value ? 1 : 0.25; });

      // Fade in entering circles (respecting any active highlight)
      entered.select('circle')
        .transition().duration(400).attr('opacity', dotOpacity);

      grps.exit().transition().duration(300).attr('opacity', 0).remove();
    }
  
    /* ── ASK MY RESEARCH ──────────────────────────────────────────────────
       Retrieval + generation run in a Cloudflare Worker; this only renders.
       Everything from the API is escaped before it touches innerHTML.       */
    (function () {
      var API = 'https://ask-my-papers.mackzwv.workers.dev/ask';
      var EGS = [
        'What predicts which crowdsourced ideas succeed?',
        'How is Conceptual Dependency theory used to build knowledge graphs?',
        'What is the argument about ghost cities and the Belt and Road?',
        'What determines whether labour protests happen?'
      ];

      var q = document.getElementById('ask-q');
      var go = document.getElementById('ask-go');
      var out = document.getElementById('ask-answer');
      var src = document.getElementById('ask-sources');
      var egs = document.getElementById('ask-egs');
      if (!q || !go) return;                       // panel absent, nothing to do

      function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
      }

      /* The model answers in a small markdown subset. Render only that subset,
         always from ALREADY-ESCAPED text, so no markup can survive from the API. */
      function render(md) {
        var lines = esc(md).split('\n');
        var html = '', list = null;
        function closeList() { if (list) { html += '</' + list + '>'; list = null; } }
        lines.forEach(function (raw) {
          var line = raw.trim();
          if (!line) { closeList(); return; }
          var ol = line.match(/^(\d+)\.\s+(.*)$/);
          var ul = line.match(/^[-*]\s+(.*)$/);
          if (ol)      { if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; } html += '<li>' + inline(ol[2]) + '</li>'; }
          else if (ul) { if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; } html += '<li>' + inline(ul[1]) + '</li>'; }
          else         { closeList(); html += '<p>' + inline(line) + '</p>'; }
        });
        closeList();
        return html;
      }

      function inline(t) {
        return t
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\[(\d+)\]/g, function (_, n) {
            return '<a class="ask-cite" href="#ask-src-' + n + '" data-n="' + n + '">' + n + '</a>';
          });
      }

      function showSources(sources) {
        if (!sources || !sources.length) { src.innerHTML = ''; return; }
        var h = '<h4>Passages retrieved</h4>';
        sources.forEach(function (s, i) {
          var n = i + 1;
          var title = s.url
            ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>'
            : esc(s.title);
          var sect = s.section && s.section !== 'unknown' ? ' &middot; ' + esc(s.section) : '';
          var txt = String(s.text || '');
          if (txt.length > 260) txt = txt.slice(0, 260).replace(/\s+\S*$/, '') + '…';
          h += '<div class="ask-src" id="ask-src-' + n + '">' +
               '<span class="ask-src-n">' + n + '</span>' + title +
               ' <span class="ask-src-meta">' + Number(s.score).toFixed(3) + sect + '</span>' +
               '<div class="ask-src-txt">' + esc(txt) + '</div></div>';
        });
        src.innerHTML = h;
      }

      var busy = false;
      function ask(text) {
        if (busy) return;
        var question = (text != null ? text : q.value).trim();
        if (!question) { q.focus(); return; }
        q.value = question;
        busy = true;
        go.disabled = true;
        src.innerHTML = '';
        out.innerHTML = '<p class="ask-status">Searching 1,047 passages…</p>';

        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question })
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          var d = res.d || {};
          if (d.error) {
            /* Quota exhaustion is an expected state, not a fault — style it as
               a notice rather than an error, and don't dump internals. */
            var cls = d.quota_exceeded ? 'ask-status' : 'ask-error';
            out.innerHTML = '<div class="' + cls + '">' + esc(d.error) + '</div>';
            return;
          }
          if (d.answer) {
            out.innerHTML = render(d.answer);
            if (d.truncated) {
              out.innerHTML += '<p class="ask-status">(answer cut short at the length limit)</p>';
            }
          } else {
            out.innerHTML = '<div class="ask-error">No answer was generated' +
              (d.generation_error ? ': ' + esc(d.generation_error) : '') +
              '. The passages found are listed below.</div>';
          }
          showSources(d.sources);
        })
        .catch(function (e) {
          out.innerHTML = '<div class="ask-error">Could not reach the service: ' +
                          esc(e.message) + '</div>';
        })
        .finally(function () { busy = false; go.disabled = false; });
      }

      go.addEventListener('click', function () { ask(); });
      q.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });

      EGS.forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ask-eg';
        b.textContent = t;
        b.addEventListener('click', function () { ask(t); });
        egs.appendChild(b);
      });

      /* Citation click: jump to the passage and flash it. */
      out.addEventListener('click', function (e) {
        var a = e.target.closest('.ask-cite');
        if (!a) return;
        e.preventDefault();
        var el = document.getElementById('ask-src-' + a.dataset.n);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash');
        setTimeout(function () { el.classList.remove('flash'); }, 1400);
      });
    })();

  

/* The knowledge graph is the default subtab, so build it on load. */
graphBuilt = true;
onSiteData(function () { buildGraph(); });
