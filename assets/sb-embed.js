/* rūsc — SimplyBook embedded booking wrapper.
   Injects the official SimplyBook iframe widget (no third-party script tags needed:
   only an iframe + the documented postMessage contract).
   Events handled: appReady / setSettings, updateWidgetSize / updateWidgetSize,
   expandHeight / collapseHeight (modals), scrollTo, closeWidget.            */
(function () {
  'use strict';

  var SB_BASE = 'https://studiorusc.simplybook.it';
  var MIN_HEIGHT = 900;

  function bookingsMount() {
    return document.getElementById('sb-bookings');
  }

  function buildUrl(lang, target) {
    // '#book' drops the user straight into the service list (skips the landing page)
    var hash = '#book';
    if (target) hash = '#' + target;
    var url = SB_BASE + '/v2/?widget-type=iframe'
      + '&theme=default'
      + '&lang=' + encodeURIComponent(lang || 'fr')
      + '&host_url=' + encodeURIComponent(window.location.href)
      + hash;
    return url;
  }

  function mount(lang) {
    var host = bookingsMount();
    if (!host) return null;
    if (host.dataset.sbMounted === '1' && host.firstElementChild) {
      return host.firstElementChild;
    }
    var frame = document.createElement('iframe');
    frame.className = 'sb-frame';
    frame.id = 'sb-frame';
    frame.title = 'Réservation rūsc — SimplyBook';
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('width', '100%');
    frame.src = buildUrl(lang, host.getAttribute('data-sb-target'));
    frame.setAttribute('data-sb-target', host.getAttribute('data-sb-target') || 'book');
    host.innerHTML = '';
    host.appendChild(frame);
    host.dataset.sbMounted = '1';
    return frame;
  }

  function reflow(frame) {
    // let the widget report its real height; fall back to viewport-based sizing
    window.setTimeout(function () {
      if (!frame || !frame.isConnected) return;
      var h = parseInt(frame.getAttribute('data-sb-height'), 10);
      if (!h || h < 200) {
        h = Math.max(MIN_HEIGHT, Math.round((window.innerHeight || 800) * 0.9));
        frame.style.height = h + 'px';
      }
    }, 1500);
  }

  function wire(frame) {
    if (!frame || frame.dataset.sbWire === '1') return;
    frame.dataset.sbWire = '1';

    window.addEventListener('message', function (e) {
      if (!frame.contentWindow || e.source !== frame.contentWindow) return;
      var d = e.data;
      if (!d || typeof d !== 'object') return;

      // inner page announces its ready state → (re)assert target step once
      if (d.event === 'appReady' && frame.getAttribute('data-sb-target') && !frame.dataset.sbNudged) {
        frame.dataset.sbNudged = '1';
        frame.contentWindow.postMessage({ navigate: frame.getAttribute('data-sb-target') }, '*');
      }

      // settings handshake — answer the widget's appReady
      if (d.event === 'appReady' || d.event === 'getSettings') {
        frame.contentWindow.postMessage({
          update_config: true,
          update_theme_vars: true,
          rerender: false,
          hostname: window.location.hostname,
          url: window.location.href
        }, '*');
        return;
      }

      if (d.event === 'updateWidgetSize' || d.event === 'card_height') {
        var h = parseInt(d.height, 10);
        if (h && h > 200) {
          frame.setAttribute('data-sb-height', h);
          frame.style.height = h + 'px';
        }
        return;
      }

      if (d.event === 'expandHeight') {
        var eh = parseInt(d.height, 10);
        if (eh && eh > (parseInt(frame.style.height, 10) || 0)) {
          frame.style.height = eh + 'px';
        }
        return;
      }

      if (d.event === 'collapseHeight' || d.event === 'closeWidget') {
        var bh = parseInt(frame.getAttribute('data-sb-height'), 10);
        if (bh && bh > 200) frame.style.height = bh + 'px';
        return;
      }

      if (d.event === 'scrollTo' && typeof d.content_position !== 'undefined') {
        var top = frame.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }, false);
  }

  function init() {
    var host = bookingsMount();
    if (!host) return;
    var lang = host.getAttribute('data-sb-lang') || document.documentElement.lang || 'fr';
    lang = /^en/i.test(lang) ? 'en' : 'fr';

    var frame = mount(lang);
    wire(frame);
    reflow(frame);

    // lazy: only load when the section approaches the viewport
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var f = mount(lang);
            wire(f);
            reflow(f);
          }
        });
      }, { rootMargin: '400px 0px' });
      io.observe(host);
    }

    window.addEventListener('resize', function () { reflow(frame); }, { passive: true });

    // deep links into the widget (e.g. "Adhérer" → membership page)
    document.querySelectorAll('[data-sb-navigate]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        var f = mount(lang);
        wire(f);
        var to = el.getAttribute('data-sb-navigate');
        f.contentWindow.postMessage({ navigate: to }, '*');
        var top = host.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
