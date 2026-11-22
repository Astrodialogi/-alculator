
const $ = id => document.getElementById(id);

let place = null;
let timer = null;

const zodiac = [
  '♈', '♉', '♊', '♋', '♌', '♍',
  '♎', '♏', '♐', '♑', '♒', '♓'
];

const dateParts = ['day', 'month', 'year'];
const timeParts = ['hour', 'minute'];
const allParts = [...dateParts, ...timeParts];

function pad(n) {
  return String(n).padStart(2, '0');
}

// Автоматический переход между полями
for (const id of allParts) {
  const el = $(id);

  el.addEventListener('input', () => {
    el.value = el.value.replace(/\D/g, '');

    if (el.value.length === el.maxLength) {
      const index = allParts.indexOf(id);
      const next = allParts[index + 1];

      if (next && !$(next).disabled) {
        $(next).focus();
      }
    }
  });
}

// Проверка даты рождения
function getBirthDate() {
  const dayText = $('day').value;
  const monthText = $('month').value;
  const yearText = $('year').value;

  if (!dayText || !monthText || yearText.length !== 4) {
    throw Error('Введи полную дату рождения.');
  }

  const d = Number(dayText);
  const m = Number(monthText);
  const y = Number(yearText);

  if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1) {
    throw Error('Проверь дату рождения.');
  }

  const leap = y % 4 === 0 &&
    (y % 100 !== 0 || y % 400 === 0);

  const days = [
    31, leap ? 29 : 28, 31, 30,
    31, 30, 31, 31, 30, 31, 30, 31
  ];

  if (d > days[m - 1]) {
    throw Error('Такой даты не существует.');
  }

  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

// Время рождения в 24-часовом формате
function getBirthTime() {
  if ($('unknown').checked) return null;

  const hourText = $('hour').value;
  const minuteText = $('minute').value;

  if (!hourText || !minuteText) {
    throw Error('Введи время рождения.');
  }

  const h = Number(hourText);
  const m = Number(minuteText);

  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw Error('Время должно быть от 00:00 до 23:59.');
  }

  return `${pad(h)}:${pad(m)}`;
}

// Неизвестное время рождения
$('unknown').addEventListener('change', () => {
  const yes = $('unknown').checked;

  for (const id of timeParts) {
    $(id).disabled = yes;
    $(id).required = !yes;
  }

  $('timeHelp').hidden = !yes;

  $('submit').textContent = yes
    ? 'Рассчитать планеты'
    : 'Рассчитать Асцендент';
});

// Поиск города через GeoNames
$('city').addEventListener('input', () => {
  place = null;
  $('selected').textContent = '';
  $('error').textContent = '';

  clearTimeout(timer);

  const q = $('city').value.trim();
  $('suggestions').replaceChildren();

  if (q.length < 2) return;

  timer = setTimeout(async () => {
    try {
      const r = await fetch(
        '/api/places?q=' + encodeURIComponent(q)
      );

      const data = await r.json();

      if (!r.ok) {
        throw Error(data.error || 'Поиск города недоступен');
      }

      if ($('city').value.trim() !== q) return;

      for (const p of data.places || []) {
        const b = document.createElement('button');
        b.type = 'button';

        b.textContent = [
          p.name,
          p.admin1,
          p.country
        ].filter(Boolean).join(', ');

        b.addEventListener('click', () => {
          place = p;
          $('city').value = b.textContent;

          $('selected').textContent =
            'Город выбран: ' + b.textContent;

          $('suggestions').replaceChildren();
        });

        $('suggestions').append(b);
      }
    } catch (e) {
      if ($('city').value.trim() === q) {
        $('error').textContent = e.message;
      }
    }
  }, 350);
});

function fmt(p) {
  return `${p.degree}° ${pad(p.minute)}′`;
}

function escapeHTML(s) {
  return String(s).replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );
}

// Расчёт
$('form').addEventListener('submit', async e => {
  e.preventDefault();

  $('error').textContent = '';
  $('result').hidden = true;

  const b = $('submit');

  try {
    const birthDate = getBirthDate();
    const birthTime = getBirthTime();

    if (!place) {
      throw Error('Выбери город из выпадающего списка.');
    }

    b.disabled = true;
    b.textContent = 'Рассчитываем…';

    const r = await fetch('/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: birthDate,
        time: birthTime,
        lat: place.lat,
        lng: place.lng
      })
    });

    const data = await r.json();

    if (!r.ok) {
      throw Error(data.error || 'Ошибка расчёта');
    }

    const root = $('result');
    const asc = data.ascendant;

    let html = asc
      ? `<div class="result-head">
          <div class="symbol">${zodiac[asc.sign_index]}</div>
          <div>
            <small>ТВОЙ АСЦЕНДЕНТ</small>
            <h2>${escapeHTML(asc.sign)}</h2>
            <p>${fmt(asc)} ${escapeHTML(asc.sign)}</p>
          </div>
        </div>
        <p class="note">
          Для ежемесячных прогнозов по Асценденту
          выбирай знак <b>${escapeHTML(asc.sign)}</b>.
        </p>`
      : `<h2>Твои планеты</h2>
        <p class="note">
          Время рождения неизвестно:
          Асцендент и дома не рассчитаны.
          Если планета могла сменить знак за день,
          показаны возможные варианты.
        </p>`;

    html += `<details ${!asc ? 'open' : ''}>
      <summary>Посмотреть положения всех планет</summary>
      <table><tbody>`;

    for (const p of data.planets) {
      const sign = p.sign_uncertain
        ? p.possible_signs.join(' / ')
        : p.sign;

      const degree = data.time_known
        ? ' · ' + fmt(p)
        : '';

      const house = data.time_known
        ? ' · ' + p.whole_sign_house + ' дом (Whole Sign)'
        : '';

      html += `<tr>
        <td>${escapeHTML(p.glyph)} ${escapeHTML(p.name)}</td>
        <td>
          ${escapeHTML(sign)}
          ${degree}
          ${p.retrograde ? ' ℞' : ''}
          ${house}
          ${p.sign_uncertain ? ' ⚠️' : ''}
        </td>
      </tr>`;
    }

    html += '</tbody></table>';

    if (!data.time_known) {
      html += `<p class="hint">
        Без времени рождения градусы не указываются.
        Знаки проверены на протяжении местных суток.
      </p>`;
    }

    html += '</details>';

    if (asc) {
      html += `<details>
        <summary>Технические данные</summary>
        <p>MC: ${escapeHTML(data.mc.sign)}
        ${fmt(data.mc)}</p>
        <p>
          Система домов для таблицы: Whole Sign.
          Расчёт куспидов Плацидуса доступен
          в вычислительном модуле.
        </p>
      </details>`;
    }

    html += `<p>
      <a href="https://taplink.cc/alisa.astrologia">
        Персональные консультации →
      </a>
    </p>`;

    root.innerHTML = html;
    root.hidden = false;

    root.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

  } catch (err) {
    $('error').textContent = err.message;
  } finally {
    b.disabled = false;
    b.textContent = $('unknown').checked
      ? 'Рассчитать планеты'
      : 'Рассчитать Асцендент';
  }
});

