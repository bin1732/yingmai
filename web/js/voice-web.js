// 语音录入（浏览器采集 → 离线转写）· 灵感引擎工坊 · bin1732
(function () {
  'use strict';
  var mediaStream = null, audioCtx = null, processor = null, source = null;
  var chunks = [], recording = false;

  function downsample(buffer, fromRate, toRate) {
    if (fromRate === toRate) return buffer;
    var ratio = fromRate / toRate;
    var newLen = Math.round(buffer.length / ratio);
    var out = new Float32Array(newLen);
    var pos = 0, i = 0;
    while (i < newLen) {
      var src = i * ratio;
      var i0 = Math.floor(src), i1 = Math.min(i0 + 1, buffer.length - 1);
      var frac = src - i0;
      out[i] = buffer[i0] * (1 - frac) + buffer[i1] * frac;
      i += 1;
    }
    return out;
  }

  function start() {
    if (recording) return Promise.resolve();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('当前环境不支持麦克风录音'));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }).then(function (stream) {
      mediaStream = stream; chunks = [];
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      source = audioCtx.createMediaStreamSource(stream);
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = function (e) {
        var d = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(d));
      };
      source.connect(processor); processor.connect(audioCtx.destination);
      recording = true;
    });
  }

  function stop() {
    return new Promise(function (resolve, reject) {
      if (!recording) return resolve(new Float32Array(0));
      recording = false;
      try { processor.disconnect(); source.disconnect(); } catch {}
      if (mediaStream) mediaStream.getTracks().forEach(function (t) { t.stop(); });
      var rate = audioCtx.sampleRate;
      try { audioCtx.close(); } catch {}
      var total = chunks.reduce(function (s, c) { return s + c.length; }, 0);
      var merged = new Float32Array(total);
      var off = 0;
      chunks.forEach(function (c) { merged.set(c, off); off += c.length; });
      var samples = downsample(merged, rate, 16000);
      mediaStream = null; audioCtx = null; processor = null; source = null; chunks = [];
      resolve(samples);
    });
  }

  function toBase64(f32) {
    var bytes = new Uint8Array(f32.length * 4);
    var view = new DataView(bytes.buffer);
    for (var i = 0; i < f32.length; i += 1) view.setFloat32(i * 4, f32[i], true);
    var bin = '', CH = 0x8000;
    for (var j = 0; j < bytes.length; j += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(j, j + CH));
    }
    return btoa(bin);
  }

  function transcribe(samples) {
    return fetch('/api/voice/transcribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples: toBase64(samples) }),
    }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.detail || '语音识别失败'); return j.text; });
    });
  }

  function isRecording() { return recording; }

  var PHRASES = {
    zh: {
      dlTitle: '正在准备语音功能',
      confirmTitle: '启用语音输入',
      confirmMsg: '语音输入需要一次性下载离线识别组件（约 230MB），下载完成后可离线使用。是否现在下载？',
      btn: '立即下载', cancel: '暂不',
    },
    en: {
      dlTitle: 'Preparing voice input',
      confirmTitle: 'Enable voice input',
      confirmMsg: 'Voice input needs a one-time download of the offline recognition component (about 230MB). It works offline afterwards. Download now?',
      btn: 'Download', cancel: 'Not now',
    },
  };
  function L() {
    var en = document.documentElement.lang === 'en';
    return PHRASES[en ? 'en' : 'zh'];
  }


  function getStatus() {
    return fetch('/api/voice/status').then(function (r) { return r.json(); })
      .catch(function () { return { available: false }; });
  }

  function progressModal() {
    var mask = document.createElement('div');
    mask.className = 'voice-dl-mask';
    mask.innerHTML = '<div class="voice-dl-dialog">' +
      '<div class="voice-dl-title"></div>' +
      '<div class="voice-dl-bar"><div class="voice-dl-fill"></div></div>' +
      '<div class="voice-dl-pct"></div>' +
      '<button class="btn btn-ghost voice-dl-cancel" type="button"></button></div>';
    document.body.appendChild(mask);
    var title = mask.querySelector('.voice-dl-title');
    var fill = mask.querySelector('.voice-dl-fill');
    var pct = mask.querySelector('.voice-dl-pct');
    var cancelBtn = mask.querySelector('.voice-dl-cancel');
    return {
      setTitle: function (s) { title.textContent = s; },
      setProgress: function (p) {
        var pctv = p.total ? Math.round((p.received / p.total) * 100) : 0;
        fill.style.width = pctv + '%';
        pct.textContent = pctv + '%';
      },
      setIndeterminate: function (s) {
        fill.style.width = '100%'; fill.classList.add('indeterminate'); pct.textContent = s;
      },
      onCancel: function (fn) { cancelBtn.addEventListener('click', fn); },
      close: function () { if (mask.parentNode) mask.parentNode.removeChild(mask); },
    };
  }

  function downloadComponent() {
    return new Promise(function (resolve, reject) {
      var modal = progressModal();
      modal.setTitle(L().dlTitle);
      modal.setIndeterminate('');
      var es = new EventSource('/api/voice/download');
      var failed = false;
      es.addEventListener('message', function (ev) {
        var d;
        try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (d.progress) { modal.setProgress(d.progress); }
        if (d.done) { es.close(); modal.close(); resolve(true); }
        if (d.error) { failed = true; es.close(); modal.close(); reject(new Error(d.error)); }
      });
      es.onerror = function () {
        if (!failed) { es.close(); modal.close(); reject(new Error('下载中断，请检查网络后重试')); }
      };
      modal.onCancel(function () {
        failed = true; es.close(); modal.close(); reject(new Error('已取消下载'));
      });
    });
  }

  // 录音前确保识别组件就绪；缺失则引导一次性下载
  function ensureReady() {
    return getStatus().then(function (st) {
      if (st.available) return true;
      return new Promise(function (resolve, reject) {
        if (window.openConfirmModal) {
          window.openConfirmModal({
            title: L().confirmTitle,
            message: L().confirmMsg,
            confirmText: L().btn,
            cancelText: L().cancel,
            onConfirm: function () { downloadComponent().then(function () { resolve(true); }).catch(reject); },
            onCancel: function () { reject(new Error('cancelled')); },
          });
        } else {
          downloadComponent().then(function () { resolve(true); }).catch(reject);
        }
      });
    });
  }


  function insertAtCursor(el, text) {
    var start = el.selectionStart != null ? el.selectionStart : el.value.length;
    var end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
    var before = el.value.slice(0, start), after = el.value.slice(end);
    var gap = before && !/\s$/.test(before) ? ' ' : '';
    el.value = before + gap + text + after;
    try { el.selectionStart = el.selectionEnd = (before + gap + text).length; } catch {}
    el.focus();
  }

  function bindMic(btnId, inputId) {
    var btn = document.getElementById(btnId);
    var input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      if (!window.Voice) return;
      if (window.Voice.isRecording()) {
        btn.classList.remove('recording');
        window.Voice.stop().then(function (samples) {
          if (!samples.length) return;
          btn.classList.add('transcribing');
          return window.Voice.transcribe(samples).then(function (text) {
            if (text) insertAtCursor(input, text);
          }).catch(function (e) {
            if (window.toast) toast(e.message || '语音识别失败');
          }).then(function () { btn.classList.remove('transcribing'); });
        });
      } else {
        window.Voice.ensureReady().then(function () {
          return window.Voice.start().then(function () { btn.classList.add('recording'); });
        }).catch(function (e) {
          if (e && e.message === 'cancelled') return;
          if (window.toast) toast(e.message || '无法使用麦克风');
        });
      }
    });
  }

  function initButtons() {
    // 悬浮球使用离线识别；#voiceBtn 由 app.js initVoice 统一决定识别方式，避免重复绑定
    bindMic('floatVoiceBtn', 'floatChatInput');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initButtons);
  else initButtons();

  window.Voice = {
    start: start, stop: stop, transcribe: transcribe, isRecording: isRecording,
    ensureReady: ensureReady, getStatus: getStatus, downloadComponent: downloadComponent,
    bindOfflineMic: bindMic,
  };
})();
