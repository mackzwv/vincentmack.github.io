/* site.js — behaviour every page needs: the animated header canvas. */
(function () {
(function () {
      var canvas = document.getElementById('net-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var W, H, pts, active = true;

      // NYP house colours. The red is brightened from #d2202e because a node is
      // 2px of colour on a dark navy field — the brand red at full saturation
      // reads as brown at that size.
      var PALETTE = [
        { rgb: '255,255,255', a: .5, r: 1.9 },              // white
        { rgb: '147,197,253', a: .55, r: 2.0 },             // header blue
        { rgb: '240,58,72', a: 1, r: 3, glow: 9 }           // NYP red
      ];
      var RED_SHARE = .3;    // roughly a third of the nodes carry the red

      function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
        pts = [];
        var n = Math.min(40, Math.floor(W * H / 8000));
        for (var i = 0; i < n; i++) {
          var c = Math.random() < RED_SHARE ? 2 : (Math.random() < .45 ? 0 : 1);
          pts.push({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
            c: PALETTE[c]
          });
        }
      }
      function draw() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < pts.length; i++) {
          var p = pts[i];
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          if (p.c.glow) {
            var h = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.c.glow);
            h.addColorStop(0, 'rgba(' + p.c.rgb + ',.5)');
            h.addColorStop(1, 'rgba(' + p.c.rgb + ',0)');
            ctx.beginPath(); ctx.arc(p.x, p.y, p.c.glow, 0, Math.PI * 2);
            ctx.fillStyle = h; ctx.fill();
          }
          ctx.beginPath(); ctx.arc(p.x, p.y, p.c.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.c.rgb + ',' + p.c.a + ')'; ctx.fill();
          for (var j = i + 1; j < pts.length; j++) {
            var q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 120) {
              // each edge fades from one endpoint's colour to the other, so
              // blue-to-red links carry both rather than picking a winner.
              // Same-colour pairs skip the gradient — it is per-edge per-frame.
              var a = (1 - d / 120) * .3, s;
              if (p.c === q.c) {
                s = 'rgba(' + p.c.rgb + ',' + a + ')';
              } else {
                s = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
                s.addColorStop(0, 'rgba(' + p.c.rgb + ',' + a + ')');
                s.addColorStop(1, 'rgba(' + q.c.rgb + ',' + a + ')');
              }
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
              ctx.strokeStyle = s; ctx.stroke();
            }
          }
        }
        if (active) requestAnimationFrame(draw);
      }
      resize(); draw();
      window.addEventListener('resize', resize);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          active = e[0].isIntersecting;
          if (active) requestAnimationFrame(draw);
        }).observe(canvas);
      }
    })();
})();
