(function () {
  var root = document.getElementById("quiz-app");
  if (!root) return;

  var screens = [
    {
      id: "process",
      type: "single",
      title: "Какой процесс сейчас сильнее всего ест время?",
      options: [
        "Заявки и расчёт ставок",
        "Документы и сверка",
        "Таможенное оформление и ВЭД",
        "Статусы и исключения",
        "Претензии",
        "Клиентский сервис",
        "Контроль качества",
        "Продажи и входящие лиды",
        "HR и обучение",
        "Другое"
      ],
      otherPlaceholder: "Какой именно процесс?"
    },
    {
      id: "pain",
      type: "multi",
      title: "Что сильнее всего мешает этому процессу?",
      hint: "Можно отметить несколько.",
      options: [
        "Ручной перенос данных между системами",
        "Знания у одного-двух человек",
        "Много однотипных обращений",
        "Долгие согласования",
        "Нет прозрачности по статусам",
        "Ошибки и повторный ввод",
        "Другое"
      ],
      otherPlaceholder: "Что именно мешает?"
    },
    {
      id: "systems",
      type: "multi",
      title: "Какие системы есть?",
      hint: "Можно отметить несколько.",
      options: [
        "TMS",
        "WMS",
        "1С",
        "CRM",
        "ЭДО",
        "Телефония или чат",
        "Excel и почта",
        "Ничего из этого",
        "Другое"
      ],
      otherPlaceholder: "Какая система?"
    },
    {
      id: "size",
      type: "single",
      title: "Сколько сотрудников в компании?",
      options: ["До 30", "30–100", "100–300", "300–1000", "Больше 1000"]
    }
  ];

  var state = { step: 0, answers: {}, done: false };
  var host = location.hostname;
  var local = host === "127.0.0.1" || host === "localhost";
  var WEBHOOK = local
    ? "http://127.0.0.1:5678/webhook/quiz-lead"
    : "https://n8n.aislava.space/webhook/quiz-lead";
  var MAX_FIELD = 200;

  function clip(s) {
    return String(s || "").trim().slice(0, MAX_FIELD);
  }

  function otherKey(id) {
    return id + "Other";
  }

  function otherSelected(screen) {
    var val = state.answers[screen.id];
    if (screen.type === "multi") return Array.isArray(val) && val.indexOf("Другое") !== -1;
    return val === "Другое";
  }

  function otherText(id) {
    return clip(state.answers[otherKey(id)]);
  }

  function withOther(val, id) {
    var text = otherText(id);
    if (Array.isArray(val)) {
      return val.map(function (item) {
        return item === "Другое" && text ? "Другое: " + text : item;
      });
    }
    if (val === "Другое" && text) return "Другое: " + text;
    return val || "";
  }

  function optionClass(screen, value) {
    var current = state.answers[screen.id];
    var on = screen.type === "multi"
      ? Array.isArray(current) && current.indexOf(value) !== -1
      : current === value;
    return "quiz-opt" + (on ? " is-on" : "");
  }

  function toggle(screen, value) {
    if (screen.type === "multi") {
      var cur = state.answers[screen.id] ? state.answers[screen.id].slice() : [];
      var i = cur.indexOf(value);
      if (i === -1) cur.push(value); else cur.splice(i, 1);
      state.answers[screen.id] = cur;
    } else {
      state.answers[screen.id] = value;
    }
    if (value === "Другое" && otherSelected(screen)) state.focusOther = true;
    render();
  }

  function canNext() {
    if (state.step >= screens.length) {
      var name = clip(state.answers.name);
      var company = clip(state.answers.company);
      var contact = clip(state.answers.contact);
      return name && company && contact && state.answers.consent;
    }
    var screen = screens[state.step];
    var val = state.answers[screen.id];
    if (screen.type === "multi") {
      if (!Array.isArray(val) || val.length === 0) return false;
    } else if (!val) {
      return false;
    }
    if (otherSelected(screen) && !otherText(screen.id)) return false;
    return true;
  }

  function next() {
    if (!canNext()) return;
    if (state.step < screens.length) {
      state.step += 1;
      render();
      return;
    }
    submit();
  }

  function back() {
    if (state.step === 0) return;
    state.step -= 1;
    render();
  }

  function submit() {
    var payload = {
      process: withOther(state.answers.process || "", "process"),
      pain: withOther(state.answers.pain || [], "pain"),
      systems: withOther(state.answers.systems || [], "systems"),
      size: state.answers.size || "",
      name: clip(state.answers.name),
      company: clip(state.answers.company),
      contact: clip(state.answers.contact),
      consent: Boolean(state.answers.consent),
      pilot: Boolean(state.answers.pilot),
      source: "aislava-site-quiz-v05"
    };
    if (!WEBHOOK) {
      state.done = true;
      state.mock = true;
      render();
      return;
    }
    fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error("webhook " + res.status);
      state.done = true;
      state.mock = false;
      if (typeof ym === "function") ym(114165039, "reachGoal", "quiz_lead");
      render();
    }).catch(function () {
      state.done = true;
      state.mock = true;
      render();
    });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderDone() {
    root.innerHTML =
      '<div class="quiz-card">' +
        '<p class="kicker">Заявка принята</p>' +
        '<h3>Спасибо. Разберём процесс и напишем в течение рабочего дня.</h3>' +
        '<p class="muted">Пока можно скачать образец отчёта диагностики или написать в Telegram.</p>' +
        (state.mock ? '<p class="fine">Автоматическая отправка сейчас недоступна. Напишите в Telegram — так заявка точно дойдёт.</p>' : "") +
        '<div class="quiz-nav">' +
          '<a class="btn" href="assets/AI-SLAVA_obrazets_otcheta_diagnostiki.pdf" target="_blank" rel="noopener">Скачать образец отчёта</a>' +
          '<a class="btn ghost" href="https://t.me/vpalekha" target="_blank" rel="noopener">Написать в Telegram</a>' +
        "</div>" +
      "</div>";
  }

  function renderContacts() {
    var total = screens.length + 1;
    root.innerHTML =
      '<div class="quiz-card">' +
        '<div class="quiz-progress"><span>Предварительный разбор процесса</span><b>' + total + "/" + total + "</b></div>" +
        '<div class="quiz-bar"><i style="width:100%"></i></div>' +
        "<h3>Куда отправить предварительный разбор?</h3>" +
        '<label class="quiz-field">Имя<input type="text" id="q-name" maxlength="200" autocomplete="name" value="' + esc(state.answers.name || "") + '"></label>' +
        '<label class="quiz-field">Компания и роль<input type="text" id="q-company" maxlength="200" autocomplete="organization" value="' + esc(state.answers.company || "") + '"></label>' +
        '<label class="quiz-field">Telegram, телефон или почта<input type="text" id="q-contact" maxlength="200" autocomplete="tel" value="' + esc(state.answers.contact || "") + '"></label>' +
        '<label class="quiz-check"><input type="checkbox" id="q-consent"' + (state.answers.consent ? " checked" : "") + '> Даю согласие на обработку персональных данных в соответствии с <a href="privacy.html">Политикой обработки персональных данных</a></label>' +
        '<label class="quiz-check"><input type="checkbox" id="q-pilot"' + (state.answers.pilot ? " checked" : "") + "> Интересует пилотная программа</label>" +
        '<div class="quiz-nav">' +
          '<button type="button" class="btn ghost" id="q-back">← Назад</button>' +
          '<button type="button" class="btn" id="q-next" disabled>Получить предварительный разбор</button>' +
        "</div>" +
        '<p class="quiz-legal">Нажимая кнопку, вы даёте согласие на обработку персональных данных в соответствии с Политикой.</p>' +
      "</div>";
    bindContacts();
  }

  function bindContacts() {
    function sync() {
      state.answers.name = clip(document.getElementById("q-name").value);
      state.answers.company = clip(document.getElementById("q-company").value);
      state.answers.contact = clip(document.getElementById("q-contact").value);
      state.answers.consent = document.getElementById("q-consent").checked;
      state.answers.pilot = document.getElementById("q-pilot").checked;
      document.getElementById("q-next").disabled = !canNext();
    }
    ["q-name", "q-company", "q-contact", "q-consent", "q-pilot"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", sync);
      document.getElementById(id).addEventListener("change", sync);
    });
    document.getElementById("q-back").addEventListener("click", back);
    document.getElementById("q-next").addEventListener("click", next);
    sync();
  }

  function render() {
    if (state.done) {
      renderDone();
      return;
    }
    if (state.step >= screens.length) {
      renderContacts();
      return;
    }
    var screen = screens[state.step];
    var total = screens.length + 1;
    var n = state.step + 1;
    var pct = Math.round((n / total) * 100);
    var opts = screen.options.map(function (opt) {
      return '<button type="button" class="' + optionClass(screen, opt) + '" data-value="' + esc(opt) + '">' + esc(opt) + "</button>";
    }).join("");
    root.innerHTML =
      '<div class="quiz-card">' +
        '<div class="quiz-progress"><span>Предварительный разбор процесса</span><b>' + n + "/" + total + "</b></div>" +
        '<div class="quiz-bar"><i style="width:' + pct + '%"></i></div>' +
        "<h3>" + esc(screen.title) + "</h3>" +
        (screen.hint ? '<p class="fine">' + esc(screen.hint) + "</p>" : "") +
        '<div class="quiz-opts">' + opts + "</div>" +
        (otherSelected(screen)
          ? '<label class="quiz-field quiz-other">Опишите своими словами<input type="text" id="q-other" maxlength="200" placeholder="' + esc(screen.otherPlaceholder || "Кратко своим словами") + '" value="' + esc(state.answers[otherKey(screen.id)] || "") + '"></label>'
          : "") +
        '<div class="quiz-nav">' +
          '<button type="button" class="btn ghost" id="q-back"' + (state.step === 0 ? " disabled" : "") + ">← Назад</button>" +
          '<button type="button" class="btn" id="q-next" disabled>Далее →</button>' +
        "</div>" +
      "</div>";
    root.querySelectorAll(".quiz-opt").forEach(function (btn) {
      btn.addEventListener("click", function () { toggle(screen, btn.getAttribute("data-value")); });
    });
    document.getElementById("q-back").addEventListener("click", back);
    document.getElementById("q-next").addEventListener("click", next);
    document.getElementById("q-next").disabled = !canNext();
    var otherInput = document.getElementById("q-other");
    if (otherInput) {
      otherInput.addEventListener("input", function () {
        state.answers[otherKey(screen.id)] = clip(otherInput.value);
        document.getElementById("q-next").disabled = !canNext();
      });
      otherInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && canNext()) next();
      });
      if (state.focusOther) {
        otherInput.focus();
        state.focusOther = false;
      }
    }
  }

  render();
})();
