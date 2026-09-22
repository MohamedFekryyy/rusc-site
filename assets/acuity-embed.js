/* rūsc — Acuity Scheduling embedded booking.
   Everything stays on the site: the Acuity iframe lives in #bk-bookings and
   the tabs (.bk-tabs [data-booking]) swap it between the scheduler, the
   catalog (class cards, membership) and gift vouchers. Any other link with
   data-booking="…" scrolls to #reservation and opens that view.
   Acuity's embed.js auto-resizes the iframe. Services, hours, payments and
   the widget language are managed in the Acuity dashboard.              */
(function () {
  'use strict';

  var OWNER = '19154889';
  var BASE = 'https://app.acuityscheduling.com';
  var VIEWS = {
    schedule: BASE + '/schedule.php?owner=' + OWNER,
    catalog: BASE + '/catalog.php?owner=' + OWNER,
    gifts: BASE + '/catalog.php?owner=' + OWNER + '&category=' + encodeURIComponent('Bons Cadeaux')
  };

  var host = document.getElementById('bk-bookings');
  if (!host) return;

  var frame = document.createElement('iframe');
  frame.className = 'bk-frame';
  frame.title = host.getAttribute('data-title') || 'Réservation rūsc';
  frame.setAttribute('frameborder', '0');
  frame.setAttribute('allow', 'payment');
  frame.setAttribute('data-offset-top', '120'); // keep nav + tabs visible when Acuity scrolls
  host.appendChild(frame);

  var tabs = document.querySelectorAll('.bk-tabs [data-booking]');

  function show(view) {
    if (!VIEWS[view]) view = 'schedule';
    var src = VIEWS[view] + '&ref=embedded_csp';
    if (frame.src !== src) {
      frame.style.height = ''; // embed.js re-sizes to the new page
      frame.removeAttribute('height');
      frame.src = src;
    }
    tabs.forEach(function (t) {
      t.setAttribute('aria-selected', t.getAttribute('data-booking') === view ? 'true' : 'false');
    });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-booking]');
    if (!el) return;
    e.preventDefault();
    show(el.getAttribute('data-booking'));
    // the new page is often shorter — bring the top of the booking block into view
    (el.closest('.bk-tabs') ? host.parentNode : document.getElementById('reservation'))
      .scrollIntoView({ behavior: 'smooth' });
  });

  show('schedule');

  var s = document.createElement('script');
  s.src = 'https://embed.acuityscheduling.com/js/embed.js';
  s.async = true;
  document.body.appendChild(s);
})();
