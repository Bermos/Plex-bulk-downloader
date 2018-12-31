let status = document.getElementById("status");
let downloadBtn = document.getElementById("startDownload");
let currentDownloadId;

function escapeWinDir(path) {
    path = path.replace(/([:])/g, " -");
    path = path.replace(/([/\\|])/g, "_");
    path = path.replace(/([<>"?*])/g, "'");

    return path;
}

function downloadElements(elements, folder) {
    let index = 0;

    chrome.downloads.onChanged.addListener(onChanged);

    next();

    function next() {
        if (index >= elements.length) {
            chrome.downloads.onChanged.removeListener(onChanged);
            status.innerText = "Done :)";
            return;
        }
        const element = elements[index];
        index++;
        if (element.url) {
            chrome.downloads.download({
                url: element.url,
                filename: folder + "/" + element.name
            }, id => {
                currentDownloadId = id;
            });
        }
    }

    function onChanged({id, state}) {
        if (id === currentDownloadId && state && state.current !== 'in_progress') {
            next();
        }
    }
}

/**
 * Listener for the token send back by the content script running on the Plex site
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    let token = request.token;
    let serverUrl = request.serverUrl;
    let detailsPath = request.detailsPath;

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) { // Success

            let data = JSON.parse(xhr.responseText);
            let album = data.MediaContainer;
            let elements = album.Metadata;

            let elementUrls = [];
            elements.forEach(function (element) {
                elementUrls.push({
                    url: [serverUrl, element.Media[0].Part[0].key, "?X-Plex-Token=", token, "&download=1"].join(""),
                    name: escapeWinDir(element.title + "." + element.Media[0].container)
                })
            });

            let folder = `${escapeWinDir(album.title1)}/${escapeWinDir(album.title2)}`;

            status.innerText = `Found ${elementUrls.length} elements to download.`;
            downloadBtn.disabled = false;
            downloadBtn.addEventListener("click", function () {
                status.innerText = `Downloading ${elementUrls.length} elements...`;

                downloadElements(elementUrls, folder);
                downloadBtn.disabled = true;
            });
        } else if (xhr.readyState === 4 && xhr.status === 401) { // Auth error
            status.innerText = "Authorization error."
        } else if (xhr.readyState === 4 && xhr.status !== 200) { // Generic error
            status.innerText = "Error while fetching album contents.\nReopen this popup to try again.";
        }

    };

    status.innerText = "Requesting album info from server...";
    let requestUrl = [serverUrl, detailsPath, "?X-Plex-Token=", token].join("");
    xhr.open("GET", requestUrl, true);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send();
});

status.innerText = "Getting server info...";
chrome.tabs.executeScript({
    file: 'getServerInfo.js'
});