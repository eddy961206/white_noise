// Offscreen Document 생성 함수
async function ensureOffscreen() {
    try {
        // 이미 존재하는지 확인
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });
        
        if (existingContexts.length > 0) {
            return;
        }

        // 새로 생성
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: '백색 소음 재생을 위해 필요합니다.'
        });

        console.log('Offscreen document 생성 완료!');
    } catch (error) {
        console.error('Offscreen document 생성 중 에러:', error);
    }
}

let messageQueue = [];
let isOffscreenReady = false;

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
    console.log('Background received message:', request);

    try {
        switch (request.action) {
            case 'play':
                console.log('play 신호 background.js 에서 수신');
                await ensureOffscreen();
                // Offscreen 문서에 메시지 전달
                try {
                    await chrome.runtime.sendMessage(request);
                } catch (error) {
                    console.error('Play 메시지 전송 실패:', error);
                    messageQueue.push(request);
                }
                break;

            case 'stop':
                try {
                    await chrome.runtime.sendMessage(request);
                } catch (error) {
                    console.error('Stop 메시지 전송 실패:', error);
                }
                break;

            case 'setVolume':
                try {
                    await chrome.runtime.sendMessage(request);
                } catch (error) {
                    console.error('Volume 메시지 전송 실패:', error);
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