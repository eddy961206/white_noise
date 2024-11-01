// Offscreen Document 생성 함수
async function ensureOffscreen() {
    if (await chrome.offscreen.hasDocument()) {
        return;
    }
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: '백색 소음 재생을 위해 필요합니다.'
    });
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'play':
            ensureOffscreen().then(() => {
                chrome.runtime.sendMessage(request);
            });
            break;
        case 'stop':
            chrome.runtime.sendMessage(request);
            break;
        case 'setVolume':
            chrome.runtime.sendMessage(request);
            break;
        case 'getState':
            // 상태는 Offscreen에서 관리되므로 별도 처리 필요
            sendResponse({ isPlaying: false }); // 추후 상태 동기화 필요
            break;
    }
    return true;
});

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