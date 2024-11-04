// Offscreen Document 생성 함수
async function ensureOffscreen() {
    try {
        // 이미 존재하는지 확인
        if (await chrome.offscreen.hasDocument()) {
            return;
        }

        // 새로 생성
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: '백색 소음 재생을 위해 필요합니다.'
        });
    } catch (error) {
        // 이미 존재하는 경우의 에러는 무시
        if (!error.message.includes('Only a single offscreen document may be created')) {
            console.error('Offscreen document 생성 중 에러:', error);
        }
    }
}

let messageQueue = [];
let isOffscreenReady = false;

// offscreenReady 메시지 수신 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'offscreenReady') {
        isOffscreenReady = true;
        processMessageQueue();
    }
});

// Offscreen 문서가 준비되면 큐에 있는 메시지들을 전송
async function processMessageQueue() {
    if (messageQueue.length > 0) {
        for (const message of messageQueue) {
            try {
                await chrome.runtime.sendMessage(message);
            } catch (error) {
                console.error('메시지 전송 중 에러:', error);
            }
        }
        messageQueue = [];
    }
}

// 메시지 리스너
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    try {
        switch (request.action) {
            case 'play':
                console.log(request)
                await ensureOffscreen();
                // Offscreen 문서에 메시지 전달
                try {
                    await chrome.runtime.sendMessage(request);
                } catch (error) {
                    messageQueue.push(request);
                }
                break;

            case 'stop':
                try {
                    await chrome.runtime.sendMessage(request);
                } catch (error) {
                    messageQueue.push(request);
                }
                break;

            case 'setVolume':
                if (!isOffscreenReady) {
                    await ensureOffscreen();
                    messageQueue.push(request);
                }
                try {
                    await chrome.runtime.sendMessage(request);
                } catch (error) {
                    messageQueue.push(request);
                }
                break;

            case 'getState':
                sendResponse({ isPlaying: false });
                break;

            case 'offscreenReady':
                isOffscreenReady = true;
                await processMessageQueue();
                break;
        }
    } catch (error) {
        console.error('메시지 처리 중 에러:', error);
    }

    return true;
});

// 초기화
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        noiseSettings: {
            type: 'white',
            volume: 20,
            isPlaying: false
        }
    });
}); 