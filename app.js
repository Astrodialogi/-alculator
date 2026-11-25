
// ASTRODIALOGI — UNIVERSAL CALCULATORS V2

const $ = id => document.getElementById(id);

let place = null;
let timer = null;
let calculating = false;
let searchVersion = 0;

// =========================================
// КАЛЬКУЛЯТОРЫ И НАВИГАЦИЯ
// =========================================

const pages = {
  ascendant: 'Асцендент',
  sun: 'Солнце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
  mc: 'MC',
  natal: 'Натальная карта'
};

const planetKeys = [
  'sun', 'moon', 'mercury', 'venus',
  'mars', 'jupiter', 'saturn', 'uranus',
  'neptune', 'pluto'
];

const glyphs = {
  ascendant: 'ASC',
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  mc: 'MC'
};

const route = location.pathname
  .replace(/^\/+|\/+$/g, '');

const home = !route || route === 'index.html';

const page = Object.prototype.hasOwnProperty.call(
  pages, route
) ? route : 'ascendant';

const needsTime = [
  'ascendant', 'mc'
].includes(page);

const buttonText =
  page === 'natal'
    ? 'Построить карту'
    : 'Рассчитать ' + (
        page === 'moon' ? 'Луну' :
        page === 'venus' ? 'Венеру' :
        pages[page]
      );

// =========================================
// СОХРАНЕНИЕ РЕЗУЛЬТАТОВ В БРАУЗЕРЕ
// =========================================

const storageKey = 'astrodialogi.chart.v2';

let saved = null;

try {
  saved = JSON.parse(
    sessionStorage.getItem(storageKey)
  );
} catch (_) {}

function persist() {
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(saved)
    );
  } catch (_) {}
}

function clearSaved() {
  saved = null;

  try {
    sessionStorage.removeItem(storageKey);
  } catch (_) {}
}

// =========================================
// ЗНАКИ ЗОДИАКА
// =========================================

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

// =========================================
// ОПИСАНИЯ АСЦЕНДЕНТОВ
// =========================================

const descriptions = [

  {
    ruler: 'Марс',
    text: 'Асцендент в Овне связан с инициативностью, самостоятельностью и стремлением действовать. В новых обстоятельствах такой человек склонен проявлять активность и самостоятельно определять направление движения.'
  },

  {
    ruler: 'Венера',
    text: 'Асцендент в Тельце связан со стремлением к устойчивости, определённости и комфорту. Такой человек предпочитает осваивать окружающий мир в собственном темпе, опираясь на практический опыт.'
  },

  {
    ruler: 'Меркурий',
    text: 'Асцендент в Близнецах связан с любознательностью, общением и поиском информации. Взаимодействие с окружающим миром происходит через наблюдение, обучение, обмен идеями и установление новых связей.'
  },

  {
    ruler: 'Луна',
    text: 'Асцендент в Раке связан с восприимчивостью к окружающей атмосфере и потребностью в эмоциональной безопасности. В новых обстоятельствах человек может сначала присматриваться к происходящему и только потом включаться в ситуацию.'
  },

  {
    ruler: 'Солнце',
    text: 'Асцендент во Льве связан со стремлением проявлять индивидуальность, творчески выражать себя и занимать собственное место в окружающем мире.'
  },

  {
    ruler: 'Меркурий',
    text: 'Асцендент в Деве связан с наблюдательностью, вниманием к деталям и стремлением разобраться в устройстве окружающего мира. Такой человек склонен анализировать происходящее и искать практические решения.'
  },

  {
    ruler: 'Венера',
    text: 'Асцендент в Весах связан с ориентацией на взаимодействие, сотрудничество и поиск равновесия. Важную роль в восприятии мира могут играть отношения, эстетика и способность учитывать разные точки зрения.'
  },

  {
    ruler: 'Марс',
    text: 'Асцендент в Скорпионе связан со стремлением проникать в суть происходящего, исследовать скрытые процессы и проверять границы возможного. Такой человек может внимательно относиться к вопросам доверия и контроля.'
  },

  {
    ruler: 'Юпитер',
    text: 'Асцендент в Стрельце связан со стремлением расширять горизонты, приобретать новый опыт и искать смысл происходящего. Важную роль могут играть путешествия, образование и знакомство с другими культурами.'
  },

  {
    ruler: 'Сатурн',
    text: 'Асцендент в Козероге связан со стремлением выстраивать собственную жизнь, опираясь на последовательность, ответственность и понимание реальных возможностей. Такой человек может воспринимать окружающий мир через задачи, цели и необходимость постепенно осваивать новые уровни самостоятельности.'
  },

  {
    ruler: 'Сатурн',
    text: 'Асцендент в Водолее связан с самостоятельностью мышления, интересом к устройству общества и стремлением сохранять собственную позицию. Такой человек может искать нестандартные способы взаимодействия с окружающим миром.'
  },

  {
    ruler: 'Юпитер',
    text: 'Асцендент в Рыбах связан с восприимчивостью, воображением и способностью замечать тонкие особенности окружающей среды. Восприятие происходящего может опираться на образы, ассоциации и эмоциональные впечатления.'
  }

];

