





const $ = id => document.getElementById(id);

let place = null;
let timer = null;
let calculating = false;
let searchVersion = 0;

const zodiac = [
  '♈', '♉', '♊', '♋', '♌', '♍',
  '♎', '♏', '♐', '♑', '♒', '♓'
];

const signNames = [
  'Овне',
  'Тельце',
  'Близнецах',
  'Раке',
  'Льве',
  'Деве',
  'Весах',
  'Скорпионе',
  'Стрельце',
  'Козероге',
  'Водолее',
  'Рыбах'
];

const descriptions = [

  // ОВЕН
  {
    ruler: 'Марс',
    text: 'Асцендент в Овне связан с инициативностью, самостоятельностью и стремлением действовать. В новых обстоятельствах такой человек склонен проявлять активность и самостоятельно определять направление движения.'
  },

  // ТЕЛЕЦ
  {
    ruler: 'Венера',
    text: 'Асцендент в Тельце связан со стремлением к устойчивости, определённости и комфорту. Такой человек предпочитает осваивать окружающий мир в собственном темпе, опираясь на практический опыт.'
  },

  // БЛИЗНЕЦЫ
  {
    ruler: 'Меркурий',
    text: 'Асцендент в Близнецах связан с любознательностью, общением и поиском информации. Взаимодействие с окружающим миром происходит через наблюдение, обучение, обмен идеями и установление новых связей.'
  },

  // РАК
  {
    ruler: 'Луна',
    text: 'Асцендент в Раке связан с восприимчивостью к окружающей атмосфере и потребностью в эмоциональной безопасности. В новых обстоятельствах человек может сначала присматриваться к происходящему и только потом включаться в ситуацию.'
  },

  // ЛЕВ
  {
    ruler: 'Солнце',
    text: 'Асцендент во Льве связан со стремлением проявлять индивидуальность, творчески выражать себя и занимать собственное место в окружающем мире.'
  },

  // ДЕВА
  {
    ruler: 'Меркурий',
    text: 'Асцендент в Деве связан с наблюдательностью, вниманием к деталям и стремлением разобраться в устройстве окружающего мира. Такой человек склонен анализировать происходящее и искать практические решения.'
  },

  // ВЕСЫ
  {
    ruler: 'Венера',
    text: 'Асцендент в Весах связан с ориентацией на взаимодействие, сотрудничество и поиск равновесия. Важную роль в восприятии мира могут играть отношения, эстетика и способность учитывать разные точки зрения.'
  },

  // СКОРПИОН
  {
    ruler: 'Марс',
    text: 'Асцендент в Скорпионе связан со стремлением проникать в суть происходящего, исследовать скрытые процессы и проверять границы возможного. Такой человек может внимательно относиться к вопросам доверия и контроля.'
  },

  // СТРЕЛЕЦ
  {
    ruler: 'Юпитер',
    text: 'Асцендент в Стрельце связан со стремлением расширять горизонты, приобретать новый опыт и искать смысл происходящего. Важную роль могут играть путешествия, образование и знакомство с другими культурами.'
  },

  // КОЗЕРОГ
  {
    ruler: 'Сатурн',
    text: 'Асцендент в Козероге связан со стремлением выстраивать собственную жизнь, опираясь на последовательность, ответственность и понимание реальных возможностей. Такой человек может воспринимать окружающий мир через задачи, цели и необходимость постепенно осваивать новые уровни самостоятельности.'
  },

  // ВОДОЛЕЙ
  {
    ruler: 'Сатурн',
    text: 'Асцендент в Водолее связан с самостоятельностью мышления, интересом к устройству общества и стремлением сохранять собственную позицию. Такой человек может искать нестандартные способы взаимодействия с окружающим миром.'
  },

  // РЫБЫ
  {
    ruler: 'Юпитер',
    text: 'Асцендент в Рыбах связан с восприимчивостью, воображением и способностью замечать тонкие особенности окружающей среды. Восприятие происходящего может опираться на образы, ассоциации и эмоциональные впечатления.'
  }

];

const dateParts = ['day', 'month', 'year'];
const timeParts = ['hour', 'minute'];
const allParts = [...dateParts, ...timeParts];

