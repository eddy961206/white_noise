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

    // 커스텀 컨트롤 초기화
    function initCustomControls() {
        const controls = ['frequency', 'resonance', 'modulation', 'filterCutoff'];
        
        controls.forEach(control => {
            $(`#${control}`).on('input', function() {
                const value = $(this).val();
                $(this).next('.value').text(
                    control === 'frequency' || control === 'filterCutoff' 
                        ? `${value} Hz` 
                        : `${value}%`
                );
                
                chrome.runtime.sendMessage({ 
                    action: 'setCustomParameter',
                    param: control,
                    value: parseFloat(value)
                });
            });
        });

        // 프리셋 저장
        $('#savePreset').on('click', () => {
            const name = $('#presetName').val().trim();
            if (name) {
                chrome.runtime.sendMessage({ 
                    action: 'saveCustomPreset',
                    name: name
                });
                loadPresets();
                $('#presetName').val('');
            }
        });

        // 프리셋 로드
        $('#presetList').on('change', function() {
            const presetName = $(this).val();
            if (presetName) {
                chrome.storage.local.get(['noisePresets'], (result) => {
                    const preset = result.noisePresets.find(p => p.name === presetName);
                    if (preset) {
                        chrome.runtime.sendMessage({ 
                            action: 'loadCustomPreset',
                            preset: preset
                        });
                        
                        // UI 업데이트
                        Object.keys(preset).forEach(param => {
                            if (param !== 'name') {
                                $(`#${param}`).val(preset[param]);
                                $(`#${param}`).next('.value').text(
                                    param === 'frequency' || param === 'filterCutoff'
                                        ? `${preset[param]} Hz`
                                        : `${preset[param]}%`
                                );
                            }
                        });
                    }
                });
            }
        });
    }

    // 프리셋 목록 로드
    function loadPresets() {
        chrome.storage.local.get(['noisePresets'], (result) => {
            const presets = result.noisePresets || [];
            const $presetList = $('#presetList');
            
            $presetList.empty();
            $presetList.append('<option value="">Load Preset...</option>');
            
            presets.forEach(preset => {
                $presetList.append(`<option value="${preset.name}">${preset.name}</option>`);
            });
        });
    }

    // 노이즈 타입에 따라 커스텀 컨트롤 표시/숨김
    $('#noiseType').on('change', function() {
        const type = $(this).val();
        $('#customControls').toggle(type === 'custom');
    });

    // 초기화
    $(document).ready(() => {
        initCustomControls();
        loadPresets();
    });
}); 