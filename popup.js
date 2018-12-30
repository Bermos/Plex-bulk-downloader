function downloadElements(elements, folder) {
    let index = 0;
    let currentId;

    chrome.downloads.onChanged.addListener(onChanged);

    next();

    function next() {
        if (index >= elements.length) {
            chrome.downloads.onChanged.removeListener(onChanged);
            document.getElementById("url").innerText = "Done :)";
            return;
        }
        const element = elements[index];
        index++;
        if (url) {
            chrome.downloads.download({
                url: element.url,
                filename: folder + "/" + element.name
            }, id => {
                currentId = id;
            });
        }
    }

    function onChanged({id, state}) {
        if (id === currentId && state && state.current !== 'in_progress') {
            next();
        }
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {

        let url = tabs[0].url;
        let urlParamPart = url.split("?")[1];
        let params = new Map();

        urlParamPart.split("&").forEach(function (part) {
            params.set(part.split("=")[0], part.split("=")[1])
        });

        let matches = url.match(/^(https?:\/\/[^\/?#]+)(?:[\/?#]|$)/i);
        let domain = matches && matches[1];

        let urlToken = "?X-Plex-Token=" + request.token;
        let reqUrl = domain + decodeURIComponent(params.get("key")) + "/children" + urlToken;

        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {

                var data = JSON.parse(xhr.responseText)
                var elements = data.MediaContainer.Metadata;

                let elementUrls = [];
                elements.forEach(function (element) {
                    elementUrls.push({
                        url: domain + element.Media[0].Part[0].key + urlToken + "&download=1",
                        name: element.title + "." + element.Media[0].container})
                });

                let folder = "" + data.MediaContainer.title1.replace("/", "_") + "/" + data.MediaContainer.title2.replace("/", "_");

                document.getElementById("url").innerText = `Found ${elementUrls.length} elements to download.`;
                document.getElementById("startDownload").disabled = false;
                document.getElementById("startDownload").addEventListener("click", function () {
                    document.getElementById("url").innerText = `Downloading ${elementUrls.length} elements...`;

                    downloadElements(elementUrls, folder);
                })
            }

        };

        xhr.open("GET", reqUrl, true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.send();
    });
});

chrome.tabs.executeScript({
    file: 'getAccessToken.js'
});