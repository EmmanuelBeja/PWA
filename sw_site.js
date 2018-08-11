
let staticCacheName = 'PWA-v2';

// Default files to always cache
let cacheFiles = [
  './',
  './index.html',
  './assets',
  './accounts'
]

//install the service worker
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installed');
    //self.skipWaiting();
    //event.waitUntil Delays the event until the Promise is resolved
    event.waitUntil(
    	// Open the cache
	    caches.open(staticCacheName).then((cache) => {
	    	// Add all the default files to the cache
			console.log('[ServiceWorker] Caching cacheFiles');
			return cache.addAll(cacheFiles);
	    })
	  ); // end event.waitUntil
});

//activate the service worker
self.addEventListener('activate', function(event) {
  console.log('[ServiceWorker] Activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('PWA-') &&
                 cacheName != staticCacheName;
        }).map(function(cacheName) {
          console.log('[ServiceWorker] Removing Cached Files from Cache - ', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

//fetch data
self.addEventListener('fetch', (event) => {
	console.log('[ServiceWorker] Fetch', event.request.url);

  //cache files being requested if they are not in the cache already
  caches.match(event.request).then((response) => {
      if ( !response ) {
        // If the request is NOT in the cache, fetch and cache
          let requestClone = event.request.clone();
          return fetch(requestClone).then((response) => {
              if ( !response ) {
                console.log("[ServiceWorker] No response from fetch ");
                //return response;
              }
              let responseClone = response.clone();
              //  Open the cache
              caches.open(staticCacheName).then((cache) => {
              // Put the fetched response in the cache
              cache.put(event.request, responseClone);
              console.log('[ServiceWorker] New Data Cached', event.request.url);
              // Return the response
              //response = responseClone;
              return response;
              }) // end caches.open
          })
      }
    }) // end caches.match(event.request)

  event.respondWith(
    fromNetwork(event.request, 400).catch(() => {
      return fromCache(event.request);
    })
  );

});

//fetch resources from the cache
function fromCache(request) {
  console.log('[ServiceWorker] fetch from cache.');
  return caches.open(staticCacheName).then(function (cache) {
    return cache.match(request).then(function (response) {
      return response || Promise.reject('no-match');
    });
  });
}

//fetching from the network. Incase too slow, fetch from cache
function fromNetwork(request, timeout) {
  console.log('[ServiceWorker] fetch from network.');
  return new Promise((fulfill, reject) => {
      //Reject in case of timeout.
      var timeoutId = setTimeout(reject, timeout);
      fetch(request).then((response) => {//Fulfill in case of success.
        clearTimeout(timeoutId);
        fulfill(response);
      }, reject);//Reject also if network fetch rejects.
    });
}

//this allows new serviceWorker to replace old one imediately.
self.addEventListener('message', (event) => {
  if (event.data.action == 'skipWaiting') {
    self.skipWaiting();
    return new Response("", {headers: {"Refresh": "0"}});
  }
})
