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
        if (opt.value == desc.value) option.selected = true;
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
    } else if (desc.type === 'error') {
      wrapper.className = 'control-error';
      wrapper.textContent = desc.text || '';
      wrapper.dataset.key = desc.key;
    }

    container.appendChild(wrapper);
  });
}

function formatValue(v, step) {
  if (step >= 1) return String(Math.round(v));
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return v.toFixed(decimals);
}
