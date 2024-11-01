// 메인 앱 로직
$(() => {
    let settings = {
        type: 'white',
        volume: 20,
        isPlaying: false
    };

    // 저장된 설정 로드
    chrome.storage.local.get(['noiseSettings'], (result) => {
        if (result.noiseSettings) {
            settings = { ...settings, ...result.noiseSettings };
            $('#noiseType').val(settings.type);
            $('#volume').val(settings.volume);
            $('#volumeValue').text(`${settings.volume}%`);
            
            if (settings.isPlaying) {
                chrome.runtime.sendMessage({ action: 'play', noiseType: settings.type });
                $('.play-icon').text('⏸');
            }
        }
    });

    // 설정 저장 함수
    const saveSettings = () => {
        chrome.storage.local.set({
            noiseSettings: settings
        });
    };

    // 이벤트 핸들러
    $('#playPause').on('click', () => {
        console.log('현재 설정:', settings);  // 현재 상태 로깅
        if (settings.isPlaying) {
            chrome.runtime.sendMessage({ action: 'stop' });
            $('.play-icon').text('▶');
            settings.isPlaying = false;
        } else {
            alert('play 신호 popup.js -> background.js 전달');
            // 볼륨을 먼저 설정한 후 재생 요청
            chrome.runtime.sendMessage({ 
                action: 'setVolume',
                volume: settings.volume
            }, () => {
                chrome.runtime.sendMessage({ 
                    action: 'play',
                    noiseType: settings.type
                });
            });
            $('.play-icon').text('⏸');
            settings.isPlaying = true;
        }
        saveSettings();
    });

    $('#noiseType').on('change', function() {
        settings.type = $(this).val();
        if (settings.isPlaying) {
            // 볼륨을 먼저 설정한 후 재생 요청
            chrome.runtime.sendMessage({ 
                action: 'setVolume',
                volume: settings.volume
            }, () => {
                chrome.runtime.sendMessage({ 
                    action: 'play',
                    noiseType: settings.type
                });
            });
        }
        saveSettings();
    });

    $('#volume').on('input', function() {
        const value = parseInt($(this).val());
        settings.volume = value;
        $('#volumeValue').text(`${value}%`);
        chrome.runtime.sendMessage({ 
            action: 'setVolume',
            volume: value
        });
        saveSettings();
    });
}); 