// 초기화
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        noiseSettings: {
            type: 'white',
            volume: 50,
            isPlaying: false
        }
    });
}); 