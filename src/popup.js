// 메인 앱 로직
$(() => {
    let settings = {
        type: 'white',
        volume: 50,
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
        if (settings.isPlaying) {
            chrome.runtime.sendMessage({ action: 'stop' });
            $('.play-icon').text('▶');
            settings.isPlaying = false;
        } else {
            chrome.runtime.sendMessage({ 
                action: 'play',
                noiseType: settings.type
            });
            chrome.runtime.sendMessage({ 
                action: 'setVolume',
                volume: settings.volume
            });
            $('.play-icon').text('⏸');
            settings.isPlaying = true;
        }
        saveSettings();
    });

    $('#noiseType').on('change', function() {
        settings.type = $(this).val();
        if (settings.isPlaying) {
            chrome.runtime.sendMessage({ 
                action: 'play',
                noiseType: settings.type
            });
            chrome.runtime.sendMessage({ 
                action: 'setVolume',
                volume: settings.volume
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