export function buildControls(container, descriptors, callbacks) {
  container.innerHTML = '';

  descriptors.forEach(desc => {
    if (desc.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'controls-separator';
      container.appendChild(sep);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'control-group';
    if (desc.key) wrapper.dataset.key = desc.key;

    if (desc.type === 'slider') {
      const label = document.createElement('label');
      const nameSpan = document.createElement('span');
      nameSpan.textContent = desc.label;
      const valueSpan = document.createElement('span');
      valueSpan.className = 'value';
      valueSpan.textContent = formatValue(desc.value, desc.step);
      label.appendChild(nameSpan);
      label.appendChild(valueSpan);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = desc.min;
      input.max = desc.max;
      input.step = desc.step;
      input.value = desc.value;
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        valueSpan.textContent = formatValue(v, desc.step);
        callbacks.onChange(desc.key, v);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
    } else if (desc.type === 'select') {
      const label = document.createElement('label');
      label.textContent = desc.label;
      const select = document.createElement('select');
      desc.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (String(opt.value) === String(desc.value)) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        callbacks.onChange(desc.key, isNaN(select.value) ? select.value : Number(select.value));
      });
      wrapper.appendChild(label);
      wrapper.appendChild(select);
    } else if (desc.type === 'button') {
      const btn = document.createElement('button');
      btn.className = 'control-btn' + (desc.style ? ' ' + desc.style : '');
      btn.textContent = desc.label;
      btn.addEventListener('click', () => callbacks.onAction(desc.action || desc.key));
      wrapper.appendChild(btn);
    } else if (desc.type === 'description') {
      wrapper.classList.add('description-text');
      wrapper.textContent = desc.text;
      wrapper.style.minWidth = '200px';
    } else if (desc.type === 'text') {
      const label = document.createElement('label');
      label.textContent = desc.label;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'control-text-input';
      input.value = desc.value || '';
      if (desc.placeholder) input.placeholder = desc.placeholder;
      let timer = null;
      input.addEventListener('input', () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          callbacks.onChange(desc.key, input.value);
        }, 500);
      });
      wrapper.appendChild(label);
      wrapper.appendChild(input);
      wrapper.style.minWidth = (desc.minWidth || 200) + 'px';
    } else if (desc.type === 'textarea') {
      const label = document.createElement('label');
      label.textContent = desc.label;
      const textarea = document.createElement('textarea');
      textarea.className = 'control-textarea';
      textarea.value = desc.value || '';
      if (desc.placeholder) textarea.placeholder = desc.placeholder;
      textarea.rows = desc.rows || 6;
      textarea.spellcheck = false;
      let timer = null;
      textarea.addEventListener('input', () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          callbacks.onChange(desc.key, textarea.value);
        }, 600);
      });
      wrapper.appendChild(label);
      wrapper.appendChild(textarea);
      wrapper.style.minWidth = (desc.minWidth || 250) + 'px';
    } else if (desc.type === 'error') {
      wrapper.className = 'control-error';
      wrapper.textContent = desc.text || '';
      wrapper.dataset.key = desc.key;
    } else if (desc.type === 'readout') {
      wrapper.classList.add('control-readout');
      const label = document.createElement('label');
      const nameSpan = document.createElement('span');
      nameSpan.textContent = desc.label;
      const valueSpan = document.createElement('span');
      valueSpan.className = 'value';
      valueSpan.textContent = typeof desc.get === 'function' ? desc.get() : '';
      label.appendChild(nameSpan);
      label.appendChild(valueSpan);
      wrapper.appendChild(label);
    } else if (desc.type === 'animation') {
      wrapper.className = 'control-group animation-controls';

      // Parameter select
      const paramLabel = document.createElement('label');
      paramLabel.textContent = 'Animate';
      const paramSelect = document.createElement('select');
      paramSelect.className = 'anim-param-select';
      (desc.params || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.key;
        opt.textContent = p.label;
        paramSelect.appendChild(opt);
      });

      // Speed slider
      const speedLabel = document.createElement('label');
      speedLabel.textContent = 'Speed';
      const speedSpan = document.createElement('span');
      speedSpan.className = 'value';
      speedSpan.textContent = '0.50';
      speedLabel.appendChild(speedSpan);
      const speedSlider = document.createElement('input');
      speedSlider.type = 'range';
      speedSlider.min = '0.05';
      speedSlider.max = '3';
      speedSlider.step = '0.05';
      speedSlider.value = '0.5';

      // Mode select
      const modeSelect = document.createElement('select');
      modeSelect.className = 'anim-mode-select';
      ['bounce', 'loop'].forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m.charAt(0).toUpperCase() + m.slice(1);
        modeSelect.appendChild(opt);
      });

      // Buttons
      const btnGroup = document.createElement('div');
      btnGroup.className = 'anim-btn-group';
      const playBtn = document.createElement('button');
      playBtn.className = 'control-btn anim-play';
      playBtn.textContent = 'Play';
      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'control-btn anim-pause';
      pauseBtn.textContent = 'Pause';
      const stopBtn = document.createElement('button');
      stopBtn.className = 'control-btn anim-stop';
      stopBtn.textContent = 'Stop';
      btnGroup.appendChild(playBtn);
      btnGroup.appendChild(pauseBtn);
      btnGroup.appendChild(stopBtn);

      // Events
      playBtn.addEventListener('click', () => {
        if (callbacks.onAnimAction) {
          callbacks.onAnimAction('play', {
            paramKey: paramSelect.value,
            speed: parseFloat(speedSlider.value),
            mode: modeSelect.value
          });
        }
      });
      pauseBtn.addEventListener('click', () => {
        if (callbacks.onAnimAction) callbacks.onAnimAction('pause');
      });
      stopBtn.addEventListener('click', () => {
        if (callbacks.onAnimAction) callbacks.onAnimAction('stop');
      });
      speedSlider.addEventListener('input', () => {
        speedSpan.textContent = parseFloat(speedSlider.value).toFixed(2);
        if (callbacks.onAnimAction) callbacks.onAnimAction('speed', { speed: parseFloat(speedSlider.value) });
      });
      modeSelect.addEventListener('change', () => {
        if (callbacks.onAnimAction) callbacks.onAnimAction('mode', { mode: modeSelect.value });
      });

      wrapper.appendChild(paramLabel);
      wrapper.appendChild(paramSelect);
      wrapper.appendChild(speedLabel);
      wrapper.appendChild(speedSlider);
      wrapper.appendChild(modeSelect);
      wrapper.appendChild(btnGroup);
    }

    container.appendChild(wrapper);
  });
}

export function updateReadouts(container, descriptors) {
  descriptors.forEach(desc => {
    if (desc.type !== 'readout' || typeof desc.get !== 'function') return;
    const group = container.querySelector(`.control-group[data-key="${desc.key}"]`);
    if (!group) return;
    const valueSpan = group.querySelector('.value');
    if (valueSpan) valueSpan.textContent = desc.get();
  });
}

export function updateSliderDisplay(container, key, value) {
  const group = container.querySelector(`.control-group[data-key="${key}"]`);
  if (!group) return;
  const input = group.querySelector('input[type="range"]');
  const valueSpan = group.querySelector('.value');
  if (input) {
    input.value = value;
    if (valueSpan) {
      const step = parseFloat(input.step) || 0.01;
      valueSpan.textContent = formatValue(value, step);
    }
  }
}

function formatValue(v, step) {
  if (step >= 1) return String(Math.round(v));
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return v.toFixed(decimals);
}