function pad(n) {
  return String(n).padStart(2, '0');
}

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


// =========================================
// АВТОМАТИЧЕСКИЙ ПЕРЕХОД МЕЖДУ ПОЛЯМИ
// =========================================

for (const id of allParts) {

  const el = $(id);

  el.addEventListener('input', () => {

    el.value = el.value
      .replace(/\D/g, '')
      .slice(0, el.maxLength);

    if (el.value.length === el.maxLength) {

      const index = allParts.indexOf(id);
      const next = allParts[index + 1];

      if (next && !$(next).disabled) {
        $(next).focus();
      } else if (id === 'minute') {
        $('city').focus();
      }

    }

  });

}


// =========================================
// ПРОВЕРКА ДАТЫ РОЖДЕНИЯ
// =========================================

function getBirthDate() {

  const dayText = $('day').value;
  const monthText = $('month').value;
  const yearText = $('year').value;

  if (
    !dayText ||
    !monthText ||
    yearText.length !== 4
  ) {
    throw Error('Введи полную дату рождения.');
  }

  const d = Number(dayText);
  const m = Number(monthText);
  const y = Number(yearText);

  if (
    y < 1 ||
    y > 9999 ||
    m < 1 ||
    m > 12 ||
    d < 1
  ) {
    throw Error('Проверь дату рождения.');
  }

  const leap =
    y % 4 === 0 &&
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


// =========================================
// ПРОВЕРКА ВРЕМЕНИ РОЖДЕНИЯ
// =========================================

function getBirthTime() {

  if ($('unknown').checked) {
    throw Error(
      'Для расчёта Асцендента необходимо точное время рождения.'
    );
  }

  const hourText = $('hour').value;
  const minuteText = $('minute').value;

  if (!hourText || !minuteText) {
    throw Error('Введи время рождения.');
  }

  const h = Number(hourText);
  const m = Number(minuteText);

  if (
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    throw Error(
      'Время должно быть от 00:00 до 23:59.'
    );
  }

  return `${pad(h)}:${pad(m)}`;

}


// =========================================
// НЕИЗВЕСТНОЕ ВРЕМЯ РОЖДЕНИЯ
// =========================================

function updateUnknownTime() {

  const yes = $('unknown').checked;

  for (const id of timeParts) {

    $(id).disabled = yes;
    $(id).required = !yes;

  }

  $('timeHelp').hidden = !yes;

  $('submit').hidden = yes;
  $('submit').disabled = yes || calculating;

  $('error').textContent = '';

}

$('unknown').addEventListener(
  'change',
  updateUnknownTime
);

updateUnknownTime();


// =========================================
// ПОИСК ГОРОДА ЧЕРЕЗ GEONAMES
// =========================================

$('city').addEventListener('input', () => {

  place = null;

  $('selected').textContent = '';
  $('error').textContent = '';

  clearTimeout(timer);

  const version = ++searchVersion;
  const q = $('city').value.trim();

  $('suggestions').replaceChildren();

  if (q.length < 2) return;

  timer = setTimeout(async () => {

    try {

      const r = await fetch(
        '/api/places?q=' + encodeURIComponent(q)
      );

      const data = await r.json();

      if (
        version !== searchVersion ||
        $('city').value.trim() !== q
      ) return;

      if (!r.ok) {

        throw Error(
          data.error || 'Поиск города недоступен'
        );

      }

      const places = data.places || [];

      if (!places.length) {

        const message = document.createElement('p');

        message.className = 'hint';

        message.textContent =
          'Город не найден. Попробуй другое написание.';

        $('suggestions').append(message);

        return;

      }

      for (const p of places) {

        const b = document.createElement('button');

        b.type = 'button';

        b.textContent = [
          p.name,
          p.admin1,
          p.country
        ].filter(Boolean).join(', ');

        b.addEventListener('click', () => {

          place = p;

          searchVersion++;

          $('city').value = [p.name, p.country].filter(Boolean).join(', ');

          $('selected').textContent =
            '';

          $('suggestions').replaceChildren();

          $('error').textContent = '';

        });

        $('suggestions').append(b);

      }

    } catch (e) {

      if (version === searchVersion) {

        $('error').textContent = e.message;

      }

    }

  }, 350);

});


// =========================================
// ТАБЛИЦА ПЛАНЕТ И ТОЧЕК
// =========================================

function buildPlanetsTable(data, system) {
  const systems = data.house_systems || {};
  const selected = systems[system];
  let html = '<table><thead><tr><th>Планета</th><th>Положение</th><th>Дом</th></tr></thead><tbody>';
  for (const p of data.planets || []) {
    const house = p.houses?.[system] ?? p[system + '_house'];
    html += `<tr><td>${escapeHTML(p.glyph)} ${escapeHTML(p.name)}</td><td>${escapeHTML(p.sign)} · ${fmt(p)}${p.retrograde ? ' ℞' : ''}</td><td>${house ?? '—'}</td></tr>`;
  }
  for (const [name, point] of [['ASC', data.ascendant], ['MC', data.mc]]) {
    if (point) html += `<tr><td>${name}</td><td>${escapeHTML(point.sign)} · ${fmt(point)}</td><td>—</td></tr>`;
  }
  html += '</tbody></table>';
  if (selected?.available && selected.cusps?.length === 12) {
    html += '<h2>Куспиды домов</h2><table><tbody>';
    selected.cusps.forEach((c, i) => {
      html += `<tr><td>${i + 1} дом</td><td>${escapeHTML(c.sign)} · ${fmt(c)}</td></tr>`;
    });
    html += '</tbody></table>';
  }
  html += '<p class="hint">Тропический зодиак. ASC и MC не зависят от выбранной системы домов.</p>';
  return html;
}

function buildHouseSelector(data) {
  const systems = data.house_systems;
  if (!systems) return '<p class="hint">Обновление расчётного модуля ещё не доступно. Попробуй позже.</p>';
  const labels = {placidus: 'Плацидус (Placidus)', whole_sign: 'Целознаковая (Whole Sign)', equal: 'Равнодомная (Equal House)'};
  const initial = systems.placidus?.available ? 'placidus' : data.default_house_system;
  return `<label for="houseSystem">Система домов</label>
    <select id="houseSystem" style="width:100%;padding:12px;border:1px solid #ded3cb;border-radius:10px;background:#fff;color:#222;font:inherit;margin:8px 0 16px">
      ${Object.entries(labels).map(([key,label]) => `<option value="${key}" ${key === initial ? 'selected' : ''} ${systems[key]?.available ? '' : 'disabled'}>${label}${systems[key]?.available ? '' : ' — недоступна'}</option>`).join('')}
    </select>
    ${systems.placidus?.available ? '' : '<p class="hint">Плацидус недоступен для этих координат. Выбери другую систему.</p>'}
    <div id="houseTables">${buildPlanetsTable(data, initial)}</div>`;
}

// =========================================
// ЭКРАН РЕЗУЛЬТАТА
// =========================================

function showResult(data) {

  const root = $('result');
  const asc = data.ascendant;

  if (!asc) {

    throw Error(
      'Не удалось определить Асцендент. Проверь данные рождения.'
    );

  }

  const index = Number(asc.sign_index);
  const description = descriptions[index];

  if (!description) {
    throw Error('Не удалось определить знак Асцендента.');
  }

  const sign = escapeHTML(asc.sign);
  const signName = signNames[index];

  root.innerHTML = `

    <button
      type="button"
      id="backToCalculator"
      class="back-button">

      ← Изменить данные

    </button>


    <!-- КАРТОЧКА АСЦЕНДЕНТА -->

    <section class="result-card">

      <div class="result-head">

        <div class="symbol">
          ${zodiac[index]}&#xFE0E;
        </div>

        <div>

          <small>ТВОЙ АСЦЕНДЕНТ</small>

          <h2>${sign}</h2>

          <p>${fmt(asc)}</p>

        </div>

      </div>

      <p class="note">

        Для ежемесячных прогнозов
        по Асценденту выбирай знак
        <strong>${sign}</strong>.

      </p>

    </section>


    <!-- ОПИСАНИЕ АСЦЕНДЕНТА -->

    <section class="description-card">

      <h2>
        Асцендент в ${signName}
      </h2>

      <p>
        ${escapeHTML(description.text)}
      </p>

      <p>

        <strong>Управитель Асцендента:</strong>
        ${escapeHTML(description.ruler)}.

      </p>

      <p class="hint">

        Это общая астрологическая характеристика.
        Для индивидуальной интерпретации важно
        учитывать положение управителя Асцендента,
        планеты в первом доме и аспекты.

      </p>

    </section>


    <!-- ПРЕДЛОЖЕНИЕ ПОСМОТРЕТЬ ПЛАНЕТЫ -->

    <section class="chart-card">

      <div class="chart-preview">

        <svg
          class="chart-icon"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true">

          <circle cx="50" cy="50" r="46"/>
          <circle cx="50" cy="50" r="32"/>
          <circle cx="50" cy="50" r="15"/>

          <path d="
            M50 4V35
            M50 65V96
            M4 50H35
            M65 50H96
            M27 10L42 37
            M58 63L73 90
            M10 27L37 42
            M63 58L90 73
            M73 10L58 37
            M42 63L27 90
            M90 27L63 42
            M37 58L10 73
          "/>

        </svg>

        <div>

          <h2>
            Узнай больше о своей натальной карте
          </h2>

          <p>

            Посмотри, в каких знаках и домах
            находятся твои планеты и основные
            астрологические точки.

          </p>

        </div>

      </div>

      <button
        type="button"
        id="showPlanets"
        class="primary-button"
        aria-expanded="false"
        aria-controls="planetsPanel">

        Посмотреть планеты и точки →

      </button>

    </section>


    <!-- ПОЛОЖЕНИЯ ПЛАНЕТ -->

    <section
      id="planetsPanel"
      class="planets-card"
      hidden>

      <h2>Твои планеты и точки</h2>

      ${buildHouseSelector(data)}

    </section>


    <!-- КОНСУЛЬТАЦИЯ -->

    <section class="description-card">

      <h2>
        Хочешь разобраться в своей карте глубже?
      </h2>

      <p>

        На индивидуальной консультации
        мы можем разобрать твою натальную карту,
        особенности характера, отношения,
        профессиональную реализацию
        или прогноз на ближайший год.

      </p>

      <a
        class="secondary-button"
        href="https://taplink.cc/alisa.astrologia">

        Персональные консультации →

      </a>

    </section>

  `;

  $('houseSystem')?.addEventListener('change', e => {
    $('houseTables').innerHTML = buildPlanetsTable(data, e.target.value);
  });

  $('calculatorScreen').hidden = true;

  root.hidden = false;


  // Возвращение к форме

  $('backToCalculator').addEventListener(
    'click',
    () => {

      root.hidden = true;

      $('calculatorScreen').hidden = false;

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

    }
  );


  // Открытие таблицы планет

  $('showPlanets').addEventListener(
    'click',
    () => {

      const panel = $('planetsPanel');
      const button = $('showPlanets');

      const opening = panel.hidden;

      panel.hidden = !opening;

      button.setAttribute(
        'aria-expanded',
        String(opening)
      );

      button.textContent = opening
        ? 'Скрыть положения планет'
        : 'Посмотреть планеты и точки →';

      if (opening) {

        panel.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

      }

    }
  );

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


// =========================================
// РАСЧЁТ АСЦЕНДЕНТА
// =========================================

$('form').addEventListener('submit', async e => {

  e.preventDefault();

  if (calculating || $('unknown').checked) {
    return;
  }

  $('error').textContent = '';

  const b = $('submit');

  try {

    const birthDate = getBirthDate();
    const birthTime = getBirthTime();

    if (!place) {

      throw Error(
        'Выбери город из выпадающего списка.'
      );

    }

    calculating = true;

    b.disabled = true;

    $('unknown').disabled = true;

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

      throw Error(
        data.error || 'Ошибка расчёта'
      );

    }

    showResult(data);

  } catch (err) {

    $('error').textContent = err.message;

  } finally {

    calculating = false;

    $('unknown').disabled = false;

    b.disabled = $('unknown').checked;

    b.textContent = 'Рассчитать Асцендент';

  }

});




