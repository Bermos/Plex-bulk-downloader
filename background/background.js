chrome.runtime.onInstalled.addListener(function() {

    let selfHostedUrlRule = {
        conditions: [
            new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {pathEquals: '/web/index.html'},
            })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
    };

    let plexHostedUrlRule = {
        conditions: [
            new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {hostEquals: 'app.plex.tv'},
            })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
    };


    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([selfHostedUrlRule, plexHostedUrlRule]);
    });
});

function updatePopup(downloader) {
    chrome.runtime.sendMessage({recipient: 'popup', do: 'queue size update', size: downloader.queue.length});
}

class Downloader {
    constructor() {
        this.queue = [];
        this.state = 'complete';

        chrome.downloads.onChanged.addListener(Downloader.onChanged);
    }

    start() {
        if (this.state === 'complete' && this.queue.length > 0) {
            let element = this.queue.shift();

            chrome.downloads.download({
                url: element.url,
                filename: element.path + "/" + element.filename
            }, id => {
                this.currentID = id;
                this.state = 'running';
            });
        }

        if (this.state === 'complete' && this.queue.length === 0) {
            updatePopup(downloader)
        }
    }

    cancelCurrent() {
        if (this.state !== 'complete') {
            chrome.downloads.cancel(this.currentID);
        }
    }

    stop() {
        this.queue = [];
        this.cancelCurrent();
    }

    static onChanged({id, state, error}) {
        if (id !== downloader.currentID || !state) // Not ours or nothing we're interested in.
            return;

        switch (state.current) {
            case 'in_progress': break;
            case 'interrupted':
                downloader.state = 'complete';
                updatePopup(downloader);

                if (!error)
                    return;

                switch (error) {
                    case 'FILE_TOO_LARGE': alert('File was too large to download!'); break;
                    case 'FILE_ACCESS_DENIED': alert('No permission to download!'); break;
                    case 'USER_CANCELED': downloader.stop(); break;
                }
                break;
            case 'complete':
                downloader.state = 'complete';
                updatePopup(downloader);

                downloader.start(); // start next download
                break;

            default: alert('Google changed it\'s API without telling me? Unbelievable! State:' + state.current);
        }
    }
}

let downloader = new Downloader();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.recipient !== 'background')
        return;

    chrome.runtime.sendMessage({recipient: 'debug', message: JSON.stringify(request)});

    if (request.do === 'add to queue') {
        request.items.forEach(function (item) {
            downloader.queue.push(item);
        });

        updatePopup(downloader);
        downloader.start();
    }

    if (request.do === 'stop downloads') {
        downloader.stop();
        updatePopup(downloader);
    }

    if (request.do === 'get queue size') {
        updatePopup(downloader);
    }
});