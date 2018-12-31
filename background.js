chrome.runtime.onInstalled.addListener(function() {

    var ruleUrl = {
        conditions: [
            new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {urlContains: 'web/index.html'},
            })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
    };

    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([ruleUrl]);
    });
});