// =========================================
// ОБЩИЕ ОПИСАНИЯ ПЛАНЕТ
// =========================================

const planetAbout = {

  sun: 'В астрологии Солнце связано с индивидуальностью, самовыражением и жизненными целями.',

  moon: 'Луна связана с эмоциональными реакциями, привычками, потребностями и ощущением безопасности.',

  mercury: 'Меркурий связан с мышлением, обучением, восприятием информации и общением.',

  venus: 'Венера связана с ценностями, симпатиями, отношениями и эстетическими предпочтениями.',

  mars: 'Марс связан с активностью, инициативой, мотивацией и способом достижения целей.',

  jupiter: 'Юпитер связан с развитием, расширением возможностей, знаниями и мировоззрением.',

  saturn: 'Сатурн связан с ответственностью, ограничениями, дисциплиной и приобретением опыта.',

  uranus: 'Уран связан с независимостью, обновлением и нестандартными решениями.',

  neptune: 'Нептун связан с воображением, идеалами и восприимчивостью.',

  pluto: 'Плутон связан с глубокими изменениями, властью и вопросами контроля.',

  mc: 'Середина неба, или MC, связана с профессиональной реализацией, общественной ролью и направлением развития.'

};

// Место для будущих авторских интерпретаций.

const interpretations = window.ASTRO_INTERPRETATIONS || {
  signs: {},
  houses: {},
  retrograde: {}
};

// =========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================================

function pad(n) {
  return String(n).padStart(2, '0');
}

function fmt(p) {
  return `${p.degree}° ${pad(p.minute)}′`;
}

