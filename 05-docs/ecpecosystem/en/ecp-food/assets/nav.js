/**
 * ECP Food — Documentation Site (EN)
 * Navigation: marks the active nav item based on the current URL.
 */
(function () {
  'use strict';

  var links = document.querySelectorAll('.sidebar-nav a');
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage === '' || currentPage === 'docs' || currentPage === 'docs/') {
    currentPage = 'index.html';
  }

  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href');
    if (!href) continue;

    var linkPage = href.split('/').pop();

    links[i].classList.remove('active');

    if (linkPage === currentPage) {
      links[i].classList.add('active');
    }
  }
})();
