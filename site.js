/* site.js — behaviour every page needs: the animated header canvas. */
(function () {
(function () {
      var canvas = document.getElementById('net-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var W, H, pts, active = true;
      function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
        pts = [];
        var n = Math.min(40, Math.floor(W * H / 8000));
        for (var i = 0; i < n; i++) {
          pts.push({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4
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
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
          for (var j = i + 1; j < pts.length; j++) {
            var q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 120) {
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
              ctx.strokeStyle = 'rgba(255,255,255,' + (1 - d / 120) * .25 + ')'; ctx.stroke();
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
