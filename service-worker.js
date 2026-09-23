// 調酒筆記 Service Worker
// 提供離線使用：把 App 本體快取起來，沒網路也能開。
// 改版時把 CACHE_VERSION 加一，使用者下次連線就會自動更新。

var CACHE_VERSION = "cocktail-journal-v1";
var APP_SHELL = [
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "icon-180.png"
];

// 安裝：預先快取 App 檔案
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// 啟用：清掉舊版本快取
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_VERSION; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// 取用：先看快取，沒有再抓網路（stale-while-revalidate 精神）
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request).then(function (networkResp) {
        // 成功抓到就順手更新快取
        if (networkResp && networkResp.status === 200 && networkResp.type === "basic") {
          var clone = networkResp.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return networkResp;
      }).catch(function () {
        // 離線且快取沒有時，回傳首頁作為後備
        return cached || caches.match("index.html");
      });
      return cached || fetchPromise;
    })
  );
});