function escapeHTML(s) {
  return String(s ?? '').replace(
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

function keyFor(name) {
  return planetKeys.find(
    key => pages[key] === name
  );
}

function link(key, text) {

  if (!key) return escapeHTML(text);

  return `
    <a href="/${key}"
       class="planet-link"
       style="color:#881C2C;text-decoration:underline;text-underline-offset:3px">
      ${escapeHTML(text)}
    </a>
  `;
}

function known(data) {
  return data.time_known !== false &&
    !!data.ascendant;
}

function getPoint(data) {

  if (page === 'ascendant') {
    return data.ascendant;
  }

  if (page === 'mc') {
    return data.mc;
  }

  return (data.planets || []).find(
    p => p.name === pages[page]
  );
}

// =========================================
// ПОЛЯ ДАТЫ И ВРЕМЕНИ
// =========================================

const dateParts = ['day', 'month', 'year'];

const timeParts = ['hour', 'minute'];

const allParts = [...dateParts, ...timeParts];

for (const id of allParts) {

  const el = $(id);

  el.addEventListener('input', () => {

    el.value = el.value
      .replace(/\D/g, '')
      .slice(0, el.maxLength);

    if (el.value.length === el.maxLength) {

      const next =
        allParts[allParts.indexOf(id) + 1];

      if (next && !$(next).disabled) {

        $(next).focus();

      } else if (
        id === 'minute' ||
        id === 'year'
      ) {

        $('city').focus();

      }

    }

  });

}

// =========================================
// ПРОВЕРКА ДАТЫ
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
// ПРОВЕРКА ВРЕМЕНИ
// =========================================

function getBirthTime() {

  if ($('unknown').checked) {
    return null;
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
// НЕИЗВЕСТНОЕ ВРЕМЯ
// =========================================

function updateUnknownTime() {

  const yes = $('unknown').checked;

  for (const id of timeParts) {

    $(id).disabled = yes;
    $(id).required = !yes;

  }

  $('timeHelp').hidden =
    !(yes && needsTime);

  $('unknownTimeNote').hidden =
    !(yes && !needsTime);

  $('unknownTimeNote').textContent =
    'Без времени рождения можно определить знак планеты, но не её дом. Если планета меняла знак в течение суток, покажем возможные варианты.';

  $('submit').hidden =
    yes && needsTime;

  $('submit').disabled =
    (yes && needsTime) || calculating;

  $('error').textContent = '';

}

$('unknown').addEventListener(
  'change',
  updateUnknownTime
);

updateUnknownTime();

// =========================================
// ПОИСК ГОРОДА
// =========================================

$('city').addEventListener('input', () => {

  place = null;

  $('selected').textContent = '';
  $('cityHint').hidden = false;
  $('error').textContent = '';

  clearTimeout(timer);

  const version = ++searchVersion;

  const q = $('city').value.trim();

  $('suggestions').replaceChildren();

  if (q.length < 2) return;

  timer = setTimeout(async () => {

    try {

      const r = await fetch(
        '/api/places?q=' +
        encodeURIComponent(q)
      );

      const data = await r.json();

      if (
        version !== searchVersion ||
        $('city').value.trim() !== q
      ) return;

      if (!r.ok) {

        throw Error(
          data.error ||
          'Поиск города недоступен'
        );

      }

      const places = data.places || [];

      if (!places.length) {

        const message =
          document.createElement('p');

        message.className = 'hint';

        message.textContent =
          'Город не найден. Попробуй другое написание.';

        $('suggestions').append(message);

        return;

      }

      for (const p of places) {

        const b =
          document.createElement('button');

        b.type = 'button';

        b.textContent = [
          p.name,
          p.admin1,
          p.country
        ].filter(Boolean).join(', ');

        b.addEventListener('click', () => {

          place = p;

          searchVersion++;

          $('city').value = [
            p.name,
            p.country
          ].filter(Boolean).join(', ');

          $('selected').textContent = '';

          $('suggestions').replaceChildren();

          $('cityHint').hidden = true;

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
// СИСТЕМЫ ДОМОВ
// =========================================

const labels = {

  placidus: 'Плацидус (Placidus)',

  whole_sign: 'Целознаковая (Whole Sign)',

  equal: 'Равнодомная (Equal House)'

};

function systemFor(data) {

  if (!known(data)) return null;

  const systems = data.house_systems || {};

  return [
    saved?.system,
    'placidus',
    data.default_house_system,
    ...Object.keys(labels)
  ].find(
    key => systems[key]?.available
  ) || null;

}

function houseFor(p, system) {

  if (!system) return null;

  return p.houses?.[system] ??
    p[system + '_house'] ??
    null;

}

function buildHouseSelector(data, system) {

  if (!system || !known(data)) {
    return '';
  }

  return `

    <label for="houseSystem">
      Система домов
    </label>

    <select id="houseSystem">

      ${Object.entries(labels).map(
        ([key, label]) => `

          <option
            value="${key}"
            ${key === system ? 'selected' : ''}
            ${data.house_systems[key]?.available
              ? ''
              : 'disabled'}>

            ${label}

            ${data.house_systems[key]?.available
              ? ''
              : ' — недоступна'}

          </option>

        `
      ).join('')}

    </select>

    ${data.house_systems.placidus?.available
      ? ''
      : '<p class="hint">Плацидус недоступен для этих координат. Выбери другую систему домов.</p>'}

  `;

}

// =========================================
// ФОРМАТ ПОЛОЖЕНИЯ ПЛАНЕТЫ
// =========================================

function position(p, data) {

  if (p.sign_uncertain) {

    return escapeHTML(
      (p.possible_signs || []).join(' / ') ||
      'Знак требует уточнения'
    );

  }

  return escapeHTML(p.sign) +

    (known(data)
      ? ' · ' + fmt(p)
      : '') +

    (known(data) && p.retrograde
      ? ' ℞'
      : '');

}

// =========================================
// КЛИКАБЕЛЬНАЯ ТАБЛИЦА ПЛАНЕТ
// =========================================

function buildPlanetsTable(data, system) {

  let html = `

    <table>

      <thead>

        <tr>
          <th>Планета</th>
          <th>Положение</th>
          <th>Дом</th>
        </tr>

      </thead>

      <tbody>

  `;

  for (const p of data.planets || []) {

    const key = keyFor(p.name);

    const house = houseFor(p, system);

    html += `

      <tr>

        <td>

          <span class="planet-glyph">
            ${escapeHTML(glyphs[key] || p.glyph)}&#xFE0E;
          </span>

          ${link(key, p.name)}

        </td>

        <td>
          ${position(p, data)}
        </td>

        <td>
          ${house ?? '—'}
        </td>

      </tr>

    `;

  }

  if (known(data)) {

    for (const [key, name, p] of [

      ['ascendant', 'ASC', data.ascendant],

      ['mc', 'MC', data.mc]

    ]) {

      if (!p) continue;

      html += `

        <tr>

          <td>
            ${link(key, name)}
          </td>

          <td>
            ${position(p, data)}
          </td>

          <td>—</td>

        </tr>

      `;

    }

  }

  html += `

      </tbody>

    </table>

    <p class="hint">
      Нажми на название планеты или точки,
      чтобы узнать больше о её положении
      в твоей натальной карте.
    </p>

  `;

  const cusps =
    data.house_systems?.[system]?.cusps;

  if (
    known(data) &&
    cusps?.length === 12
  ) {

    html += `

      <h2>Куспиды домов</h2>

      <table>

        <tbody>

          ${cusps.map((c, i) => `

            <tr>

              <td>${i + 1} дом</td>

              <td>
                ${position(c, data)}
              </td>

            </tr>

          `).join('')}

        </tbody>

      </table>

    `;

  }

  html += `

    <p class="hint">

      Тропический зодиак.

      ${known(data)
        ? 'ASC и MC не зависят от системы домов.'
        : 'Без времени рождения дома и точные градусы не отображаются.'}

    </p>

  `;

  return html;

}

// =========================================
// ТАБЛИЦА АСПЕКТОВ
// =========================================

function buildAspects(data) {

  if (!known(data)) return '';

  const aspects = data.aspects || [];

  return `

    <section class="planets-card aspects-card">

      <h2>Аспекты</h2>

      ${aspects.length ? `

        <table>

          <thead>

            <tr>
              <th>Планеты</th>
              <th>Аспект</th>
              <th>Орбис</th>
            </tr>

          </thead>

          <tbody>

            ${aspects.map(a => `

              <tr>

                <td>
                  ${link(keyFor(a.a), a.a)}
                  —
                  ${link(keyFor(a.b), a.b)}
                </td>

                <td>
                  ${escapeHTML(a.aspect)}
                </td>

                <td>
                  ${Number(a.orb).toFixed(1)}°
                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>

      ` : `

        <p>
          Нет аспектов в заданных орбисах.
        </p>

      `}

    </section>

  `;

}

// =========================================
// НАВИГАЦИЯ МЕЖДУ ПЛАНЕТАМИ
// =========================================

function buildPlanetNavigation(data) {

  const keys = known(data)
    ? ['ascendant', ...planetKeys, 'mc']
    : planetKeys;

  return `

    <section class="description-card">

      <h2>Другие натальные положения</h2>

      <div class="planet-navigation"
           style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">

        ${keys.map(key => `

          <a
            href="/${key}"
            class="planet-nav-item ${key === page ? 'active' : ''}"
            aria-label="${pages[key]}"
            ${key === page ? 'aria-current="page"' : ''}
            style="
              display:flex;
              flex-direction:column;
              align-items:center;
              justify-content:center;
              gap:5px;
              min-width:0;
              padding:12px 2px;
              border:1px solid #ded3cb;
              border-radius:12px;
              text-decoration:none;
              background:${key === page ? '#881C2C' : '#FFFBF7'};
              color:${key === page ? '#ffffff' : '#881C2C'};
            ">

            <span style="font-size:24px">
              ${glyphs[key]}&#xFE0E;
            </span>

            <span style="font-size:10px">
              ${pages[key]}
            </span>

          </a>

        `).join('')}

      </div>

    </section>

  `;

}

// =========================================
// КОНСУЛЬТАЦИИ
// =========================================

const consultation = `

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

    <a class="secondary-button"
       href="https://taplink.cc/alisa.astrologia">

      Персональные консультации →

    </a>

  </section>

`;

// =========================================
// ЭКРАН РЕЗУЛЬТАТА
// =========================================

function showResult(data) {

  const root = $('result');

  let system = systemFor(data);

  let main = '';

  // НАТАЛЬНАЯ КАРТА

  if (page === 'natal') {

    main = `

      <section class="result-card">

        <h2>Твоя натальная карта</h2>

        <p>
          Положения планет, астрологических
          точек, домов и аспекты.
        </p>

        ${data.ascendant ? `

          <p class="note">

            Твой Асцендент:

            ${link(
              'ascendant',
              data.ascendant.sign
            )}

            ${fmt(data.ascendant)}

          </p>

        ` : ''}

      </section>

    `;

  } else {

    // ОТДЕЛЬНАЯ ПЛАНЕТА ИЛИ ТОЧКА

    const p = getPoint(data);

    if (!p) {

      throw Error(
        'Не удалось определить положение. Проверь данные рождения.'
      );

    }

    const i = Number(p.sign_index);

    const description = descriptions[i];

    const heading =
      page === 'ascendant'
        ? 'ТВОЙ АСЦЕНДЕНТ'
        : page === 'mc'
          ? 'ТВОЯ СЕРЕДИНА НЕБА'
          : pages[page].toUpperCase();

    const sign = p.sign_uncertain
      ? (p.possible_signs || []).join(' / ')
      : p.sign;

    const symbol =
      page === 'ascendant'
        ? zodiac[i]
        : glyphs[page];

    main = `

      <section class="result-card">

        <div class="result-head">

          <div class="symbol">

            ${escapeHTML(symbol)}&#xFE0E;

          </div>

          <div>

            <small>${heading}</small>

            <h2>
              ${escapeHTML(sign || 'Требуется уточнение')}
            </h2>

            <p>

              ${known(data)
                ? fmt(p)
                : 'Без точного времени'}

              ${known(data) && p.retrograde
                ? ' ℞'
                : ''}

            </p>

          </div>

        </div>

        <p id="planetHouse"
           class="note"
           hidden></p>

        ${p.sign_uncertain ? `

          <p class="note">
            Планета меняла знак в течение суток.
            Для уточнения необходимо время рождения.
          </p>

        ` : ''}

        ${page === 'ascendant' ? `

          <p class="note">

            Для ежемесячных прогнозов
            по Асценденту выбирай знак

            <strong>
              ${escapeHTML(p.sign)}
            </strong>.

          </p>

        ` : ''}

      </section>

    `;

    // ОПИСАНИЕ АСЦЕНДЕНТА

    if (
      page === 'ascendant' &&
      description
    ) {

      main += `

        <section class="description-card">

          <h2>

            Асцендент
            ${i === 4 ? 'во' : 'в'}
            ${signNames[i]}

          </h2>

          <p>
            ${escapeHTML(description.text)}
          </p>

          <p>

            <strong>
              Управитель Асцендента:
            </strong>

            ${link(
              keyFor(description.ruler),
              description.ruler
            )}.

          </p>

          <p class="hint">

            Это общая астрологическая характеристика.
            Для индивидуальной интерпретации важно
            учитывать положение управителя Асцендента,
            планеты в первом доме и аспекты.

          </p>

        </section>

      `;

    } else {

      // ОБЩЕЕ ОПИСАНИЕ ПЛАНЕТЫ

      main += `

        <section class="description-card">

          <h2>

            ${escapeHTML(pages[page])}
            в натальной карте

          </h2>

          <p>

            ${escapeHTML(planetAbout[page] || '')}

          </p>

          <div id="planetInterpretation"></div>

        </section>

      `;

    }

  }

  const expanded = page === 'natal';

  root.innerHTML = `

    <button type="button"
            id="backToCalculator"
            class="back-button">

      ← Изменить данные рождения

    </button>

    ${page !== 'natal' && known(data) ? `

      <a href="/natal"
         class="back-button"
         style="display:block;margin-bottom:16px">

        ← Все натальные положения

      </a>

    ` : ''}

    ${main}

    <section class="planets-card">

      ${buildHouseSelector(data, system)}

      ${expanded ? '' : `

        <button
          type="button"
          id="showPlanets"
          class="primary-button"
          aria-expanded="false"
          aria-controls="planetsPanel">

          Посмотреть планеты и точки →

        </button>

      `}

      <div id="planetsPanel"
           ${expanded ? '' : 'hidden'}>

        <h2>Твои планеты и точки</h2>

        <div id="houseTables"></div>

      </div>

      ${!expanded && known(data) ? `

        <a href="/natal"
           class="secondary-button"
           style="margin-top:12px">

          Вся натальная карта →

        </a>

      ` : ''}

    </section>

    ${expanded ? buildAspects(data) : ''}

    ${buildPlanetNavigation(data)}

    ${consultation}

  `;

  // ОБНОВЛЕНИЕ ДОМОВ И ИНТЕРПРЕТАЦИЙ

  function refresh() {

    $('houseTables').innerHTML =
      buildPlanetsTable(data, system);

    const note = $('planetHouse');

    const p = getPoint(data);

    const house =
      p && planetKeys.includes(page)
        ? houseFor(p, system)
        : null;

    if (note) {

      note.textContent = house
        ? `${house} дом · ${labels[system]}`
        : !known(data)
          ? 'Без времени рождения дом определить нельзя.'
          : '';

      note.hidden = !note.textContent;

    }

    const interpretation =
      $('planetInterpretation');

    if (interpretation && p) {

      const signText =
        interpretations.signs[page]?.[
          p.sign_index
        ];

      const houseText =
        interpretations.houses[page]?.[
          house
        ];

      interpretation.innerHTML = `

        ${signText && !p.sign_uncertain ? `

          <h2>
            ${escapeHTML(pages[page])}
            ${Number(p.sign_index) === 4 ? 'во' : 'в'}
            ${signNames[p.sign_index]}
          </h2>

          <p>${escapeHTML(signText)}</p>

        ` : ''}

        ${houseText && house ? `

          <h2>
            ${escapeHTML(pages[page])}
            в ${house} доме
          </h2>

          <p>${escapeHTML(houseText)}</p>

        ` : ''}

      `;

    }

  }

  refresh();

  // ПЕРЕКЛЮЧЕНИЕ СИСТЕМ ДОМОВ

  $('houseSystem')?.addEventListener(
    'change',
    e => {

      system = e.target.value;

      if (saved) {

        saved.system = system;

        persist();

      }

      refresh();

    }
  );

  // ВОЗВРАЩЕНИЕ К ФОРМЕ

  $('backToCalculator').addEventListener(
    'click',
    () => {

      clearSaved();

      root.hidden = true;

      $('calculatorScreen').hidden = false;

      window.scrollTo(0, 0);

    }
  );

  // ОТКРЫТИЕ ТАБЛИЦЫ ПЛАНЕТ

  $('showPlanets')?.addEventListener(
    'click',
    () => {

      const panel = $('planetsPanel');

      const button = $('showPlanets');

      panel.hidden = !panel.hidden;

      button.setAttribute(
        'aria-expanded',
        String(!panel.hidden)
      );

      button.textContent = panel.hidden
        ? 'Посмотреть планеты и точки →'
        : 'Скрыть положения планет';

      if (!panel.hidden) {

        panel.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

      }

    }
  );

  $('homeScreen').hidden = true;

  $('calculatorScreen').hidden = true;

  root.hidden = false;

  window.scrollTo(0, 0);

}

// =========================================
// НАСТРОЙКА СТРАНИЦЫ КАЛЬКУЛЯТОРА
// =========================================

function setupPage() {

  $('homeScreen').hidden = !home;

  $('calculatorScreen').hidden = home;

  if (home) return;

  document.title =
    buttonText + ' — Астродиалоги';

  $('submit').textContent = buttonText;

  if (page !== 'ascendant') {

    $('calculatorTitle').textContent =
      page === 'natal'
        ? 'Построй свою натальную карту'
        : buttonText;

    $('calculatorAbout').innerHTML =
      page === 'natal'

        ? `

          <h2>Что такое натальная карта?</h2>

          <p>
            Натальная карта показывает положение
            планет и астрологических точек
            в момент рождения.
          </p>

          <p>
            Здесь ты можешь рассчитать
            положения планет, дома и аспекты.
            Результат пока представлен в таблицах.
          </p>

        `

        : `

          <h2>
            ${escapeHTML(pages[page])}
            в натальной карте
          </h2>

          <p>
            ${escapeHTML(planetAbout[page] || '')}
          </p>

          <p>

            Рассчитай положение

            ${page === 'mc'
              ? 'в знаке зодиака'
              : 'в знаке зодиака и доме'}

            на момент рождения.

          </p>

        `;

    $('timeHelpTitle').textContent =
      'Необходимо точное время рождения';

    $('timeHelpDescription').textContent =
      'Для этого расчёта необходимо знать время рождения.';

  }

  // ВОССТАНОВЛЕНИЕ ДАННЫХ РОЖДЕНИЯ

  if (saved?.birth && saved?.place) {

    const birth = saved.birth;

    const [y, m, d] =
      birth.date.split('-');

    $('year').value = y;

    $('month').value = m;

    $('day').value = d;

    $('unknown').checked = !birth.time;

    if (birth.time) {

      const [h, min] =
        birth.time.split(':');

      $('hour').value = h;

      $('minute').value = min;

    }

    place = saved.place;

    $('city').value = [
      place.name,
      place.country
    ].filter(Boolean).join(', ');

    $('cityHint').hidden = true;

    updateUnknownTime();

  }

  // ПОКАЗ ГОТОВОГО РЕЗУЛЬТАТА

  if (
    saved?.data &&
    (!needsTime || known(saved.data))
  ) {

    try {

      showResult(saved.data);

    } catch (e) {

      $('error').textContent = e.message;

    }

  }

}

// =========================================
// ОТПРАВКА ДАННЫХ НА СЕРВЕР
// =========================================

$('form').addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    if (
      calculating ||
      ($('unknown').checked && needsTime)
    ) return;

    $('error').textContent = '';

    const b = $('submit');

    try {

      const date = getBirthDate();

      const time = getBirthTime();

      if (!place) {

        throw Error(
          'Выбери город из выпадающего списка.'
        );

      }

      calculating = true;

      b.disabled = true;

      $('unknown').disabled = true;

      b.textContent = 'Рассчитываем…';

      const birth = {

        date,

        time,

        lat: place.lat,

        lng: place.lng

      };

      const r = await fetch(
        '/api/calculate',
        {

          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify(birth)

        }
      );

      const data = await r.json();

      if (!r.ok) {

        throw Error(
          data.error || 'Ошибка расчёта'
        );

      }

      if (!time && known(data)) {

        throw Error(
          'Расчёт без времени рождения пока недоступен.'
        );

      }

      saved = {

        birth,

        place,

        data,

        system: systemFor(data)

      };

      showResult(data);

      persist();

    } catch (err) {

      $('error').textContent = err.message;

    } finally {

      calculating = false;

      $('unknown').disabled = false;

      b.disabled =
        $('unknown').checked && needsTime;

      b.textContent = buttonText;

    }

  }
);

// =========================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// =========================================


// =========================================
// ASTRODIALOGI — COSMOGRAM INTERFACE V3
// =========================================


// РЕТРОГРАДНОСТЬ

function motionMark(p, data) {

  if (known(data)) {
    return p.retrograde ? ' ℞' : '';
  }

  if (p.motion_uncertain) {
    return ' ℞?';
  }

  if (p.possible_motion?.length === 1) {

    return p.possible_motion[0] === 'retrograde'
      ? ' ℞'
      : '';

  }

  return '';

}


// ВОЗМОЖНЫЕ ЗНАКИ

function possibleSigns(p) {

  return p.possible_signs?.length
    ? p.possible_signs
    : [p.sign];

}


// ФОРМАТ ПОЛОЖЕНИЯ

position = function(p, data) {

  const sign = known(data)
    ? p.sign
    : possibleSigns(p).join(' / ');

  return escapeHTML(sign) +

    (known(data)
      ? ' · ' + fmt(p)
      : '') +

    motionMark(p, data);

};


// ВРЕМЯ ИНГРЕССИИ

function ingressDetails(p) {

  const ingresses = p.ingresses || [];

  if (!ingresses.length) return '';

  return ingresses.map(i => `

    <div style="
      padding:12px 0;
      border-bottom:1px solid var(--border);
      font-size:14px;
      line-height:1.6;
    ">

      <strong style="color:var(--accent)">
        ${escapeHTML(i.local_time)}
      </strong>

      · ${escapeHTML(i.from_sign)}
      → ${escapeHTML(i.to_sign)}

      ${i.retrograde ? ' ℞' : ''}

    </div>

  `).join('');

}


// ПОЯСНЕНИЯ К ПОЛОЖЕНИЮ ПЛАНЕТЫ

function cosmogramDetails(p) {

  let html = '';

  if (p.sign_uncertain) {

    html += `

      <div class="note">

        <strong>
          Возможны несколько знаков
        </strong>

        <p style="margin:8px 0">

          В день твоего рождения планета
          меняла знак зодиака.

          Даже приблизительное время
          рождения поможет уточнить
          её положение.

        </p>

        ${ingressDetails(p)}

        ${p.ingresses?.length ? `

          <p class="hint"
             style="margin-top:12px">

            Указано местное время
            города рождения.

          </p>

        ` : ''}

      </div>

    `;

  } else {

    html += `

      <p class="note">

        На протяжении всего дня
        твоего рождения планета
        находилась в одном знаке.

        Точный градус зависит
        от времени рождения.

      </p>

    `;

  }


  if (p.motion_uncertain) {

    html += `

      <p class="note">

        <strong>
          Смена направления движения
        </strong>

        <br>

        В день твоего рождения
        планета меняла направление
        движения.

        Без времени рождения нельзя
        однозначно определить,
        была ли она ретроградной.

      </p>

    `;

  } else if (
    p.possible_motion?.length === 1 &&
    p.possible_motion[0] === 'retrograde'
  ) {

    html += `

      <p class="note">

        <strong>
          Ретроградная планета ℞
        </strong>

        <br>

        Планета была ретроградной
        на протяжении всего дня
        твоего рождения.

      </p>

    `;

  }

  return html;

}


// =========================================
// КНОПКА РАСЧЁТА
// =========================================

function currentButtonText() {

  if (page === 'natal') {

    return $('unknown').checked

      ? 'Построить космограмму'

      : 'Построить натальную карту';

  }

  return buttonText;

}


function syncCosmogramForm() {

  const unknown = $('unknown').checked;

  const submit = $('submit');

  if (!calculating) {

    submit.textContent =
      currentButtonText();

  }

  // Исправляем старое правило CSS,
  // которое скрывало кнопку расчёта.

  if (unknown && !needsTime) {

    submit.style.setProperty(
      'display',
      'flex',
      'important'
    );

  } else {

    submit.style.removeProperty(
      'display'
    );

  }


  if (page === 'natal') {

    $('calculatorTitle').textContent =

      unknown

        ? 'Построй свою космограмму'

        : 'Построй свою натальную карту';

  }


  if (unknown && !needsTime) {

    $('unknownTimeNote').textContent =

      'Без времени рождения можно рассчитать положения планет в знаках зодиака и их ретроградность. Если планета меняла знак или направление движения в течение суток, мы покажем возможные варианты.';

  }

}


$('unknown').addEventListener(
  'change',
  syncCosmogramForm
);


// =========================================
// ТАБЛИЦА КОСМОГРАММЫ
// =========================================

const originalPlanetsTable =
  buildPlanetsTable;


buildPlanetsTable = function(data, system) {

  // Натальная карта:
  // сохраняем прежнюю таблицу.

  if (known(data)) {

    return originalPlanetsTable(
      data,
      system
    );

  }


  // Космограмма:
  // только планеты и знаки.

  return `

    <table>

      <thead>

        <tr>

          <th>Планета</th>

          <th style="
            width:60%;
            text-align:left;
          ">

            Знак зодиака

          </th>

        </tr>

      </thead>

      <tbody>

        ${(data.planets || []).map(p => {

          const key = keyFor(p.name);

          return `

            <tr>

              <td>

                <span class="planet-glyph">

                  ${escapeHTML(
                    glyphs[key] || p.glyph
                  )}&#xFE0E;

                </span>

                ${link(key, p.name)}

              </td>

              <td style="
                width:60%;
                text-align:left;
                white-space:normal;
              ">

                ${position(p, data)}

                ${p.sign_uncertain ? `

                  <div class="hint"
                       style="margin-top:4px">

                    Смена знака в течение суток

                  </div>

                ` : ''}

                ${p.motion_uncertain ? `

                  <div class="hint"
                       style="margin-top:4px">

                    Смена направления движения

                  </div>

                ` : ''}

              </td>

            </tr>

          `;

        }).join('')}

      </tbody>

    </table>


    <p class="hint">

      ℞ — ретроградная планета.

      <br>

      ℞? — направление движения
      требует уточнения.

    </p>


    <p class="hint">

      Нажми на название планеты,
      чтобы узнать больше
      о её положении.

    </p>


    <p class="hint">

      Тропический зодиак.

      Без времени рождения
      точные градусы, Асцендент,
      MC, дома и аспекты
      не отображаются.

    </p>

  `;

};


// =========================================
// УТОЧНЕНИЕ ВРЕМЕНИ РОЖДЕНИЯ
// =========================================

function clarifyBirthTime() {

  $('result').hidden = true;

  $('homeScreen').hidden = true;

  $('calculatorScreen').hidden = false;

  $('unknown').checked = false;

  updateUnknownTime();

  syncCosmogramForm();

  $('hour').value = '';

  $('minute').value = '';

  window.scrollTo(0, 0);

  $('hour').focus();

}


// =========================================
// ЭКРАН РЕЗУЛЬТАТА
// =========================================

const originalShowResult = showResult;


showResult = function(data) {

  // Сначала используем
  // существующий экран результата.

  originalShowResult(data);


  // Натальную карту не изменяем.

  if (known(data)) return;


  const root = $('result');

  const resultCard =
    root.querySelector('.result-card');


  if (!resultCard) return;


  // КОСМОГРАММА

  if (page === 'natal') {

    resultCard.innerHTML = `

      <h2>Твоя космограмма</h2>

      <p>

        Положения планет
        в знаках зодиака
        на день твоего рождения.

      </p>

      <p class="note">

        Космограмма строится
        без точного времени рождения.

        Она позволяет определить
        возможные знаки планет
        и их направление движения.

        Асцендент, MC и дома
        без времени рождения
        определить нельзя.

      </p>

    `;

  } else {

    // ОТДЕЛЬНАЯ ПЛАНЕТА

    const p = getPoint(data);

    if (!p) return;

    const signs = possibleSigns(p);

    resultCard.innerHTML = `

      <div class="result-head">

        <div class="symbol">

          ${escapeHTML(
            glyphs[page]
          )}&#xFE0E;

        </div>

        <div>

          <small>

            ${escapeHTML(
              pages[page].toUpperCase()
            )}

          </small>

          <h2 style="
            font-size:${signs.length > 1
              ? '24px'
              : '30px'};
          ">

            ${escapeHTML(
              signs.join(' / ')
            )}

            ${motionMark(p, data)}

          </h2>

          <p style="font-size:14px">

            Без точного времени рождения

          </p>

        </div>

      </div>

      ${cosmogramDetails(p)}

    `;

  }


  // КНОПКА УТОЧНЕНИЯ ВРЕМЕНИ

  const clarify = document.createElement(
    'button'
  );

  clarify.type = 'button';

  clarify.className = 'secondary-button';

  clarify.style.marginTop = '20px';

  clarify.textContent =
    'Уточнить время рождения →';

  clarify.addEventListener(
    'click',
    clarifyBirthTime
  );

  resultCard.append(clarify);


  // ЗАГОЛОВОК ТАБЛИЦЫ

  const panelTitle = root.querySelector(
    '#planetsPanel > h2'
  );

  if (panelTitle) {

    panelTitle.textContent =
      'Твои планеты в знаках';

  }


  // КНОПКА ПОКАЗА ПЛАНЕТ

  const showButton = $('showPlanets');

  if (showButton) {

    showButton.textContent =
      'Посмотреть все планеты →';

    showButton.addEventListener(
      'click',
      () => {

        showButton.textContent =

          $('planetsPanel').hidden

            ? 'Посмотреть все планеты →'

            : 'Скрыть положения планет';

      }
    );

  }


  // ССЫЛКА НА ПОЛНУЮ КОСМОГРАММУ

  if (page !== 'natal') {

    const back = $('backToCalculator');

    const a = document.createElement('a');

    a.href = '/natal';

    a.className = 'back-button';

    a.textContent = '← Вся космограмма';

    back.after(a);

  }


  // ОПИСАНИЯ ПЛАНЕТ

  const interpretation =
    $('planetInterpretation');

  if (interpretation) {

    const heading =
      interpretation.parentElement
        .querySelector('h2');

    if (heading) {

      heading.textContent =
        pages[page] + ' в космограмме';

    }

  }

};


// =========================================
// ПОЯСНЕНИЕ НА СТРАНИЦЕ НАТАЛЬНОЙ КАРТЫ
// =========================================

function setupCosmogramAbout() {

  if (page !== 'natal' || home) return;

  $('calculatorAbout').innerHTML = `

    <h2>Натальная карта и космограмма</h2>

    <p>

      Натальная карта показывает
      положения планет, домов
      и астрологических точек
      в момент рождения.

    </p>

    <p>

      Если ты не знаешь точного
      времени рождения, можно
      построить космограмму.

    </p>

    <p>

      Космограмма показывает
      положения планет в знаках
      зодиака без привязки
      к системе домов.

    </p>

    <p>

      Если в день твоего рождения
      планета меняла знак
      или направление движения,
      калькулятор покажет
      возможные варианты.

    </p>

  `;

}


// =========================================
// ОБНОВЛЕНИЕ КНОПКИ ПОСЛЕ РАСЧЁТА
// =========================================

const submitObserver = new MutationObserver(
  () => {

    if (
      !calculating &&
      $('submit').textContent !==
        currentButtonText()
    ) {

      syncCosmogramForm();

    }

  }
);

submitObserver.observe(
  $('submit'),
  {
    childList: true,
    characterData: true,
    subtree: true
  }
);


// =========================================
// ПРОВЕРКА СОХРАНЁННЫХ РЕЗУЛЬТАТОВ
// =========================================

// Старые космограммы не содержат
// времени ингрессий и данных
// о смене направления движения.

if (
  saved?.data &&
  !known(saved.data) &&
  saved.data.chart_type !== 'cosmogram'
) {

  saved.data = null;

  persist();

}


// =========================================
// ЗАПУСК ОБНОВЛЁННОГО ПРИЛОЖЕНИЯ
// =========================================

setupPage();

syncCosmogramForm();

setupCosmogramAbout();


// =========================================
// END — COSMOGRAM INTERFACE V3
// =========================================

