(() => {
  "use strict";

  const API_BASE = "https://daywell-ml.onrender.com";

  const form = document.getElementById("predict-form");
  const submitBtn = document.getElementById("submit-btn");
  const exampleBtn = document.getElementById("example-btn");
  const resetBtn = document.getElementById("reset-btn");
  const errorRetryBtn = document.getElementById("error-retry-btn");

  const stateIdle = document.getElementById("state-idle");
  const stateLoading = document.getElementById("state-loading");
  const stateResult = document.getElementById("state-result");
  const stateError = document.getElementById("state-error");

  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreContextEl = document.getElementById("score-context");
  const gaugeFill = document.getElementById("gauge-fill");
  const errorLabelEl = document.getElementById("error-label");
  const errorCopyEl = document.getElementById("error-copy");

  // Prevent the mouse wheel from accidentally changing a focused number field.
  form.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });
  });

  const GAUGE_ARC_LENGTH = 314; // approx pi * r(100)

  // ---------------------------------------------------------
  // Draw tick marks on both gauges (0..10, every 2 units)
  // ---------------------------------------------------------
  function drawTicks() {
    document.querySelectorAll(".gauge-ticks").forEach((g) => {
      g.innerHTML = "";
      const cx = 120, cy = 140, rOuter = 100, rInner = 90;
      for (let i = 0; i <= 10; i += 2) {
        const angle = Math.PI - (i / 10) * Math.PI; // 180deg -> 0deg
        const x1 = cx + rOuter * Math.cos(angle);
        const y1 = cy - rOuter * Math.sin(angle);
        const x2 = cx + rInner * Math.cos(angle);
        const y2 = cy - rInner * Math.sin(angle);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1.toFixed(1));
        line.setAttribute("y1", y1.toFixed(1));
        line.setAttribute("x2", x2.toFixed(1));
        line.setAttribute("y2", y2.toFixed(1));
        g.appendChild(line);
      }
    });
  }
  drawTicks();

  // Replace native select menus with a styled, keyboard-accessible listbox.
  function enhanceSelect(select) {
    const field = select.closest(".field");
    const label = field?.querySelector(`label[for="${select.id}"]`);
    const wrapper = document.createElement("div");
    const trigger = document.createElement("button");
    const listbox = document.createElement("div");
    const valueText = document.createElement("span");
    const options = [];
    const listboxId = `${select.id}-options`;
    const triggerId = `${select.id}-dropdown`;

    wrapper.className = "custom-select";
    trigger.type = "button";
    trigger.id = triggerId;
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", listboxId);

    if (label) {
      if (!label.id) label.id = `${select.id}-label`;
      trigger.setAttribute("aria-labelledby", label.id);
      label.addEventListener("click", (event) => {
        event.preventDefault();
        trigger.focus();
        openMenu();
      });
    }

    valueText.className = "custom-select-value";
    const chevron = document.createElement("span");
    chevron.className = "custom-select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    trigger.append(valueText, chevron);

    listbox.id = listboxId;
    listbox.className = "custom-select-menu";
    listbox.setAttribute("role", "listbox");
    listbox.hidden = true;

    Array.from(select.options).forEach((nativeOption, optionIndex) => {
      if (nativeOption.disabled || nativeOption.value === "") return;

      const option = document.createElement("div");
      const mark = document.createElement("span");
      const text = document.createElement("span");
      const check = document.createElement("span");
      option.className = "custom-select-option";
      option.id = `${listboxId}-${optionIndex}`;
      option.dataset.value = nativeOption.value;
      option.tabIndex = -1;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");

      mark.className = "custom-option-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = nativeOption.textContent.trim().charAt(0).toUpperCase();
      text.className = "custom-option-label";
      text.textContent = nativeOption.textContent.trim();
      check.className = "custom-option-check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = "✓";
      option.append(mark, text, check);

      option.addEventListener("click", () => {
        select.value = nativeOption.value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        closeMenu(true);
      });
      option.addEventListener("keydown", (event) => {
        const currentIndex = options.indexOf(option);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const offset = event.key === "ArrowDown" ? 1 : -1;
          options[(currentIndex + offset + options.length) % options.length].focus();
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          options[event.key === "Home" ? 0 : options.length - 1].focus();
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          option.click();
        } else if (event.key === "Escape") {
          event.preventDefault();
          closeMenu(true);
        }
      });

      options.push(option);
      listbox.appendChild(option);
    });

    function syncSelection() {
      const selected = select.options[select.selectedIndex];
      valueText.textContent = selected ? selected.textContent.trim() : "Select";
      trigger.classList.toggle("has-value", Boolean(select.value));
      options.forEach((option) => {
        const isSelected = option.dataset.value === select.value;
        option.setAttribute("aria-selected", String(isSelected));
        option.classList.toggle("selected", isSelected);
      });
    }

    function openMenu() {
      listbox.hidden = false;
      wrapper.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      const selected = options.find((option) => option.dataset.value === select.value);
      (selected || options[0])?.focus();
    }

    function closeMenu(returnFocus = false) {
      listbox.hidden = true;
      wrapper.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
      if (returnFocus) trigger.focus();
    }

    trigger.addEventListener("click", () => {
      if (listbox.hidden) openMenu();
      else closeMenu();
    });
    trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        if (listbox.hidden) openMenu();
      }
    });
    select.addEventListener("change", syncSelection);
    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) closeMenu();
    });
    wrapper.addEventListener("focusout", (event) => {
      if (!wrapper.contains(event.relatedTarget)) closeMenu();
    });

    select.classList.add("custom-select-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select, trigger, listbox);
    syncSelection();
  }

  form.querySelectorAll("select").forEach((select) => enhanceSelect(select));

  // Styled, filterable country suggestions; custom country names remain valid.
  const countryInput = document.getElementById("country");
  const countryToggle = document.getElementById("country-toggle");
  const countrySuggestions = document.getElementById("country-suggestions");
  const countryCombobox = countryInput.closest(".country-combobox");
  const countryNames = ["India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France", "Other"];
  let countryOptions = [];
  let showingAllCountrySuggestions = false;
  let suppressCountryFocusSuggestions = false;

  function closeCountrySuggestions(returnFocus = false) {
    countrySuggestions.hidden = true;
    countryInput.setAttribute("aria-expanded", "false");
    countryToggle.setAttribute("aria-expanded", "false");
    if (returnFocus) countryInput.focus();
  }

  function chooseCountry(value) {
    countryInput.value = value;
    countryInput.dispatchEvent(new Event("change", { bubbles: true }));
    suppressCountryFocusSuggestions = true;
    closeCountrySuggestions(true);
    requestAnimationFrame(() => {
      suppressCountryFocusSuggestions = false;
    });
  }

  function renderCountrySuggestions(filterByInput = true) {
    showingAllCountrySuggestions = !filterByInput;
    const query = filterByInput ? countryInput.value.trim().toLocaleLowerCase() : "";
    const matches = countryNames.filter((name) => name.toLocaleLowerCase().includes(query));
    countrySuggestions.replaceChildren();
    countryOptions = [];

    matches.forEach((name, index) => {
      const option = document.createElement("div");
      const mark = document.createElement("span");
      const text = document.createElement("span");
      const check = document.createElement("span");
      const selected = name.toLocaleLowerCase() === countryInput.value.trim().toLocaleLowerCase();
      option.className = `custom-select-option${selected ? " selected" : ""}`;
      option.id = `country-suggestion-${index}`;
      option.dataset.value = name;
      option.tabIndex = -1;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(selected));
      mark.className = "custom-option-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = name.charAt(0);
      text.className = "custom-option-label";
      text.textContent = name;
      check.className = "custom-option-check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = "✓";
      option.append(mark, text, check);
      option.addEventListener("click", () => chooseCountry(name));
      option.addEventListener("keydown", (event) => {
        const currentIndex = countryOptions.indexOf(option);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const offset = event.key === "ArrowDown" ? 1 : -1;
          countryOptions[(currentIndex + offset + countryOptions.length) % countryOptions.length].focus();
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          countryOptions[event.key === "Home" ? 0 : countryOptions.length - 1].focus();
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          chooseCountry(name);
        } else if (event.key === "Escape") {
          event.preventDefault();
          closeCountrySuggestions(true);
        }
      });
      countryOptions.push(option);
      countrySuggestions.appendChild(option);
    });

    const hasMatches = countryOptions.length > 0;
    countrySuggestions.hidden = !hasMatches;
    countryInput.setAttribute("aria-expanded", String(hasMatches));
    countryToggle.setAttribute("aria-expanded", String(hasMatches));
  }

  countryInput.addEventListener("focus", () => {
    if (!suppressCountryFocusSuggestions) renderCountrySuggestions(false);
  });
  countryInput.addEventListener("input", renderCountrySuggestions);
  countryToggle.addEventListener("click", () => {
    if (!countrySuggestions.hidden && showingAllCountrySuggestions) closeCountrySuggestions();
    else renderCountrySuggestions(false);
  });
  countryInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && countryOptions.length) {
      event.preventDefault();
      countryOptions[0].focus();
    } else if (event.key === "ArrowUp" && countryOptions.length) {
      event.preventDefault();
      countryOptions[countryOptions.length - 1].focus();
    } else if (event.key === "Enter" && !countrySuggestions.hidden) {
      const exactMatch = countryOptions.find((option) => option.dataset.value.toLocaleLowerCase() === countryInput.value.trim().toLocaleLowerCase());
      if (exactMatch) {
        event.preventDefault();
        chooseCountry(exactMatch.dataset.value);
      }
    } else if (event.key === "Escape") {
      closeCountrySuggestions();
    }
  });
  countryCombobox.addEventListener("focusout", (event) => {
    if (!countryCombobox.contains(event.relatedTarget)) closeCountrySuggestions();
  });
  document.addEventListener("click", (event) => {
    if (!countryCombobox.contains(event.target)) closeCountrySuggestions();
  });

  // ---------------------------------------------------------
  // Segmented control (stress_level) wiring
  // ---------------------------------------------------------
  const segGroup = document.getElementById("stress_level_group");
  const stressHiddenInput = document.getElementById("stress_level");
  segGroup.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      segGroup.querySelectorAll(".seg-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      stressHiddenInput.value = btn.dataset.value;
      clearFieldError(stressHiddenInput);
    });
  });

  // Fill the form with a high-scoring demo profile and run its prediction.
  exampleBtn.addEventListener("click", () => {
    const example = {
      age: "23",
      gender: "Male",
      country: "Other",
      academic_level: "Graduate",
      most_used_platform: "Instagram",
      purpose_of_use: "Entertainment",
      avg_daily_usage_hours: "3.2",
      daily_unlocks: "133",
      study_hours: "5.1",
      physical_activity_hours: "2.4",
      sleep_hours_per_night: "9.0",
      stress_level: "Low",
    };

    Object.entries(example).forEach(([name, value]) => {
      const input = form.elements.namedItem(name);
      if (input && name !== "stress_level") {
        input.value = value;
        if (input instanceof HTMLSelectElement) {
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });

    segGroup.querySelectorAll(".seg-btn").forEach((btn) => {
      const selected = btn.dataset.value === example.stress_level;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-pressed", String(selected));
    });
    stressHiddenInput.value = example.stress_level;
    clearAllErrors();
  });

  // Run the prediction only when the user explicitly clicks this button.
  submitBtn.addEventListener("click", () => {
    if (!submitBtn.disabled) form.requestSubmit();
  });

  // ---------------------------------------------------------
  // Field-level error helpers
  // ---------------------------------------------------------
  function fieldWrapper(input) {
    return input.closest(".field");
  }

  function setFieldError(input, message) {
    const wrap = fieldWrapper(input);
    if (!wrap) return;
    wrap.classList.add("field-error");
    const msgEl = wrap.querySelector(".error-msg");
    if (msgEl) msgEl.textContent = message;
  }

  function clearFieldError(input) {
    const wrap = fieldWrapper(input);
    if (!wrap) return;
    wrap.classList.remove("field-error");
    const msgEl = wrap.querySelector(".error-msg");
    if (msgEl) msgEl.textContent = "";
  }

  function clearAllErrors() {
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("field-error"));
    form.querySelectorAll(".error-msg").forEach((m) => (m.textContent = ""));
  }

  // ---------------------------------------------------------
  // Client-side validation mirroring the StudentData model
  // ---------------------------------------------------------
  function validate(payload) {
    const errors = [];

    const numericChecks = [
      ["age", 10, 100],
      ["avg_daily_usage_hours", 0, 24],
      ["daily_unlocks", 0, Infinity],
      ["study_hours", 0, 24],
      ["physical_activity_hours", 0, 24],
      ["sleep_hours_per_night", 0, 24],
    ];

    numericChecks.forEach(([key, min, max]) => {
      const input = document.getElementById(key);
      const val = payload[key];
      if (val === "" || val === null || Number.isNaN(val)) {
        errors.push([input, "This field is required."]);
      } else if (val < min || val > max) {
        errors.push([input, `Must be between ${min} and ${max === Infinity ? "0+" : max}.`]);
      }
    });

    ["gender", "country", "academic_level", "most_used_platform", "purpose_of_use"].forEach((key) => {
      const input = document.getElementById(key);
      if (!payload[key] || String(payload[key]).trim() === "") {
        errors.push([input, "This field is required."]);
      }
    });

    if (!payload.stress_level) {
      errors.push([stressHiddenInput, "Pick a stress level."]);
    }

    return errors;
  }

  // ---------------------------------------------------------
  // Gather form data into the exact StudentData shape
  // ---------------------------------------------------------
  function collectPayload() {
    const fd = new FormData(form);
    return {
      age: fd.get("age") === "" ? NaN : parseInt(fd.get("age"), 10),
      gender: fd.get("gender") || "",
      country: (fd.get("country") || "").trim(),
      academic_level: fd.get("academic_level") || "",
      most_used_platform: fd.get("most_used_platform") || "",
      purpose_of_use: fd.get("purpose_of_use") || "",
      avg_daily_usage_hours: fd.get("avg_daily_usage_hours") === "" ? NaN : parseFloat(fd.get("avg_daily_usage_hours")),
      daily_unlocks: fd.get("daily_unlocks") === "" ? NaN : parseInt(fd.get("daily_unlocks"), 10),
      study_hours: fd.get("study_hours") === "" ? NaN : parseFloat(fd.get("study_hours")),
      physical_activity_hours: fd.get("physical_activity_hours") === "" ? NaN : parseFloat(fd.get("physical_activity_hours")),
      sleep_hours_per_night: fd.get("sleep_hours_per_night") === "" ? NaN : parseFloat(fd.get("sleep_hours_per_night")),
      stress_level: fd.get("stress_level") || "",
    };
  }

  // ---------------------------------------------------------
  // UI state switching
  // ---------------------------------------------------------
  function showState(name) {
    [stateIdle, stateLoading, stateResult, stateError].forEach((el) => (el.hidden = true));
    ({ idle: stateIdle, loading: stateLoading, result: stateResult, error: stateError }[name]).hidden = false;
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.classList.toggle("loading", isSubmitting);
  }

  function bandFor(score) {
    if (score < 4) {
      return {
        label: "A little stretched",
        context: "Your answers point to a more demanding season. Gentle changes to rest, movement, or screen habits may be worth exploring.",
      };
    }
    if (score < 7) {
      return {
        label: "Finding your rhythm",
        context: "Some parts of your routine look steady, with space to make recovery and downtime a little easier.",
      };
    }
    return {
      label: "A steady rhythm",
      context: "Your answers suggest a supportive everyday rhythm. Keep noticing what helps you feel well.",
    };
  }

  function renderResult(score) {
    const clamped = Math.max(0, Math.min(10, score));
    const { label, context } = bandFor(clamped);

    scoreNumberEl.textContent = score.toFixed(2);
    scoreBandEl.textContent = label;
    scoreContextEl.textContent = context;

    // reset then animate the arc fill on next frame
    gaugeFill.style.transition = "none";
    gaugeFill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);
    requestAnimationFrame(() => {
      gaugeFill.style.transition = "";
      const offset = GAUGE_ARC_LENGTH * (1 - clamped / 10);
      gaugeFill.style.strokeDashoffset = String(offset);
    });

    showState("result");
  }

  function renderError(label, copy) {
    errorLabelEl.textContent = label;
    errorCopyEl.textContent = copy;
    showState("error");
  }

  // ---------------------------------------------------------
  // Parse FastAPI / Pydantic 422 error responses into
  // field-level messages where possible
  // ---------------------------------------------------------
  function applyServerValidationErrors(detail) {
    if (!Array.isArray(detail)) return false;
    let matched = false;
    detail.forEach((err) => {
      const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : null;
      const input = field ? document.getElementById(field) : null;
      const target = field === "stress_level" ? stressHiddenInput : input;
      if (target) {
        setFieldError(target, err.msg || "Invalid value.");
        matched = true;
      }
    });
    return matched;
  }

  // ---------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors();

    const payload = collectPayload();
    const clientErrors = validate(payload);

    if (clientErrors.length > 0) {
      clientErrors.forEach(([input, msg]) => input && setFieldError(input, msg));
      const firstInvalid = clientErrors[0][0];
      const customTrigger = firstInvalid?.closest(".field")?.querySelector(".custom-select-trigger");
      (customTrigger || firstInvalid)?.focus?.();
      return;
    }

    setSubmitting(true);
    showState("loading");

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 422) {
        const body = await res.json().catch(() => null);
        const matched = body && applyServerValidationErrors(body.detail);
        renderError(
          "Check your inputs",
          matched
            ? "The API rejected a few fields — details are marked on the form."
            : "The API rejected this submission. Please review your inputs and try again."
        );
        return;
      }

      if (!res.ok) {
        let detailMsg = `The API responded with status ${res.status}.`;
        const body = await res.json().catch(() => null);
        if (body && typeof body.detail === "string") detailMsg = body.detail;
        renderError("Prediction failed", detailMsg);
        return;
      }

      const data = await res.json();
      if (typeof data.predicted_mental_health_score !== "number") {
        renderError("Unexpected response", "The API responded, but the score was missing or malformed.");
        return;
      }

      renderResult(data.predicted_mental_health_score);
    } catch (err) {
      renderError(
        "Can't reach the server",
        `Couldn't connect to ${API_BASE}. Make sure the backend is running (uvicorn main:app --port 2200 --reload) and reachable from this page.`
      );
    } finally {
      setSubmitting(false);
    }
  });

  // live-clear errors as the user edits
  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => clearFieldError(el));
    el.addEventListener("change", () => clearFieldError(el));
  });

  resetBtn.addEventListener("click", () => {
    showState("idle");
  });

  errorRetryBtn.addEventListener("click", () => {
    showState("idle");
  });
})();
